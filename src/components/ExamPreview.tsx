import { useEffect } from 'react';
import { X, Clock, User, FileText } from 'lucide-react';
import SingleChoiceQuestion from '../components/questions/SingleChoiceQuestion';
import MultipleChoiceQuestion from '../components/questions/MultipleChoiceQuestion';
import DragDropQuestion from '../components/questions/DragDropQuestion';
import CaseStudyQuestion from '../components/questions/CaseStudyQuestion';
import ShortAnswerQuestion from '../components/questions/ShortAnswerQuestion';
import CodeQuestion from '../components/questions/CodeQuestion';
import type { Question } from '../types';

interface ExamPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    title: string;
    subject: string;
    description?: string;
    duration: number;
    questions: Question[];
  };
}

export default function ExamPreview({ isOpen, onClose, exam }: ExamPreviewProps) {
  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const renderQuestion = (question: Question, index: number) => {
    const handleAnswerChange = () => {
      // This is just for preview, no actual functionality needed
    };

    switch (question.type) {
      case 'single-choice':
        return (
          <SingleChoiceQuestion
            key={question.id || index}
            question={question}
            selectedAnswers={[]}
            onAnswerChange={handleAnswerChange}
          />
        );
      case 'multiple-choice':
        return (
          <MultipleChoiceQuestion
            key={question.id || index}
            question={question}
            selectedAnswers={[]}
            onAnswerChange={handleAnswerChange}
          />
        );
      case 'drag-drop':
        return (
          <DragDropQuestion
            key={question.id || index}
            question={question}
            onAnswerChange={handleAnswerChange}
          />
        );
      case 'case-study':
        return (
          <CaseStudyQuestion
            key={question.id || index}
            question={question}
            answers={[]}
            onAnswerChange={handleAnswerChange}
          />
        );
      case 'short-answer':
        return (
          <ShortAnswerQuestion
            key={question.id || index}
            question={question}
            onAnswerChange={handleAnswerChange}
          />
        );
      case 'code':
        return (
          <CodeQuestion
            key={question.id || index}
            question={question}
            onAnswerChange={handleAnswerChange}
          />
        );
      default:
        return (
          <div key={question.id || index} className="p-4 border border-red-300 rounded-lg bg-red-50">
            <p className="text-red-600">Unsupported question type: {question.type}</p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Exam Preview
                </h3>
                <p className="text-sm text-gray-500">Preview how students will see this exam</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Exam Header */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600 mb-4">{exam.subject}</p>
            
            {exam.description && (
              <p className="text-gray-700 mb-4">{exam.description}</p>
            )}

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{exam.duration} minutes</span>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                <span>{exam.questions.length} questions</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{totalPoints} total points</span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="p-6 space-y-8">
              {exam.questions.length > 0 ? (
                exam.questions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Question {index + 1} of {exam.questions.length}
                        </span>
                        <span className="text-sm text-gray-500">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                    </div>
                    {renderQuestion(question, index)}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No questions added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Total: {exam.questions.length} questions, {totalPoints} points
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
