import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Flag, AlertTriangle, 
  CheckCircle, XCircle, Send, BookOpen, Timer,
  ArrowLeft, ArrowRight, GripVertical,
  ArrowUpDown, Move, Package, Target, FileText, Shield
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useAntiCheat, type AntiCheatEvent } from '../../hooks/useAntiCheat';
import AntiCheatIndicator, { SecurityGuidelinesModal } from '../../components/AntiCheatIndicator';
import { toast } from 'react-hot-toast';

// Types
interface Question {
  id: number;
  exam_id: number;
  question_type: 'single-choice' | 'multiple-choice' | 'drag-drop' | 'case-study' | 'short-answer' | 'code';
  question_text: string;
  question_data: any;
  marks: number;
  order_index: number;
}

interface Exam {
  id: number;
  title: string;
  subject: string;
  description: string;
  duration: number;
  total_marks: number;
  passing_score: number;
  is_published: boolean;
}

interface Answer {
  questionId: number;
  answer: any;
  isMarkedForReview: boolean;
  timeSpent: number;
  lastUpdateTime?: number;
  serverResponse?: any;
}

interface QuestionStatus {
  attempted: boolean;
  markedForReview: boolean;
  answered: boolean;
}

interface ExamResult {
  totalMarks: number;
  scoredMarks: number;
  status: 'Passed' | 'Failed';
  totalQuestions: number;
  attemptedQuestions: number;
  unattemptedQuestions: number;
  timeTaken: string;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export default function InteractiveExamInterface() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  // State management
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [_examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Anti-cheat state
  const [showSecurityGuidelines, setShowSecurityGuidelines] = useState(false);
  const [examSecurityActive, setExamSecurityActive] = useState(false);

  // Refs to prevent duplicate initialization
  const initOnceRef = useRef(false);
  const startingAttemptRef = useRef(false);

  // Anti-cheat hook
  const antiCheat = useAntiCheat(
    {
      enableFullScreen: true,
      maxViolations: 5,
      warningThreshold: 3,
      actionOnMaxViolations: 'submit',
      monitorTabSwitch: true,
      monitorDevTools: true,
      enableDevToolsDetection: true,
      monitorCopyPaste: true,
      logEvents: true
    },
    (violation: AntiCheatEvent) => {
      // Log violation to backend
      logSecurityViolation(violation);
    },
    () => {
      // Auto-submit exam on max violations
      handleAutoSubmit('Security violations exceeded maximum limit');
    }
  );

  // Initialize exam - with duplicate prevention
  useEffect(() => {
    if (examId && !initOnceRef.current) {
      initOnceRef.current = true;
      fetchExamData();
    }
  }, [examId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !examSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, examSubmitted]);

  // Periodic auto-save effect
  useEffect(() => {
    if (!currentAttemptId || examSubmitted) return;

    const autoSaveInterval = setInterval(() => {
      autoSaveAnswers();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [currentAttemptId, examSubmitted, answers]);

  // Browser beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (currentAttemptId && !examSubmitted) {
        event.preventDefault();
        event.returnValue = 'You have an active test. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentAttemptId, examSubmitted]);

  // Cleanup anti-cheat on component unmount only
  useEffect(() => {
    return () => {
      if (examSecurityActive) {
        antiCheat.stopAntiCheat({ exitFullscreen: true });
      }
    };
  }, [antiCheat]); // Removed examSecurityActive dependency to prevent cleanup on state change
  useEffect(() => {
    if (questions.length === 0) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (event.ctrlKey && currentQuestionIndex > 0) {
            event.preventDefault();
            navigateToQuestion(currentQuestionIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (event.ctrlKey && currentQuestionIndex < questions.length - 1) {
            event.preventDefault();
            navigateToQuestion(currentQuestionIndex + 1);
          }
          break;
        case 'f':
          if (event.ctrlKey) {
            event.preventDefault();
            if (currentQuestion) {
              handleMarkForReview(currentQuestion.id);
            }
          }
          break;
        case 's':
          if (event.ctrlKey) {
            event.preventDefault();
            setShowSubmitConfirmation(true);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, questions.length]);

  const autoSaveAnswers = async () => {
    if (!currentAttemptId || Object.keys(answers).length === 0) return;

    try {
      setAutoSaveStatus('saving');
      console.log('💾 Auto-saving answers...');

      // Save all pending answers
      const savePromises = Object.entries(answers).map(async ([questionId, answerData]) => {
        if (answerData.answer !== null && answerData.answer !== undefined && answerData.answer !== '') {
          const question = questions.find(q => q.id === parseInt(questionId));
          if (!question) return;

          let standardizedAnswer = formatAnswerForSubmission(question, answerData.answer);

          const response = await fetch('http://localhost:5000/api/answers/submit', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              attemptId: currentAttemptId,
              questionId: parseInt(questionId),
              studentAnswer: standardizedAnswer
            })
          });

          return response.ok;
        }
      });

      const results = await Promise.allSettled(savePromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      setAutoSaveStatus('saved');
      setLastAutoSave(new Date());
      
      console.log(`💾 Auto-saved ${successful} answers`);
      
      // Reset status after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  };

  const formatAnswerForSubmission = (question: Question, answer: any) => {
    switch (question.question_type) {
      case 'single-choice':
        return `opt${answer + 1}`;
        
      case 'multiple-choice':
        return Array.isArray(answer) 
          ? answer.map((index: number) => `opt${index + 1}`)
          : [];
          
      case 'case-study':
        const questionData = question.question_data;
        const subQuestions = questionData?.subQuestions || [];
        
        return subQuestions.map((subQ: any, subIndex: number) => {
          const subAnswer = answer[subIndex];
          let formattedSubAnswer: any;
          
          if (subQ.questionType === 'single-choice') {
            formattedSubAnswer = `opt${subAnswer + 1}`;
          } else if (subQ.questionType === 'multiple-choice') {
            formattedSubAnswer = Array.isArray(subAnswer) 
              ? subAnswer.map((idx: number) => `opt${idx + 1}`)
              : [];
          } else {
            formattedSubAnswer = subAnswer;
          }
          
          return {
            questionText: subQ.questionText,
            questionType: subQ.questionType,
            studentAnswer: formattedSubAnswer
          };
        });
        
      case 'drag-drop':
        return answer;
        
      case 'short-answer':
        return answer;
        
      default:
        return answer;
    }
  };

  const fetchExamData = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage (required for questions endpoint)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('🔑 Token available:', !!token);
      console.log('🔑 Token source:', localStorage.getItem('token') ? 'token' : 'authToken');
      
      if (!token) {
        setError('Please log in to access this exam.');
        navigate('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      console.log('📋 Fetching exam details for ID:', examId);
      
      // Fetch exam details (no auth required)
      const examResponse = await fetch(`http://localhost:5000/api/exams/${examId}`);
      if (!examResponse.ok) {
        console.error('❌ Exam fetch failed:', examResponse.status, examResponse.statusText);
        throw new Error(`Failed to fetch exam details (${examResponse.status})`);
      }
      const examData = await examResponse.json();
      console.log('✅ Exam data received:', examData);
      
      // Fetch questions (auth required)
      console.log('📋 Fetching questions for exam ID:', examId);
      const questionsResponse = await fetch(`http://localhost:5000/api/questions/exam/${examId}`, { headers });
      
      if (!questionsResponse.ok) {
        console.error('❌ Questions fetch failed:', questionsResponse.status, questionsResponse.statusText);
        if (questionsResponse.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        } else if (questionsResponse.status === 403) {
          throw new Error('Access denied. Please check your permissions.');
        }
        throw new Error(`Failed to fetch questions (${questionsResponse.status})`);
      }
      
      const questionsResult = await questionsResponse.json();
      console.log('✅ Questions data received:', questionsResult);

      if (!examData.data) {
        throw new Error('Invalid exam data received');
      }

      if (!questionsResult.data || !Array.isArray(questionsResult.data)) {
        throw new Error('Invalid questions data received');
      }

      setExam(examData.data);
      setQuestions(questionsResult.data.sort((a: Question, b: Question) => a.order_index - b.order_index));
      
      // Start test attempt - with duplicate prevention
      if (startingAttemptRef.current) {
        console.log('⚠️ Test attempt creation already in progress, skipping duplicate');
        return;
      }
      
      startingAttemptRef.current = true;
      
      try {
        console.log('🚀 Starting test attempt...');
        const startAttemptResponse = await fetch('http://localhost:5000/api/test-attempts/start', {
          method: 'POST',
          headers,
          body: JSON.stringify({ examId: parseInt(examId!) })
        });

        if (!startAttemptResponse.ok) {
          const errorData = await startAttemptResponse.json();
          throw new Error(errorData.message || 'Failed to start test attempt');
        }

        const attemptData = await startAttemptResponse.json();
        console.log('✅ Test attempt response:', attemptData);
        
        // Always treat as NEW attempt (no resume logic)
        console.log('� Starting new attempt:', attemptData.data.attemptId);
        setCurrentAttemptId(attemptData.data.attemptId);
        
        // Initialize exam timer with full duration
        const durationInSeconds = examData.data.duration * 60;
        setTimeRemaining(durationInSeconds);
        setExamStartTime(new Date());
        
        // Show security guidelines modal for new attempts
        setShowSecurityGuidelines(true);
        
      } finally {
        startingAttemptRef.current = false;
      }
      
      // Initialize question statuses for new attempt
      const initialStatuses: Record<number, QuestionStatus> = {};
      questionsResult.data.forEach((q: Question) => {
        initialStatuses[q.id] = {
          attempted: false,
          markedForReview: false,
          answered: false
        };
      });
      setQuestionStatuses(initialStatuses);
      
    } catch (error) {
      console.error('Error fetching exam data:', error);
      // Reset refs on error so user can retry
      initOnceRef.current = false;
      startingAttemptRef.current = false;
      
      if (error instanceof Error) {
        if (error.message.includes('session has expired') || error.message.includes('log in')) {
          navigate('/login');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to load exam. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = useCallback(async (questionId: number, answer: any) => {
    const currentTime = Date.now();
    const previousTime = answers[questionId]?.lastUpdateTime || currentTime;
    const timeSpent = (answers[questionId]?.timeSpent || 0) + Math.round((currentTime - previousTime) / 1000);

    // Update local state immediately for responsiveness
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        isMarkedForReview: prev[questionId]?.isMarkedForReview || false,
        timeSpent: timeSpent,
        lastUpdateTime: currentTime
      }
    }));

    // Update question status
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        attempted: true,
        answered: answer !== null && answer !== undefined && answer !== ''
      }
    }));

    // Submit answer to backend if we have an active attempt
    if (currentAttemptId && answer !== null && answer !== undefined && answer !== '') {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        
        // Find the question to get its type
        const question = questions.find(q => q.id === questionId);
        if (!question) {
          console.error('Question not found for ID:', questionId);
          return;
        }

        // Format answer according to standardized format based on question type
        const standardizedAnswer = formatAnswerForSubmission(question, answer);

        console.log(`📝 Submitting standardized answer for question ${questionId}:`, {
          questionType: question.question_type,
          originalAnswer: answer,
          standardizedAnswer: standardizedAnswer
        });

        const response = await fetch('http://localhost:5000/api/answers/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            attemptId: currentAttemptId,
            questionId: questionId,
            studentAnswer: standardizedAnswer
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Answer submitted for question ${questionId}:`, result.data);
          
          // Update local state with server response if needed
          if (result.data?.formattedAnswer) {
            setAnswers(prev => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                serverResponse: result.data
              }
            }));
          }
        } else {
          console.warn(`⚠️ Failed to submit answer for question ${questionId}:`, response.status);
          // Don't throw error to avoid blocking UI, but log for debugging
        }
      } catch (error) {
        console.error('Error submitting answer:', error);
        // Don't block the UI - answer is saved locally
      }
    }
  }, [currentAttemptId, answers, questions]);

  const handleMarkForReview = (questionId: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        answer: prev[questionId]?.answer || null,
        isMarkedForReview: !prev[questionId]?.isMarkedForReview,
        timeSpent: prev[questionId]?.timeSpent || 0
      }
    }));

    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));

    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        markedForReview: !prev[questionId]?.markedForReview
      }
    }));
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleAutoSubmit = (reason?: string) => {
    console.log('Auto-submitting exam due to:', reason || 'time expiry');
    
    // Stop anti-cheat monitoring before submission
    if (examSecurityActive) {
      antiCheat.stopAntiCheat({ exitFullscreen: true });
      setExamSecurityActive(false);
    }
    
    submitExam();
  };

  // Log security violations to backend
  const logSecurityViolation = async (violation: AntiCheatEvent) => {
    if (!currentAttemptId) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      await fetch('http://localhost:5000/api/security/log-violation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attemptId: currentAttemptId,
          violationType: violation.type,
          details: violation.details,
          timestamp: violation.timestamp.toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  };

  // Start secure exam with anti-cheat (robust ordering to avoid premature fullscreen exit)
  const startSecureExam = async () => {
    try {
      // 1. Mark security active BEFORE requesting fullscreen so any lifecycle cleanup won't immediately stop it
      setExamSecurityActive(true);
      // 2. Start anti-cheat (sets internal refs synchronously)
      antiCheat.startAntiCheat();
      // 3. Request fullscreen within same user gesture frame
      const fullscreenSuccess = await antiCheat.requestFullScreen();
      if (!fullscreenSuccess) {
        // Rollback state if user denied fullscreen
  antiCheat.stopAntiCheat({ exitFullscreen: false });
        setExamSecurityActive(false);
        toast.error('Fullscreen is required to start the exam. Please allow it and try again.');
        return;
      }
      setShowSecurityGuidelines(false);
      toast.success('Exam started in secure fullscreen mode');
    } catch (error) {
      console.error('Failed to start secure exam:', error);
  antiCheat.stopAntiCheat({ exitFullscreen: true });
      setExamSecurityActive(false);
      toast.error('Failed to enable secure monitoring. Please try again.');
    }
  };

  const submitExam = async () => {
    if (!currentAttemptId) {
      setError('No active test attempt found');
      return;
    }

    try {
      setSubmitting(true);
      console.log('📤 Submitting exam attempt:', currentAttemptId);

      // Stop anti-cheat monitoring
      if (examSecurityActive) {
        antiCheat.stopAntiCheat({ exitFullscreen: true });
        setExamSecurityActive(false);
      }

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/test-attempts/${currentAttemptId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit exam');
      }

      const result = await response.json();
      console.log('✅ Exam submitted successfully:', result);

      // Convert backend result to frontend format
      const examResult: ExamResult = {
        totalMarks: result.data.totalMarks || 0,
        scoredMarks: result.data.totalScore || 0,
        status: result.data.passed ? 'Passed' : 'Failed',
        totalQuestions: result.data.totalQuestions || 0,
        attemptedQuestions: result.data.questionsAnswered || 0,
        unattemptedQuestions: (result.data.totalQuestions || 0) - (result.data.questionsAnswered || 0),
        timeTaken: formatTime((result.data.timeTaken || 0) * 60), // backend returns minutes
        percentage: result.data.percentageScore || 0,
        correctAnswers: result.data.correctAnswers || 0,
        incorrectAnswers: (result.data.questionsAnswered || 0) - (result.data.correctAnswers || 0)
      };

      setExamResult(examResult);
      setExamSubmitted(true);
      setShowSubmitConfirmation(false);
      
    } catch (error) {
      console.error('❌ Error submitting exam:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getQuestionStatusColor = (questionId: number): string => {
    const answer = answers[questionId];
    const status = questionStatuses[questionId];
    
    // Check if answered (has a meaningful answer)
    const isAnswered = answer?.answer !== undefined && 
                      answer?.answer !== '' && 
                      answer?.answer !== null &&
                      (Array.isArray(answer?.answer) ? answer?.answer.length > 0 : true);
    
    // Check if marked for review
    const isMarkedForReview = status?.markedForReview || answer?.isMarkedForReview;
    
    // Check if attempted (has some interaction but maybe not fully answered)
    const isAttempted = answer !== undefined || status?.attempted;
    
    if (isMarkedForReview && isAnswered) {
      return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md'; // Answered but marked for review
    }
    if (isMarkedForReview) {
      return 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'; // Marked for review but not answered
    }
    if (isAnswered) {
      return 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md'; // Fully answered
    }
    if (isAttempted) {
      return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white'; // Attempted but not completed
    }
    return 'bg-gray-200 text-gray-700 hover:bg-gray-300'; // Not visited
  };

  const getQuestionStatusInfo = (questionId: number) => {
    const answer = answers[questionId];
    const status = questionStatuses[questionId];
    
    const isAnswered = answer?.answer !== undefined && 
                      answer?.answer !== '' && 
                      answer?.answer !== null &&
                      (Array.isArray(answer?.answer) ? answer?.answer.length > 0 : true);
    
    const isMarkedForReview = status?.markedForReview || answer?.isMarkedForReview;
    const isAttempted = answer !== undefined || status?.attempted;
    
    if (isMarkedForReview && isAnswered) return { status: 'answered-review', label: 'Answered (Review)' };
    if (isMarkedForReview) return { status: 'review', label: 'Marked for Review' };
    if (isAnswered) return { status: 'answered', label: 'Answered' };
    if (isAttempted) return { status: 'attempted', label: 'Attempted' };
    return { status: 'unattempted', label: 'Not Attempted' };
  };

  const renderQuestionContent = (question: Question) => {
    const answer = answers[question.id]?.answer;
    
    switch (question.question_type) {
      case 'single-choice':
        return (
          <SingleChoiceQuestion
            question={question}
            selectedAnswer={answer}
            onAnswerChange={(ans: any) => handleAnswerChange(question.id, ans)}
          />
        );
      case 'multiple-choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            selectedAnswers={answer || []}
            onAnswerChange={(ans: any) => handleAnswerChange(question.id, ans)}
          />
        );
      case 'drag-drop':
        return (
          <DragDropQuestion
            question={question}
            answer={answer}
            onAnswerChange={(ans: any) => handleAnswerChange(question.id, ans)}
          />
        );
      case 'case-study':
        return (
          <CaseStudyQuestion
            question={question}
            answers={answer || {}}
            onAnswerChange={(ans: any) => handleAnswerChange(question.id, ans)}
          />
        );
      case 'short-answer':
        return (
          <ShortAnswerQuestion
            question={question}
            answer={answer || ''}
            onAnswerChange={(ans: any) => handleAnswerChange(question.id, ans)}
          />
        );
      default:
        return (
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600">Question type not supported yet: {question.question_type}</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Exam</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => navigate('/student')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examSubmitted && examResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              examResult.status === 'Passed' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {examResult.status === 'Passed' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Completed!</h2>
            <p className={`text-lg font-semibold ${
              examResult.status === 'Passed' ? 'text-green-600' : 'text-red-600'
            }`}>
              {examResult.status}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{examResult.scoredMarks}</div>
              <div className="text-sm text-gray-600">Scored Marks</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">{examResult.totalMarks}</div>
              <div className="text-sm text-gray-600">Total Marks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{examResult.correctAnswers}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{examResult.incorrectAnswers}</div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{examResult.attemptedQuestions}</div>
              <div className="text-sm text-gray-600">Attempted</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{examResult.unattemptedQuestions}</div>
              <div className="text-sm text-gray-600">Unattempted</div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600 font-medium">Percentage Score:</span>
              <span className="font-bold text-lg">{examResult.percentage}%</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600 font-medium">Accuracy Rate:</span>
              <span className="font-semibold">
                {examResult.attemptedQuestions > 0 
                  ? Math.round((examResult.correctAnswers / examResult.attemptedQuestions) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600 font-medium">Time Taken:</span>
              <span className="font-semibold">{examResult.timeTaken}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 font-medium">Total Questions:</span>
              <span className="font-semibold">{examResult.totalQuestions}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/student')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No questions found for this exam.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Anti-Cheat Indicator */}
      <AntiCheatIndicator
        isActive={examSecurityActive}
        isFullScreen={antiCheat.isFullScreen}
        violationCount={antiCheat.violationCount}
        maxViolations={5}
        warningThreshold={3}
        isExamLocked={antiCheat.isExamLocked}
        violations={antiCheat.violations}
        onForceFullScreen={antiCheat.forceFullScreen}
      />

      {/* Security Guidelines Modal */}
      <SecurityGuidelinesModal
        isOpen={showSecurityGuidelines}
        onClose={() => {
          setShowSecurityGuidelines(false);
          // If user cancels, redirect them back
          navigate('/student');
        }}
        onStartExam={startSecureExam}
      />

      {/* Exam Locked Overlay */}
      {antiCheat.isExamLocked && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exam Locked</h2>
            <p className="text-gray-600 mb-6">
              Maximum security violations have been reached. Your exam has been locked for security reasons.
            </p>
            <button
              onClick={() => navigate('/student')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">{exam.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600 font-medium">
                    ✓ {Object.keys(answers).length}
                  </span>
                  <span className="text-orange-500 font-medium">
                    📌 {Object.keys(markedForReview).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Progress Bar */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-gray-500">Progress:</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(Object.keys(answers).length / questions.length) * 100}%` 
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600">
                  {Math.round((Object.keys(answers).length / questions.length) * 100)}%
                </span>
              </div>
              
              {/* Timer */}
              <div className={`flex items-center px-3 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 
                timeRemaining < 900 ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                <Timer className="h-4 w-4 mr-2" />
                <span className="font-mono font-medium">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              {/* Auto-save Status */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center px-2 py-1 rounded text-xs ${
                  autoSaveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                  autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                  autoSaveStatus === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                      Saving...
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Saved
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Save Error
                    </>
                  )}
                  {autoSaveStatus === 'idle' && lastAutoSave && (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {new Date().getTime() - lastAutoSave.getTime() > 60000 ? 
                        'Last saved ' + Math.floor((new Date().getTime() - lastAutoSave.getTime()) / 60000) + 'm ago' :
                        'Auto-save on'
                      }
                    </>
                  )}
                </div>
              </div>
              
              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitConfirmation(true)}
                disabled={submitting}
                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center shadow-sm ${
                  submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Progress Bar */}
          <div className="md:hidden pb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Answered: {Object.keys(answers).length}/{questions.length}</span>
              <span>Progress: {Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(Object.keys(answers).length / questions.length) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Question Navigator</h3>
                <div className="text-xs text-gray-500">
                  {Object.keys(answers).length}/{questions.length}
                </div>
              </div>
              
              {/* Progress Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">
                      {questions.filter(q => {
                        const answer = answers[q.id];
                        return answer?.answer !== undefined && answer?.answer !== '' && answer?.answer !== null;
                      }).length}
                    </div>
                    <div className="text-gray-600">Answered</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-600">
                      {Object.values(answers).filter(a => a?.isMarkedForReview).length + 
                       Object.values(questionStatuses).filter(s => s?.markedForReview).length}
                    </div>
                    <div className="text-gray-600">Review</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((question, index) => {
                  const statusInfo = getQuestionStatusInfo(question.id);
                  return (
                    <button
                      key={question.id}
                      onClick={() => navigateToQuestion(index)}
                      title={`Question ${index + 1}: ${statusInfo.label}`}
                      className={`
                        relative w-10 h-10 rounded text-sm font-bold transition-all duration-200 transform hover:scale-105
                        ${index === currentQuestionIndex ? 'ring-3 ring-blue-400 ring-offset-2' : ''}
                        ${getQuestionStatusColor(question.id)}
                      `}
                    >
                      {index + 1}
                      
                      {/* Status indicator icons */}
                      {statusInfo.status === 'answered-review' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                          <Flag className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {statusInfo.status === 'review' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                          <Flag className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {statusInfo.status === 'answered' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Enhanced Legend */}
              <div className="space-y-2 text-xs border-t pt-3">
                <h4 className="font-medium text-gray-700 mb-2">Status Legend:</h4>
                <div className="grid grid-cols-1 gap-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded shadow-sm"></div>
                    <span className="text-gray-700">Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded shadow-sm"></div>
                    <span className="text-gray-700">Review Required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded"></div>
                    <span className="text-gray-700">Attempted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span className="text-gray-700">Not Visited</span>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="mt-3 pt-2 border-t">
                  <div className="text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span className="font-medium">
                        {questions.length - questions.filter(q => {
                          const answer = answers[q.id];
                          return answer?.answer !== undefined && answer?.answer !== '' && answer?.answer !== null;
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              {/* Question Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {/* Question Number with enhanced styling */}
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      Q{currentQuestionIndex + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      of {questions.length}
                    </span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                    </span>
                    
                    {/* Question Status Indicator */}
                    <div className="flex items-center gap-2">
                      {answers[currentQuestion.id]?.answer !== undefined && answers[currentQuestion.id]?.answer !== '' && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Answered
                        </span>
                      )}
                      
                      {questionStatuses[currentQuestion.id]?.markedForReview && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          <Flag className="h-3 w-3" />
                          Review
                        </span>
                      )}
                      
                      {!answers[currentQuestion.id]?.answer && !questionStatuses[currentQuestion.id]?.markedForReview && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <XCircle className="h-3 w-3" />
                          Unattempted
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleMarkForReview(currentQuestion.id)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      questionStatuses[currentQuestion.id]?.markedForReview
                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    {questionStatuses[currentQuestion.id]?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>
                
                {/* Question Type Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${currentQuestion.question_type === 'single-choice' ? 'bg-blue-100 text-blue-800' :
                      currentQuestion.question_type === 'multiple-choice' ? 'bg-purple-100 text-purple-800' :
                      currentQuestion.question_type === 'drag-drop' ? 'bg-green-100 text-green-800' :
                      currentQuestion.question_type === 'case-study' ? 'bg-orange-100 text-orange-800' :
                      currentQuestion.question_type === 'short-answer' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {currentQuestion.question_type === 'single-choice' ? '🔘 Single Choice' :
                     currentQuestion.question_type === 'multiple-choice' ? '☑️ Multiple Choice' :
                     currentQuestion.question_type === 'drag-drop' ? '🔄 Drag & Drop' :
                     currentQuestion.question_type === 'case-study' ? '📖 Case Study' :
                     currentQuestion.question_type === 'short-answer' ? '✏️ Short Answer' :
                     currentQuestion.question_type}
                  </span>
                  
                  {/* Difficulty indicator could be added here if available in question data */}
                  {currentQuestion.question_data?.difficulty && (
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded text-xs
                      ${currentQuestion.question_data.difficulty === 'easy' ? 'bg-green-50 text-green-700 border border-green-200' :
                        currentQuestion.question_data.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        'bg-red-50 text-red-700 border border-red-200'}
                    `}>
                      {currentQuestion.question_data.difficulty.charAt(0).toUpperCase() + currentQuestion.question_data.difficulty.slice(1)}
                    </span>
                  )}
                </div>
                
                <h2 className="text-lg font-semibold text-gray-900 leading-relaxed">
                  {currentQuestion.question_text}
                </h2>
              </div>
              
              {/* Question Content */}
              <div className="p-6">
                {renderQuestionContent(currentQuestion)}
              </div>
              
              {/* Navigation */}
              <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </button>
                
                <span className="text-sm text-gray-500">
                  {currentQuestionIndex + 1} of {questions.length}
                </span>
                
                <button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Submit Exam?</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your exam? You won't be able to make any changes after submission.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirmation(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitExam}
                disabled={submitting}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center ${
                  submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Question Components
interface QuestionComponentProps {
  question?: Question;
  selectedAnswer?: any;
  selectedAnswers?: number[];
  answer?: string | any;
  answers?: any;
  onAnswerChange: (answer: any) => void;
}

// Draggable Item Component
interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  isPlaced?: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, children, isPlaced = false }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-3 border rounded-lg cursor-move transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : 'hover:shadow-md'}
        ${isPlaced ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300'}
      `}
    >
      <div className="flex items-center">
        <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
        <span className="text-gray-900">{children}</span>
      </div>
    </div>
  );
};

// Droppable Target Component
interface DroppableTargetProps {
  id: string;
  children?: React.ReactNode;
  label: string;
  isEmpty: boolean;
}

const DroppableTarget: React.FC<DroppableTargetProps> = ({ id, children, label, isEmpty }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] p-3 border-2 border-dashed rounded-lg transition-all duration-200
        ${isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${isEmpty ? 'bg-gray-50' : 'bg-white'}
      `}
    >
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      {children || (
        <div className="text-gray-400 text-sm italic">
          Drop item here
        </div>
      )}
    </div>
  );
};

// Droppable Container Component
interface DroppableProps {
  id: string;
  children: React.ReactNode;
}

const Droppable: React.FC<DroppableProps> = ({ id, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        transition-all duration-200
        ${isOver ? 'bg-blue-100' : ''}
      `}
    >
      {children}
    </div>
  );
};

// Sortable Item Component for ordering questions
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const SingleChoiceQuestion = ({ question, selectedAnswer, onAnswerChange }: QuestionComponentProps) => {
  const questionData = question?.question_data;
  
  // Handle different formats from database
  let options: string[] = [];
  
  if (questionData?.options) {
    // Format 1: Array of objects with text property
    if (Array.isArray(questionData.options) && questionData.options[0]?.text) {
      options = questionData.options.map((opt: any) => opt.text);
    }
    // Format 2: Simple array of strings
    else if (Array.isArray(questionData.options)) {
      options = questionData.options;
    }
  }
  
  // Fallback if no options found
  if (options.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">⚠️ No options found for this single choice question</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
        Select one answer
      </div>
      
      {options.map((option: string, index: number) => {
        const isSelected = selectedAnswer === index;
        
        return (
          <label 
            key={index} 
            className={`
              flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="radio"
                name={`question-${question?.id}`}
                value={index}
                checked={isSelected}
                onChange={() => onAnswerChange(index)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
            </div>
            <div className="ml-3 flex-1">
              <span className={`text-gray-900 leading-relaxed ${isSelected ? 'font-medium' : ''}`}>
                {option}
              </span>
            </div>
            {isSelected && (
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
            )}
          </label>
        );
      })}
    </div>
  );
};

const MultipleChoiceQuestion = ({ question, selectedAnswers = [], onAnswerChange }: QuestionComponentProps) => {
  const questionData = question?.question_data;
  
  // Ensure selectedAnswers is always an array to prevent .includes() errors
  const safeSelectedAnswers = Array.isArray(selectedAnswers) ? selectedAnswers : [];
  
  // Handle different formats from database - same as SingleChoiceQuestion
  let options: string[] = [];
  
  if (questionData?.options) {
    // Format 1: Array of objects with text property
    if (Array.isArray(questionData.options) && questionData.options[0]?.text) {
      options = questionData.options.map((opt: any) => opt.text);
    }
    // Format 2: Simple array of strings
    else if (Array.isArray(questionData.options)) {
      options = questionData.options;
    }
  }
  
  // Fallback if no options found
  if (options.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">⚠️ No options found for this multiple choice question</p>
      </div>
    );
  }
  
  const handleChange = (index: number) => {
    const newAnswers = safeSelectedAnswers.includes(index)
      ? safeSelectedAnswers.filter((i: number) => i !== index)
      : [...safeSelectedAnswers, index];
    onAnswerChange(newAnswers);
  };
  
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-purple-500 rounded flex items-center justify-center">
          <CheckCircle className="h-3 w-3 text-purple-500" />
        </div>
        Select all that apply
      </div>
      
      {options.map((option: string, index: number) => {
        const isSelected = safeSelectedAnswers.includes(index);
        
        return (
          <label 
            key={index} 
            className={`
              flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
              ${isSelected 
                ? 'border-purple-500 bg-purple-50 shadow-sm' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleChange(index)}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
              />
            </div>
            <div className="ml-3 flex-1">
              <span className={`text-gray-900 leading-relaxed ${isSelected ? 'font-medium' : ''}`}>
                {option}
              </span>
            </div>
            {isSelected && (
              <CheckCircle className="h-5 w-5 text-purple-500 flex-shrink-0 ml-2" />
            )}
          </label>
        );
      })}
      
      {safeSelectedAnswers.length > 0 && (
        <div className="mt-3 p-2 bg-purple-50 rounded-lg text-sm text-purple-700">
          {safeSelectedAnswers.length} option{safeSelectedAnswers.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

const DragDropQuestion = ({ question, answer, onAnswerChange }: QuestionComponentProps) => {
  const questionData = question?.question_data;
  
  // Handle different database formats for drag-drop questions
  if (questionData?.dragDropItems && questionData?.dragDropTargets) {
    // Format 1: dragDropItems + dragDropTargets
    return <EnhancedDragDrop questionData={questionData} answer={answer} onAnswerChange={onAnswerChange} />;
  } else if (questionData?.type === 'matching' && (questionData?.leftItems || questionData?.rightItems)) {
    // Format 2: leftItems + rightItems (matching)
    return <MatchingDragDrop questionData={questionData} answer={answer} onAnswerChange={onAnswerChange} />;
  } else if (questionData?.type === 'ordering' && questionData?.items) {
    // Format 3: items (ordering)
    return <OrderingDragDrop questionData={questionData} answer={answer} onAnswerChange={onAnswerChange} />;
  } else {
    // Fallback - show error with detailed info
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium mb-2">⚠️ Drag and Drop Configuration Issue:</p>
        <p className="text-red-700 text-sm mb-2">
          This question's drag-and-drop data is not properly configured.
        </p>
        <div className="text-xs text-red-600 bg-red-100 p-2 rounded mt-2">
          <strong>Expected formats:</strong>
          <ul className="list-disc list-inside mt-1">
            <li>Format 1: dragDropItems + dragDropTargets</li>
            <li>Format 2: type='matching' + leftItems + rightItems</li>
            <li>Format 3: type='ordering' + items</li>
          </ul>
          <p className="mt-2"><strong>Current data:</strong> {JSON.stringify(questionData, null, 2)}</p>
        </div>
      </div>
    );
  }
};

// Enhanced Drag Drop for dragDropItems + dragDropTargets format
const EnhancedDragDrop = ({ questionData, answer, onAnswerChange }: { questionData: any; answer: any; onAnswerChange: (answer: any) => void }) => {
  const [itemTargetMap, setItemTargetMap] = useState<Record<string, string>>({});
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  useEffect(() => {
    const items = questionData.dragDropItems || [];
    
    // Initialize available items
    setAvailableItems(items);
    
    // Restore previous answer if available
    if (answer && typeof answer === 'object') {
      setItemTargetMap(answer);
      
      // Remove placed items from available
      const placedItemIds = Object.keys(answer);
      setAvailableItems(items.filter((item: any) => !placedItemIds.includes(item.id)));
    }
  }, [questionData, answer]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const targetId = over.id as string;

    if (targetId === 'available-items') {
      // Return item to available items
      const newMap = { ...itemTargetMap };
      delete newMap[itemId];
      setItemTargetMap(newMap);
      
      const item = questionData.dragDropItems.find((i: any) => i.id === itemId);
      if (item) {
        setAvailableItems(prev => [...prev, item]);
      }
      
      onAnswerChange(newMap);
    } else if (targetId.startsWith('target-')) {
      // Place item in target
      const newMap = { ...itemTargetMap };
      
      // Remove item from previous target if it was placed
      delete newMap[itemId];
      
      // If target already has an item, move it back to available
      const existingItemId = Object.keys(newMap).find(key => newMap[key] === targetId);
      if (existingItemId) {
        delete newMap[existingItemId];
        const existingItem = questionData.dragDropItems.find((i: any) => i.id === existingItemId);
        if (existingItem) {
          setAvailableItems(prev => [...prev, existingItem]);
        }
      }
      
      // Assign item to target
      newMap[itemId] = targetId;
      setItemTargetMap(newMap);
      
      // Remove item from available
      setAvailableItems(prev => prev.filter(item => item.id !== itemId));
      
      onAnswerChange(newMap);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg">
          <Package className="h-4 w-4" />
          <strong>Instructions:</strong> Drag items from the Item Block to the correct Target Block. You can drag items back to return them.
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Block */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Block
            </h3>
            <Droppable id="available-items">
              <div className="space-y-2 min-h-[100px]">
                {availableItems.map((item) => (
                  <DraggableItem key={item.id} id={item.id}>
                    {item.content}
                  </DraggableItem>
                ))}
                {availableItems.length === 0 && (
                  <div className="text-gray-400 text-sm italic p-4 text-center border-2 border-dashed border-gray-300 rounded">
                    All items have been placed
                  </div>
                )}
              </div>
            </Droppable>
          </div>

          {/* Target Block */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Block
            </h3>
            <div className="space-y-3">
              {questionData.dragDropTargets.map((target: any) => {
                const placedItemId = Object.keys(itemTargetMap).find(key => itemTargetMap[key] === `target-${target.id}`);
                const placedItem = placedItemId ? questionData.dragDropItems.find((i: any) => i.id === placedItemId) : null;
                
                return (
                  <DroppableTarget
                    key={target.id}
                    id={`target-${target.id}`}
                    label={target.content || target.label || `Target ${target.id}`}
                    isEmpty={!placedItem}
                  >
                    {placedItem && (
                      <DraggableItem id={placedItem.id} isPlaced>
                        {placedItem.content}
                      </DraggableItem>
                    )}
                  </DroppableTarget>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress:</span>
            <span className="font-medium text-blue-600">
              {Object.keys(itemTargetMap).length} of {questionData.dragDropItems.length} items placed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(Object.keys(itemTargetMap).length / questionData.dragDropItems.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </DndContext>
  );
};

// Matching Drag Drop for leftItems + rightItems format
const MatchingDragDrop = ({ questionData, answer, onAnswerChange }: { questionData: any; answer: any; onAnswerChange: (answer: any) => void }) => {
  const [itemTargetMap, setItemTargetMap] = useState<Record<string, string>>({});
  const [availableItems, setAvailableItems] = useState<string[]>([]);

  useEffect(() => {
    const leftItems = questionData.leftItems || [];
    
    setAvailableItems(leftItems);
    
    if (answer && typeof answer === 'object') {
      setItemTargetMap(answer);
      const placedItems = Object.keys(answer);
      setAvailableItems(leftItems.filter((item: string) => !placedItems.includes(item)));
    }
  }, [questionData, answer]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemContent = active.id as string;
    const targetContent = over.id as string;

    if (targetContent === 'available-items') {
      // Return to available
      const newMap = { ...itemTargetMap };
      delete newMap[itemContent];
      setItemTargetMap(newMap);
      setAvailableItems(prev => [...prev, itemContent]);
      onAnswerChange(newMap);
    } else {
      // Place in target
      const newMap = { ...itemTargetMap };
      
      // Remove from previous target
      delete newMap[itemContent];
      
      // If target has existing item, return it
      const existingItem = Object.keys(newMap).find(key => newMap[key] === targetContent);
      if (existingItem) {
        delete newMap[existingItem];
        setAvailableItems(prev => [...prev, existingItem]);
      }
      
      newMap[itemContent] = targetContent;
      setItemTargetMap(newMap);
      setAvailableItems(prev => prev.filter(item => item !== itemContent));
      onAnswerChange(newMap);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 p-3 bg-green-50 rounded-lg">
          <Move className="h-4 w-4" />
          <strong>Instructions:</strong> Match items from the left with their correct definitions on the right.
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Items */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Items</h3>
            <Droppable id="available-items">
              <div className="space-y-2 min-h-[100px]">
                {availableItems.map((item) => (
                  <DraggableItem key={item} id={item}>
                    {item}
                  </DraggableItem>
                ))}
                {availableItems.length === 0 && (
                  <div className="text-gray-400 text-sm italic p-4 text-center border-2 border-dashed border-gray-300 rounded">
                    All items matched
                  </div>
                )}
              </div>
            </Droppable>
          </div>

          {/* Target Definitions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Definitions</h3>
            <div className="space-y-3">
              {questionData.rightItems.map((target: string) => {
                const placedItem = Object.keys(itemTargetMap).find(key => itemTargetMap[key] === target);
                
                return (
                  <DroppableTarget
                    key={target}
                    id={target}
                    label={target}
                    isEmpty={!placedItem}
                  >
                    {placedItem && (
                      <DraggableItem id={placedItem} isPlaced>
                        {placedItem}
                      </DraggableItem>
                    )}
                  </DroppableTarget>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};

// Ordering Drag Drop for items format
const OrderingDragDrop = ({ questionData, answer, onAnswerChange }: { questionData: any; answer: any; onAnswerChange: (answer: any) => void }) => {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const originalItems = questionData.items || [];
    if (answer && Array.isArray(answer)) {
      // Restore previous order
      setItems(answer.map((index: number) => originalItems[index]));
    } else {
      setItems(originalItems);
    }
  }, [questionData, answer]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder);
      
      // Convert back to indices for answer
      const originalItems = questionData.items || [];
      const orderIndices = newOrder.map(item => originalItems.indexOf(item));
      onAnswerChange(orderIndices);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 p-3 bg-yellow-50 rounded-lg">
        <ArrowUpDown className="h-4 w-4" />
        <strong>Instructions:</strong> Drag and drop the items to arrange them in the correct order.
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((item, index) => (
              <SortableItem key={item} id={item}>
                <div className="flex items-center p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-move">
                  <GripVertical className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="flex-1 text-gray-900">{item}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Position {index + 1}
                  </span>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const CaseStudyQuestion = ({ question, answers = {}, onAnswerChange }: QuestionComponentProps) => {
  const questionData = question?.question_data;
  
  // Handle different formats from database
  const caseText = questionData?.caseStudyText || questionData?.caseText || '';
  const subQuestions = questionData?.subQuestions || [];

  const handleSubQuestionAnswer = (subQuestionIndex: number, answer: any) => {
    const newAnswers = { ...answers, [subQuestionIndex]: answer };
    onAnswerChange(newAnswers);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(key => {
      const answer = answers[key];
      return answer !== undefined && answer !== '' && 
             (Array.isArray(answer) ? answer.length > 0 : true);
    }).length;
  };

  // If no case text or sub-questions, show error
  if (!caseText && subQuestions.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium mb-2">⚠️ Case Study Configuration Issue:</p>
        <p className="text-red-700 text-sm mb-2">
          This case study question is missing required data.
        </p>
        <div className="text-xs text-red-600 bg-red-100 p-2 rounded mt-2">
          <strong>Expected:</strong> caseStudyText + subQuestions array
          <br />
          <strong>Current data:</strong> {JSON.stringify(questionData, null, 2)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Case Study Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Case Study
        </h3>
        <div className="text-sm text-gray-600">
          Progress: {getAnsweredCount()} / {subQuestions.length}
        </div>
      </div>

      {/* Case Study Text */}
      {caseText && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-3">Background Information</h4>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-justify">
                {caseText}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Questions */}
      {subQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h4 className="font-semibold text-gray-900">
              Questions Based on the Case Study
            </h4>
          </div>
          
          {subQuestions.map((subQ: any, index: number) => {
            const isAnswered = answers[index] !== undefined && answers[index] !== '' && 
                             (Array.isArray(answers[index]) ? answers[index].length > 0 : true);
            
            // Handle different question formats
            const questionText = subQ.questionText || subQ.question || `Question ${index + 1}`;
            const questionType = subQ.questionType || subQ.type || 'single-choice';
            
            // Handle different option formats - same as other components
            let options: string[] = [];
            if (subQ.options) {
              // Format 1: Array of objects with text property
              if (Array.isArray(subQ.options) && subQ.options[0]?.text) {
                options = subQ.options.map((opt: any) => opt.text);
              }
              // Format 2: Simple array of strings
              else if (Array.isArray(subQ.options)) {
                options = subQ.options;
              }
            }
            
            return (
              <div 
                key={index} 
                className={`
                  border rounded-lg p-5 transition-all duration-200
                  ${isAnswered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}
                  hover:shadow-md
                `}
              >
                <div className="flex items-start space-x-3 mb-4">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    ${isAnswered ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                  `}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium leading-relaxed">{questionText}</p>
                    <div className="mt-2">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${questionType === 'single-choice' ? 'bg-blue-100 text-blue-800' :
                          questionType === 'multiple-choice' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {questionType === 'single-choice' ? '🔘 Single Choice' :
                         questionType === 'multiple-choice' ? '☑️ Multiple Choice' :
                         questionType === 'short-answer' ? '✏️ Short Answer' : questionType}
                      </span>
                      {subQ.marks && (
                        <span className="ml-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {subQ.marks} marks
                        </span>
                      )}
                    </div>
                  </div>
                  {isAnswered && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                
                <div className="ml-11">
                  {questionType === 'single-choice' && (
                    <div className="space-y-3">
                      {options?.map((option: string, optIndex: number) => (
                        <label 
                          key={optIndex} 
                          className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                        >
                          <input
                            type="radio"
                            name={`case-study-${question?.id}-${index}`}
                            value={optIndex}
                            checked={answers[index] === optIndex}
                            onChange={() => handleSubQuestionAnswer(index, optIndex)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                          />
                          <span className="text-gray-700 leading-relaxed">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {questionType === 'multiple-choice' && (
                    <div className="space-y-3">
                      {options?.map((option: string, optIndex: number) => (
                        <label 
                          key={optIndex} 
                          className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={Array.isArray(answers[index]) && answers[index].includes(optIndex)}
                            onChange={() => {
                              const currentAnswers = Array.isArray(answers[index]) ? answers[index] : [];
                              const newAnswers = currentAnswers.includes(optIndex)
                                ? currentAnswers.filter((a: number) => a !== optIndex)
                                : [...currentAnswers, optIndex];
                              handleSubQuestionAnswer(index, newAnswers);
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                          />
                          <span className="text-gray-700 leading-relaxed">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {questionType === 'short-answer' && (
                    <div className="space-y-2">
                      <textarea
                        value={answers[index] || ''}
                        onChange={(e) => handleSubQuestionAnswer(index, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter your detailed answer..."
                      />
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          Word count: {(answers[index] || '').trim().split(/\s+/).filter((word: string) => word.length > 0).length}
                        </span>
                        <span className="text-xs">
                          {answers[index] && answers[index].trim() ? '✓ Answered' : 'Not answered'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Questions Answered: {getAnsweredCount()} / {subQuestions.length}
          </span>
          <span className={`font-medium ${getAnsweredCount() === subQuestions.length ? 'text-green-600' : 'text-blue-600'}`}>
            {getAnsweredCount() === subQuestions.length ? 'All Complete' : 'In Progress'}
          </span>
        </div>
        {subQuestions.length > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                getAnsweredCount() === subQuestions.length ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${(getAnsweredCount() / subQuestions.length) * 100}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ShortAnswerQuestion = ({ answer = '', onAnswerChange }: QuestionComponentProps) => {
  const wordCount = answer.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  const charCount = answer.length;
  
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Provide a detailed written answer
      </div>
      
      <div className="relative">
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          placeholder="Enter your detailed answer here. Be specific and provide examples where applicable..."
        />
        
        {/* Character/Word limit indicator */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded shadow-sm">
          {charCount > 0 && `${charCount} chars`}
        </div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <span className="font-medium">{wordCount}</span> words
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{charCount}</span> characters
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          {answer.trim().length > 0 ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Answer provided</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-500">
              <AlertTriangle className="h-4 w-4" />
              <span>No answer yet</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Writing tips */}
      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
        <strong>Writing tips:</strong> Structure your answer clearly, use examples, and proofread before submitting.
      </div>
    </div>
  );
};
