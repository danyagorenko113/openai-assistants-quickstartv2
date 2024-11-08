import React from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuickQuestionsProps {
  onQuestionClick: (question: string) => void;
}

export default function QuickQuestions({ onQuestionClick }: QuickQuestionsProps) {
  const questions = [
    "Hi Lida, can you help me plan my meals for the week?",
    "I'm feeling stressed about my blood sugar. What can I do?",
    "What exercises are safe for me with diabetes?",
    "I'm planning to travel soon. How can I manage my diabetes on the trip?"
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Start new chat with assistant:</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-6">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start text-left h-auto py-4 px-6 text-lg font-medium rounded-lg transition-all duration-200 ease-in-out hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onClick={() => onQuestionClick(question)}
          >
            {question}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
