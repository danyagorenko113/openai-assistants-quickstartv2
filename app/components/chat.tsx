"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import type { CodeInterpreterToolCallDelta, ToolCall } from "openai/resources/beta/threads/runs/steps";
import QuickQuestions from "./QuickQuestions";
import Login from "./Login";
import LoginIcon from "./LoginIcon";

type MessageProps = {
  role: "user" | "assistant" | "code" | "system";
  text: string;
  isPassword?: boolean;
};

const UserMessage = React.memo(({ text, isPassword }: { text: string; isPassword?: boolean }) => (
  <div className={`${styles.userMessage} animate-fadeIn`}>
    {isPassword ? text.replace(/./g, '*') : text}
  </div>
));

const AssistantMessage = React.memo(({ text }: { text: string }) => (
  <div className={`${styles.assistantMessage} animate-fadeIn`}>
    <img 
      src="/HSS_logo.png" 
      alt="Assistant Avatar" 
      className={styles.avatar}
    />
    <div className={styles.messageContent}>
      <Markdown>{text}</Markdown>
    </div>
  </div>
));

const CodeMessage = React.memo(({ text }: { text: string }) => (
  <div className={`${styles.codeMessage} animate-fadeIn`}>
    {text.split("\n").map((line, index) => (
      <div key={index}>
        <span>{`${index + 1}. `}</span>
        {line}
      </div>
    ))}
  </div>
));

const SystemMessage = React.memo(({ text }: { text: string }) => (
  <div className={`${styles.systemMessage} animate-fadeIn`}>
    <Markdown>{text}</Markdown>
  </div>
));

const Message = React.memo(({ role, text, isPassword }: MessageProps) => {
  switch (role) {
    case "user": return <UserMessage text={text} isPassword={isPassword} />;
    case "assistant": return <AssistantMessage text={text} />;
    case "code": return <CodeMessage text={text} />;
    case "system": return <SystemMessage text={text} />;
    default: return null;
  }
});

type ChatProps = {
  functionCallHandler?: (toolCall: RequiredActionFunctionToolCall) => Promise<string>;
};

const Chat = ({ functionCallHandler = () => Promise.resolve("") }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [token, setToken] = useState("");
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [signUpStep, setSignUpStep] = useState<"none" | "phone" | "password">("none");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lastUserMessageBeforeSignUp, setLastUserMessageBeforeSignUp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const createThread = async () => {
      try {
        const res = await fetch(`/api/assistants/threads`, { 
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        if (!res.ok) {
          throw new Error('Failed to create thread');
        }
        const data = await res.json();
        setThreadId(data.threadId);
      } catch (error) {
        console.error('Error creating thread:', error);
        setError('Failed to start a new conversation. Please try again.');
      }
    };
    if (!threadId) {
      createThread();
    }
  }, [token, threadId]);

  const handleTextCreated = useCallback(() => appendMessage("assistant", ""), []);

  const handleTextDelta = useCallback((delta: { value: string | null; annotations: any[] | null }) => {
    if (delta.value != null) appendToLastMessage(delta.value);
    if (delta.annotations != null) annotateLastMessage(delta.annotations);
  }, []);

  const handleImageFileDone = useCallback((image: { file_id: string }) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }, []);

  const toolCallCreated = useCallback((toolCall: { type: string }) => {
    if (toolCall.type === "code_interpreter") appendMessage("code", "");
  }, []);

  const toolCallDelta = useCallback((delta: CodeInterpreterToolCallDelta, snapshot: ToolCall) => {
    if (delta.type === "code_interpreter" && delta.code_interpreter?.input) {
      appendToLastMessage(delta.code_interpreter.input);
    }
  }, []);

  const handleRequiresAction = useCallback(async (event: AssistantStreamEvent.ThreadRunRequiresAction) => {
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
  }, [functionCallHandler]);

  const handleReadableStream = useCallback((stream: AssistantStream) => {
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);
    stream.on("imageFileDone", handleImageFileDone);
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);
    stream.on("event", (event: any) => {
      if (event.event === "thread.run.requires_action") handleRequiresAction(event);
      if (event.event === "thread.run.completed") setInputDisabled(false);
    });
  }, [handleTextCreated, handleTextDelta, handleImageFileDone, toolCallCreated, toolCallDelta, handleRequiresAction]);

  const sendMessage = useCallback(async (text: string) => {
    if (!threadId) {
      console.error('No thread ID available');
      setError('Unable to send message. Please try again.');
      return;
    }
    try {
      const response = await fetch(`/api/assistants/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ content: text }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setInputDisabled(false);
    }
  }, [threadId, handleReadableStream, token]);

  const submitActionResult = useCallback(async (runId: string, toolCallOutputs: any[]) => {
    try {
      const response = await fetch(`/api/assistants/threads/${threadId}/actions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ runId, toolCallOutputs }),
      });
      if (!response.ok) {
        throw new Error('Failed to submit action result');
      }
      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error('Error submitting action result:', error);
      setError('Failed to process the request. Please try again.');
      setInputDisabled(false);
    }
  }, [threadId, handleReadableStream, token]);

  const registerUser = async (phoneNumber: string, password: string) => {
    try {
      console.log("Sending registration request...");
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, password }),
      });

      console.log("Response received");
      console.log("Response status:", response.status);
      console.log("Response headers:", JSON.stringify(Array.from(response.headers.entries())));

      const text = await response.text();
      console.log("Raw response text:", text);

      let data;
      try {
        data = JSON.parse(text);
        console.log("Parsed response data:", data);
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        throw new Error(`Failed to parse server response: ${text}. ${jsonError}`);
      }

      if (!response.ok) {
        console.error("Registration response not OK:", response.status, data);
        throw new Error(data.error || `Registration failed with status ${response.status}`);
      }

      if (!data.token) {
        throw new Error("No token received from server");
      }
      return data.token;
    } catch (error) {
      console.error('Error in registerUser:', error);
      throw error;
    }
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setError(null);

    if (signUpStep === "phone") {
      const digitsOnly = userInput.replace(/\D/g, '');
      if (digitsOnly.length !== 9) {
        setError("Please enter a 9-digit phone number.");
        return;
      }
      setPhoneNumber(digitsOnly);
      setSignUpStep("password");
      appendMessage("system", "Thank you! Please create a password (at least 8 characters) to save your conversation.");
      appendMessage("user", userInput);
      setUserInput("");
      setInputDisabled(false);
    } else if (signUpStep === "password") {
      if (userInput.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      try {
        console.log("Attempting to register user...");
        console.log("Phone number:", phoneNumber);
        console.log("Password length:", userInput.length);
        const newToken = await registerUser(phoneNumber, userInput);
        console.log("Registration successful, token received");
        setToken(newToken);
        setIsAuthenticated(true);
        localStorage.setItem('token', newToken);
        
        setSignUpStep("none");
        appendMessage("user", "********", true);
        appendMessage("system", "Thank you! Your account has been successfully created.");
        sendMessage(lastUserMessageBeforeSignUp);
        setUserInput("");
      } catch (error) {
        console.error("Registration error:", error);
        setError(error instanceof Error ? error.message : "An unexpected error occurred during registration. Please try again.");
        appendMessage("system", `Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}. Please try again.`);
        setSignUpStep("phone");
        setPhoneNumber("");
      }
    } else {
      if (userMessageCount === 4) {
        setLastUserMessageBeforeSignUp(userInput);
        appendMessage("user", userInput);
        setUserInput("");
        setUserMessageCount(prev => prev + 1);
        setSignUpStep("phone");
        appendMessage("system", "Please provide your phone number to continue the conversation.");
        setInputDisabled(false);
        return; // Don't send the message to the assistant
      }

      try {
        await sendMessage(userInput);
        setMessages(prev => [...prev, { role: "user", text: userInput }]);
        setUserInput("");
        setUserMessageCount(prevCount => prevCount + 1);
      } catch (error) {
        console.error("Error sending message:", error);
        setError("Failed to send message. Please try again.");
      }
    }

    setShowQuickQuestions(false);
    scrollToBottom();
  }, [userInput, sendMessage, scrollToBottom, userMessageCount, signUpStep, lastUserMessageBeforeSignUp, phoneNumber, registerUser]);

  const handleQuickQuestionClick = useCallback((question: string) => {
    if (userMessageCount === 4) {
      setLastUserMessageBeforeSignUp(question);
      appendMessage("user", question);
      setUserMessageCount(prev => prev + 1);
      setSignUpStep("phone");
      appendMessage("system", "Please provide your phone number to continue the conversation.");
      setInputDisabled(false);
      return; // Don't send the message to the assistant
    }

    sendMessage(question);
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setUserMessageCount(prevCount => prevCount + 1);
    setShowQuickQuestions(false);
    scrollToBottom();
  }, [sendMessage, scrollToBottom, userMessageCount]);

  const appendToLastMessage = useCallback((text: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      const updatedLastMessage = { ...lastMessage, text: lastMessage.text + text };
      return [...prev.slice(0, -1), updatedLastMessage];
    });
  }, []);

  const appendMessage = useCallback((role: "user" | "assistant" | "code" | "system", text: string, isPassword: boolean = false) => {
    setMessages(prev => [...prev, { role, text, isPassword }]);
  }, []);

  const annotateLastMessage = useCallback((annotations: Array<{ type: string; text: string; file_path?: { file_id: string } }>) => {
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
  }, []);

  const handleLogin = useCallback((newToken: string) => {
    setToken(newToken);
    setIsAuthenticated(true);
    setShowLoginForm(false);
    localStorage.setItem('token', newToken);
  }, []);

  const handleLoginIconClick = useCallback(() => {
    setShowLoginForm(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (signUpStep === "phone") {
      setUserInput(formatPhoneNumber(e.target.value));
    } else {
      setUserInput(e.target.value);
    }
  };

  return (
    <div className={`${styles.chatContainer} chat-container`}>
      <div className={`${styles.messagesContainer} messages-container`}>
        {showQuickQuestions && messages.length === 0 ? (
          <div className={styles.quickQuestionsWrapper}>
            <QuickQuestions onQuestionClick={handleQuickQuestionClick} />
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.reduce((groups, message, index) => {
              if (index === 0 || messages[index - 1].role !== message.role) {
                groups.push([message]);
              } else {
                groups[groups.length - 1].push(message);
              }
              return groups;
            }, [] as MessageProps[][]).map((group, groupIndex) => (
              <div key={groupIndex} className={styles.messageGroup}>
                {group.map((msg, msgIndex) => (
                  <Message 
                    key={`${groupIndex}-${msgIndex}`} 
                    role={msg.role} 
                    text={msg.text} 
                    isPassword={msg.isPassword} 
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {error && <div className={styles.errorMessage}>{error}</div>}
      <div className={`${styles.inputContainer} input-container`}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type={signUpStep === "password" ? "password" : signUpStep === "phone" ? "tel" : "text"}
            className={styles.input}
            value={userInput}
            onChange={handleInputChange}
            placeholder={
              signUpStep === "phone" 
                ? "Enter your phone number" 
                : signUpStep === "password" 
                  ? "Enter your password (min 8 characters)" 
                  : "Enter your question"
            }
            disabled={inputDisabled}
          />
          <button type="submit" className={styles.button} disabled={inputDisabled}>
            Send
          </button>
        </form>
      </div>
      {showLoginForm ? (
        <Login onLogin={handleLogin} onClose={() => setShowLoginForm(false)} />
      ) : (
        <LoginIcon onClick={handleLoginIconClick} />
      )}
    </div>
  );
};

export default Chat;
