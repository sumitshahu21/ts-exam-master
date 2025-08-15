import SingleChoiceQuestion from './SingleChoiceQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import ShortAnswerQuestion from './ShortAnswerQuestion';
import type { Question, Answer } from '../../types';

interface CaseStudyQuestionProps {
  question: Question;
  answers: Answer[];
  onAnswerChange: (questionId: string, selectedAnswers: string[] | number[], textAnswer?: string) => void;
}

export default function CaseStudyQuestion({ 
  question, 
  answers, 
  onAnswerChange 
}: CaseStudyQuestionProps) {
  const renderSubQuestion = (subQuestion: Question, index: number) => {
    const currentAnswer = answers.find(a => a.questionId === subQuestion.id);

    const handleSubQuestionChange = (selectedAnswers: string[] | number[]) => {
      onAnswerChange(subQuestion.id, selectedAnswers);
    };

    const handleShortAnswerChange = (textAnswer: string) => {
      onAnswerChange(subQuestion.id, [], textAnswer);
    };

    switch (subQuestion.type) {
      case 'single-choice':
        return (
          <div key={subQuestion.id} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Part {String.fromCharCode(97 + index).toUpperCase()}
              </span>
            </div>
            <SingleChoiceQuestion
              question={subQuestion}
              selectedAnswers={currentAnswer?.selectedAnswers || []}
              onAnswerChange={handleSubQuestionChange}
            />
          </div>
        );
      case 'multiple-choice':
        return (
          <div key={subQuestion.id} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Part {String.fromCharCode(97 + index).toUpperCase()}
              </span>
            </div>
            <MultipleChoiceQuestion
              question={subQuestion}
              selectedAnswers={currentAnswer?.selectedAnswers || []}
              onAnswerChange={handleSubQuestionChange}
            />
          </div>
        );
      case 'short-answer':
        return (
          <div key={subQuestion.id} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                Part {String.fromCharCode(97 + index).toUpperCase()}
              </span>
            </div>
            <ShortAnswerQuestion
              question={subQuestion}
              onAnswerChange={handleShortAnswerChange}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{question.question}</h2>
        <p className="text-sm text-gray-600">Total Points: {question.points}</p>
      </div>

      {/* Case study text */}
      {question.caseStudyText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Case Study</h3>
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {question.caseStudyText}
          </p>
        </div>
      )}

      {/* Sub-questions */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Questions based on the case study:</h3>
        {question.subQuestions?.map((subQuestion, index) => 
          renderSubQuestion(subQuestion, index)
        )}
      </div>
    </div>
  );
}
