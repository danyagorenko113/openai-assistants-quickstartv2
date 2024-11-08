"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import type { CodeInterpreterToolCallDelta, ToolCall } from "openai/resources/beta/threads/runs/steps";
import QuickQuestions from "./QuickQuestions";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => (
  <div className={styles.userMessage}>{text}</div>
);

const AssistantMessage = ({ text }: { text: string }) => (
  <div className={styles.assistantMessage}>
    <Markdown>{text}</Markdown>
  </div>
);

const CodeMessage = ({ text }: { text: string }) => (
  <div className={styles.codeMessage}>
    {text.split("\n").map((line, index) => (
      <div key={index}>
        <span>{`${index + 1}. `}</span>
        {line}
      </div>
    ))}
  </div>
);

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user": return <UserMessage text={text} />;
    case "assistant": return <AssistantMessage text={text} />;
    case "code": return <CodeMessage text={text} />;
    default: return null;
  }
};

type ChatProps = {
  functionCallHandler?: (toolCall: RequiredActionFunctionToolCall) => Promise<string>;
};

const Chat = ({ functionCallHandler = () => Promise.resolve("") }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, { method: "POST" });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  const handleTextCreated = () => appendMessage("assistant", "");

  const handleTextDelta = (delta: { value: string | null; annotations: any[] | null }) => {
    if (delta.value != null) appendToLastMessage(delta.value);
    if (delta.annotations != null) annotateLastMessage(delta.annotations);
  };

  const handleImageFileDone = (image: { file_id: string }) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  };

  const toolCallCreated = (toolCall: { type: string }) => {
    if (toolCall.type === "code_interpreter") appendMessage("code", "");
  };

  const toolCallDelta = (delta: CodeInterpreterToolCallDelta, snapshot: ToolCall) => {
    if (delta.type === "code_interpreter" && delta.code_interpreter?.input) {
      appendToLastMessage(delta.code_interpreter.input);
    }
  };

  const handleRequiresAction = async (event: AssistantStreamEvent.ThreadRunRequiresAction) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => ({
        output: await functionCallHandler(toolCall),
        tool_call_id: toolCall.id
      }))
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);
    stream.on("imageFileDone", handleImageFileDone);
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);
    stream.on("event", (event: any) => {
      if (event.event === "thread.run.requires_action") handleRequiresAction(event);
      if (event.event === "thread.run.completed") setInputDisabled(false);
    });
  };

  const sendMessage = async (text: string) => {
    const response = await fetch(`/api/assistants/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
    });
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const submitActionResult = async (runId: string, toolCallOutputs: any[]) => {
    const response = await fetch(`/api/assistants/threads/${threadId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, toolCallOutputs }),
    });
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput);
    setMessages(prev => [...prev, { role: "user", text: userInput }]);
    setUserInput("");
    setInputDisabled(true);
    setShowQuickQuestions(false);
    scrollToBottom();
  };

  const handleQuickQuestionClick = (question: string) => {
    sendMessage(question);
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setInputDisabled(true);
    setShowQuickQuestions(false);
    scrollToBottom();
  };

  const appendToLastMessage = (text: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      const updatedLastMessage = { ...lastMessage, text: lastMessage.text + text };
      return [...prev.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role: "user" | "assistant" | "code", text: string) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  const annotateLastMessage = (annotations: Array<{ type: string; text: string; file_path?: { file_id: string } }>) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      const updatedLastMessage = { ...lastMessage };
      annotations.forEach(annotation => {
        if (annotation.type === 'file_path' && annotation.file_path) {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      });
      return [...prev.slice(0, -1), updatedLastMessage];
    });
  };

  return (
    <div className={`${styles.chatContainer} flex flex-col h-screen`}>
      <div className="flex-grow overflow-auto p-4">
        {showQuickQuestions && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <QuickQuestions onQuestionClick={handleQuickQuestionClick} />
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg, index) => (
              <Message key={index} role={msg.role} text={msg.text} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className={`${styles.inputForm} ${styles.clearfix}`}>
          <input
            type="text"
            className={styles.input}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your question"
            disabled={inputDisabled}
          />
          <button type="submit" className={styles.button} disabled={inputDisabled}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
