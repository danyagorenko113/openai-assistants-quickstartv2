import React from 'react';
import { Card } from "@/app/components/ui/card";

interface QuickQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const QuickQuestions: React.FC<QuickQuestionsProps> = ({ onQuestionClick }) => {
  const questions = [
    "Hi Lida, can you help me plan my meals for the week?",
    "I'm feeling stressed about my blood sugar levels. What can I do?",
    "What exercises are safe for me with diabetes?",
    "I'm planning to travel soon. How can I manage my diabetes on the trip?",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <h2 className="text-2xl text-center mb-6 text-muted-foreground">Start new chat with assistant:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questions.map((question, index) => (
          <Card
            key={index}
            className="p-6 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onQuestionClick(question)}
          >
            <p className="text-lg text-center">{question}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuickQuestions;
