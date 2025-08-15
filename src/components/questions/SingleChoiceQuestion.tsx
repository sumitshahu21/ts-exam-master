import type { Question } from '../../types';

interface SingleChoiceQuestionProps {
  question: Question;
  selectedAnswers: (string | number)[];
  onAnswerChange: (selected: number[]) => void;
}

export default function SingleChoiceQuestion({ 
  question, 
  selectedAnswers, 
  onAnswerChange 
}: SingleChoiceQuestionProps) {
  const handleOptionSelect = (optionIndex: number) => {
    onAnswerChange([optionIndex]);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{question.question}</h2>
        <p className="text-sm text-gray-600">Points: {question.points}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Select one answer:</p>
        {question.options?.map((option, index) => (
          <label key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={index}
              checked={selectedAnswers.includes(index)}
              onChange={() => handleOptionSelect(index)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-900">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
