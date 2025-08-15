import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import SingleChoiceQuestion from '../../components/questions/SingleChoiceQuestion';
import MultipleChoiceQuestion from '../../components/questions/MultipleChoiceQuestion';
import DragDropQuestion from '../../components/questions/DragDropQuestion';
import CaseStudyQuestion from '../../components/questions/CaseStudyQuestion';
import type { Question, Answer } from '../../types';

// Mock exam data
const mockExam = {
  id: '1',
  title: 'Mathematics Final Exam',
  duration: 120, // minutes
  questions: [
    {
      id: 'q1',
      type: 'single-choice' as const,
      question: 'What is the derivative of x²?',
      options: ['2x', 'x²', '2', 'x'],
      correctAnswers: [0],
      points: 5,
    },
    {
      id: 'q2',
      type: 'multiple-choice' as const,
      question: 'Which of the following are prime numbers?',
      options: ['2', '4', '7', '9', '11'],
      correctAnswers: [0, 2, 4],
      points: 10,
    },
    {
      id: 'q3',
      type: 'drag-drop' as const,
      question: 'Match the mathematical operations with their symbols',
      dragDropItems: [
        { id: 'item1', content: 'Addition', type: 'item' },
        { id: 'item2', content: 'Subtraction', type: 'item' },
        { id: 'item3', content: 'Multiplication', type: 'item' },
      ],
      dragDropTargets: [
        { id: 'target1', content: '+', acceptedItems: ['item1'] },
        { id: 'target2', content: '-', acceptedItems: ['item2'] },
        { id: 'target3', content: '×', acceptedItems: ['item3'] },
      ],
      correctAnswers: ['item1-target1', 'item2-target2', 'item3-target3'],
      points: 15,
    },
    {
      id: 'q4',
      type: 'case-study' as const,
      question: 'Case Study: Optimization Problem',
      caseStudyText: 'A company wants to maximize profit from producing widgets. The cost function is C(x) = 100 + 5x and the revenue function is R(x) = 20x - 0.1x².',
      subQuestions: [
        {
          id: 'q4a',
          type: 'single-choice' as const,
          question: 'What is the profit function P(x)?',
          options: ['15x - 0.1x² - 100', '20x - 5x - 100', '25x - 0.1x²', '15x + 0.1x² - 100'],
          correctAnswers: [0],
          points: 5,
        },
        {
          id: 'q4b',
          type: 'single-choice' as const,
          question: 'At what production level is profit maximized?',
          options: ['x = 50', 'x = 75', 'x = 100', 'x = 125'],
          correctAnswers: [1],
          points: 10,
        },
      ],
      correctAnswers: [],
      points: 15,
    },
  ] as Question[],
};

export default function TestInterface() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(mockExam.duration * 60); // in seconds
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const currentQuestion = mockExam.questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, selectedAnswers: string[] | number[], textAnswer?: string) => {
    const newAnswer: Answer = {
      questionId,
      selectedAnswers,
      textAnswer,
      isMarkedForReview: markedQuestions.has(questionId),
    };

    setAnswers(prev => {
      const existingIndex = prev.findIndex(a => a.questionId === questionId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getQuestionStatus = (questionIndex: number) => {
    const question = mockExam.questions[questionIndex];
    const answer = answers.find(a => a.questionId === question.id);
    const isMarked = markedQuestions.has(question.id);
    
    if (isMarked) return 'marked';
    if (answer && answer.selectedAnswers.length > 0) return 'answered';
    return 'unanswered';
  };

  const handleSubmit = () => {
    // In a real app, this would submit to the backend
    console.log('Submitting test with answers:', answers);
    navigate('/student');
  };

  const renderQuestion = (question: Question) => {
    const currentAnswer = answers.find(a => a.questionId === question.id);

    switch (question.type) {
      case 'single-choice':
        return (
          <SingleChoiceQuestion
            question={question}
            selectedAnswers={currentAnswer?.selectedAnswers || []}
            onAnswerChange={(selected) => handleAnswerChange(question.id, selected)}
          />
        );
      case 'multiple-choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            selectedAnswers={currentAnswer?.selectedAnswers || []}
            onAnswerChange={(selected) => handleAnswerChange(question.id, selected)}
          />
        );
      case 'drag-drop':
        return (
          <DragDropQuestion
            question={question}
            onAnswerChange={(selected) => handleAnswerChange(question.id, selected)}
          />
        );
      case 'case-study':
        return (
          <CaseStudyQuestion
            question={question}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        );
      default:
        return <div>Question type not supported</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with timer and exam info */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{mockExam.title}</h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {mockExam.questions.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-red-500" />
              <span className={`font-mono text-lg font-semibold ${
                timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question navigation sidebar */}
        <div className="w-64 bg-white shadow-sm border-r p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Questions</h3>
          <div className="grid grid-cols-4 gap-2">
            {mockExam.questions.map((_, index) => {
              const status = getQuestionStatus(index);
              const isCurrentQuestion = index === currentQuestionIndex;
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`
                    w-10 h-10 rounded-md text-sm font-medium transition-colors
                    ${isCurrentQuestion ? 'ring-2 ring-blue-500' : ''}
                    ${status === 'answered' ? 'bg-green-100 text-green-800' : ''}
                    ${status === 'marked' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${status === 'unanswered' ? 'bg-gray-100 text-gray-600' : ''}
                    hover:bg-blue-50
                  `}
                >
                  {index + 1}
                  {markedQuestions.has(mockExam.questions[index].id) && (
                    <Flag className="h-3 w-3 ml-1 inline" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 rounded"></div>
              <span>Marked for review</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>Not answered</span>
            </div>
          </div>
        </div>

        {/* Main question area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {renderQuestion(currentQuestion)}
            </div>
          </div>

          {/* Navigation and controls */}
          <div className="bg-white border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(mockExam.questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === mockExam.questions.length - 1}
                  className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>

              <button
                onClick={() => toggleMarkForReview(currentQuestion.id)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  markedQuestions.has(currentQuestion.id)
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Flag className="h-4 w-4 mr-2" />
                {markedQuestions.has(currentQuestion.id) ? 'Unmark' : 'Mark for Review'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Submit Test</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your test? You won't be able to make any changes after submission.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
