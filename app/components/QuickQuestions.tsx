import React from 'react';
import styles from './QuickQuestions.module.css';

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
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Start new chat with assistant:</h2>
      </div>
      <div className={styles.cardContent}>
        {questions.map((question, index) => (
          <button
            key={index}
            className={styles.questionButton}
            onClick={() => onQuestionClick(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
