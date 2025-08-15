import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import type { Question } from '../../types';

interface ShortAnswerQuestionProps {
  question: Question;
  onAnswerChange: (answer: string) => void;
}

export default function ShortAnswerQuestion({ question, onAnswerChange }: ShortAnswerQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const handleAnswerChange = (newAnswer: string) => {
    setAnswer(newAnswer);
    setWordCount(newAnswer.trim().split(/\s+/).filter(word => word.length > 0).length);
    onAnswerChange(newAnswer);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{question.question}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Points: {question.points}</span>
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">Short Answer</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your answer here. Provide a detailed response that demonstrates your understanding of the topic."
        />
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Write a clear and detailed answer. Quality of explanation matters more than length.
          </p>
          <span className="text-xs text-gray-500">
            {wordCount} words
          </span>
        </div>
      </div>

      {question.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Instructions:</h4>
              <p className="text-sm text-blue-800">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {question.expectedAnswer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 mb-1">Note:</h4>
              <p className="text-sm text-amber-800">
                This is a short answer question that will be graded manually. 
                Make sure to provide a comprehensive response that addresses all parts of the question.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
