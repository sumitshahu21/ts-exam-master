import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { examService, questionService, type Exam } from '../../services/adminService';

// Schemas for form validation
const examSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  passingScore: z.number().min(0).max(100, 'Passing score must be between 0-100'),
  scheduledStartTime: z.string().optional(),
  scheduledEndTime: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

// Question template for UI management
interface QuestionTemplate {
  id: number;
  questionType: 'single-choice' | 'multiple-choice' | 'drag-drop' | 'case-study' | 'short-answer' | 'code';
  questionText: string;
  marks: number;
  explanation?: string;
  options?: string[];
  correctAnswers?: string[];
  // Drag and Drop specific fields
  dragDropItems?: Array<{ id: string; content: string }>;
  dragDropTargets?: Array<{ id: string; content: string; correctItemId?: string }>;
  // Case Study specific fields
  caseStudyText?: string;
  subQuestions?: SubQuestionTemplate[];
  // For existing questions
  existingQuestionId?: number;
}

interface SubQuestionTemplate {
  id: number;
  questionType: 'single-choice' | 'multiple-choice' | 'short-answer';
  questionText: string;
  marks: number;
  options?: string[];
  correctAnswers?: string[];
}

function EditExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>([]);
  const [nextQuestionId, setNextQuestionId] = useState(1);

  // Calculate total marks from all questions
  const totalMarks = useMemo(() => {
    return questionTemplates.reduce((sum, question) => {
      let questionMarks = 0;
      
      // For case study questions, use ONLY sub-question marks (not main question marks)
      if (question.questionType === 'case-study' && question.subQuestions) {
        questionMarks = question.subQuestions.reduce((subSum, subQ) => subSum + subQ.marks, 0);
      } else {
        // For all other question types, use the main question marks
        questionMarks = question.marks;
      }
      
      return sum + questionMarks;
    }, 0);
  }, [questionTemplates]);

  // Helper function to transform backend question data to frontend template
  const transformBackendQuestionToTemplate = (backendQuestion: any): QuestionTemplate => {
    console.log('🔄 Transforming backend question:', backendQuestion);
    
    const questionData = backendQuestion.question_data || {};
    
    // Extract question text from multiple possible sources
    const questionText = questionData.questionText || 
                        backendQuestion.question_text || 
                        questionData.question_text || 
                        '';
    
    // Extract marks from multiple possible sources  
    const marks = questionData.points || 
                  backendQuestion.marks || 
                  questionData.marks || 
                  5;
    
    const baseTemplate: QuestionTemplate = {
      id: backendQuestion.id,
      existingQuestionId: backendQuestion.id,
      questionType: backendQuestion.question_type,
      questionText: questionText,
      marks: marks,
      explanation: questionData.explanation || '',
    };

    console.log('🔄 Base template created:', baseTemplate);

    // Transform based on question type
    switch (backendQuestion.question_type) {
      case 'single-choice':
      case 'multiple-choice':
        // Handle different option formats
        let options = [];
        if (questionData.options) {
          if (Array.isArray(questionData.options)) {
            options = questionData.options.map((opt: any) => {
              if (typeof opt === 'string') return opt;
              if (opt.text) return opt.text;
              if (opt.option_text) return opt.option_text;
              return String(opt);
            });
          }
        }
        
        // Handle different correct answer formats
        let correctAnswers = [];
        if (questionData.correctAnswers && Array.isArray(questionData.correctAnswers)) {
          correctAnswers = questionData.correctAnswers;
        } else if (questionData.correctAnswer) {
          correctAnswers = [questionData.correctAnswer];
        }

        return {
          ...baseTemplate,
          options: options,
          correctAnswers: correctAnswers
        };

      case 'drag-drop':
        return {
          ...baseTemplate,
          dragDropItems: questionData.dragItems || questionData.dragDropItems || [],
          dragDropTargets: questionData.dropTargets || questionData.dragDropTargets || []
        };

      case 'case-study':
        const subQuestions = (questionData.subQuestions || []).map((subQ: any, index: number) => ({
          id: index + 1,
          questionType: subQ.questionType || 'single-choice',
          questionText: subQ.questionText || '',
          marks: subQ.marks || 5,
          options: subQ.options?.map((opt: any) => opt.text || opt) || [],
          correctAnswers: subQ.correctAnswers || (subQ.correctAnswer ? [subQ.correctAnswer] : [])
        }));

        return {
          ...baseTemplate,
          caseStudyText: questionData.caseStudyContext || questionData.caseStudyText || '',
          subQuestions
        };

      case 'short-answer':
      case 'code':
      default:
        return baseTemplate;
    }
  };

  // Helper function to transform QuestionTemplate to backend format
  const transformQuestionToBackendFormat = (questionTemplate: QuestionTemplate) => {
    const baseQuestion = {
      questionType: questionTemplate.questionType,
      questionText: questionTemplate.questionText, // Add this field that backend expects
      marks: questionTemplate.marks,
      explanation: questionTemplate.explanation || '',
    };

    // Create the question_data JSON based on question type
    let questionData: any = {
      questionText: questionTemplate.questionText,
      points: questionTemplate.marks,
      explanation: questionTemplate.explanation || '',
    };

    switch (questionTemplate.questionType) {
      case 'single-choice':
        questionData.options = (questionTemplate.options || [])
          .filter(opt => opt.trim() !== '')
          .map((opt, index) => {
            const optionId = `opt${index + 1}`;
            return {
              id: optionId,
              text: opt,
              isCorrect: questionTemplate.correctAnswers?.includes(optionId) || false
            };
          });
        questionData.correctAnswers = questionTemplate.correctAnswers || [];
        break;

      case 'multiple-choice':
        questionData.options = (questionTemplate.options || [])
          .filter(opt => opt.trim() !== '')
          .map((opt, index) => {
            const optionId = `opt${index + 1}`;
            return {
              id: optionId,
              text: opt,
              isCorrect: questionTemplate.correctAnswers?.includes(optionId) || false
            };
          });
        questionData.correctAnswers = questionTemplate.correctAnswers || [];
        break;

      case 'drag-drop':
        questionData.subType = 'matching';
        questionData.dragItems = questionTemplate.dragDropItems || [];
        questionData.dropTargets = questionTemplate.dragDropTargets || [];
        questionData.correctMappings = {};
        (questionTemplate.dragDropTargets || []).forEach(target => {
          if (target.correctItemId) {
            questionData.correctMappings[target.correctItemId] = target.id;
          }
        });
        break;

      case 'case-study':
        questionData.caseStudyContext = questionTemplate.caseStudyText || '';
        questionData.subQuestions = (questionTemplate.subQuestions || []).map(subQ => ({
          questionType: subQ.questionType,
          questionText: subQ.questionText,
          marks: subQ.marks,
          options: (subQ.options || [])
            .filter(opt => opt.trim() !== '')
            .map((opt, index) => {
              const optionId = `opt${index + 1}`;
              return {
                id: optionId,
                text: opt,
                isCorrect: subQ.correctAnswers?.includes(optionId) || false
              };
            }),
          correctAnswers: subQ.correctAnswers || []
        }));
        break;

      case 'short-answer':
        questionData.maxLength = 500;
        questionData.minLength = 10;
        break;

      case 'code':
        questionData.programmingLanguage = 'javascript';
        questionData.codeTemplate = '';
        break;
    }

    return {
      ...baseQuestion,
      questionData
    };
  };

  // Forms
  const examForm = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      subject: '',
      description: '',
      duration: 60,
      passingScore: 70,
      scheduledStartTime: '',
      scheduledEndTime: '',
    },
  });

  // Load exam data and questions on component mount
  useEffect(() => {
    if (examId) {
      loadExamData();
    }
  }, [examId]);

  const loadExamData = async () => {
    if (!examId) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Loading exam data for ID: ${examId}`);

      // Load exam details
      const examResponse = await examService.getExamById(parseInt(examId));
      console.log('📋 Exam response:', examResponse);
      
      if (!examResponse.success) {
        throw new Error(examResponse.message || 'Failed to load exam details');
      }

      const exam: Exam = examResponse.data;
      console.log('📋 Exam data:', exam);

      // Populate form with exam data
      examForm.reset({
        title: exam.title || '',
        subject: exam.subject || '',
        description: exam.description || '',
        duration: exam.duration || 60,
        passingScore: exam.passing_score || 70,
        scheduledStartTime: exam.scheduled_start_time ? 
          new Date(exam.scheduled_start_time).toISOString().slice(0, 16) : '',
        scheduledEndTime: exam.scheduled_end_time ? 
          new Date(exam.scheduled_end_time).toISOString().slice(0, 16) : '',
      });

      console.log('✅ Exam form populated successfully');

      // Load questions
      console.log(`🔍 Loading questions for exam ${examId}`);
      const questionsResponse = await questionService.getQuestionsByExam(parseInt(examId));
      console.log('📋 Questions response:', questionsResponse);
      
      if (questionsResponse.success) {
        console.log('📋 Raw questions data:', questionsResponse.data);
        const transformedQuestions = questionsResponse.data.map((q: any, index: number) => {
          console.log(`🔄 Transforming question ${index + 1}:`, q);
          const transformed = transformBackendQuestionToTemplate(q);
          console.log(`✅ Transformed question ${index + 1}:`, transformed);
          return transformed;
        });
        
        console.log('✅ All questions transformed:', transformedQuestions);
        setQuestionTemplates(transformedQuestions);
        setNextQuestionId((transformedQuestions.length || 0) + 1);
      } else {
        console.warn('⚠️ Questions loading failed:', questionsResponse.message);
        // Even if questions fail to load, we can still edit the exam
        setQuestionTemplates([]);
        toast.error('Failed to load questions, but you can still edit the exam details');
      }

      console.log('✅ Exam data loaded successfully');

    } catch (error: any) {
      console.error('❌ Error loading exam data:', error);
      console.error('❌ Error stack:', error.stack);
      setError(error.message || 'Failed to load exam data');
      toast.error(`Failed to load exam data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Question management handlers
  const handleAddQuestion = () => {
    const newQuestion: QuestionTemplate = {
      id: nextQuestionId,
      questionType: 'single-choice',
      questionText: '',
      marks: 5,
      explanation: '',
      options: ['', '', '', ''],
      correctAnswers: [],
    };
    setQuestionTemplates(prev => [...prev, newQuestion]);
    setNextQuestionId(prev => prev + 1);
  };

  const handleRemoveQuestion = (questionId: number) => {
    if (questionTemplates.length > 1) {
      setQuestionTemplates(prev => prev.filter(q => q.id !== questionId));
      toast.success('Question removed successfully!');
    }
  };

  const handleQuestionTypeChange = (questionId: number, newType: QuestionTemplate['questionType']) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            questionType: newType, 
            options: newType === 'single-choice' || newType === 'multiple-choice' ? ['', '', '', ''] : [],
            dragDropItems: newType === 'drag-drop' ? [{ id: 'item-1', content: '' }] : undefined,
            dragDropTargets: newType === 'drag-drop' ? [{ id: 'target-1', content: '' }] : undefined,
            caseStudyText: newType === 'case-study' ? '' : undefined,
            subQuestions: newType === 'case-study' ? [] : undefined,
          }
        : q
    ));
  };

  const updateQuestionField = (questionId: number, field: string, value: any) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  // Drag and Drop handlers
  const handleAddDragItem = (questionId: number) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            dragDropItems: [
              ...(q.dragDropItems || []), 
              { 
                id: `item-${(q.dragDropItems?.length || 0) + 1}`, 
                content: '' 
              }
            ]
          }
        : q
    ));
  };

  const handleRemoveDragItem = (questionId: number, itemId: string) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            dragDropItems: q.dragDropItems?.filter(item => item.id !== itemId).map((item, index) => ({
              ...item,
              id: `item-${index + 1}`
            })),
            // Also remove this item from any target's correctItemId and update references
            dragDropTargets: q.dragDropTargets?.map(target => ({
              ...target,
              correctItemId: target.correctItemId === itemId ? undefined : 
                target.correctItemId?.startsWith('item-') ? 
                  `item-${(q.dragDropItems?.findIndex(item => item.id === target.correctItemId) || 0) + 1}` : 
                  target.correctItemId
            }))
          }
        : q
    ));
  };

  const handleAddDropTarget = (questionId: number) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            dragDropTargets: [
              ...(q.dragDropTargets || []), 
              { 
                id: `target-${(q.dragDropTargets?.length || 0) + 1}`, 
                content: '' 
              }
            ]
          }
        : q
    ));
  };

  const handleRemoveDropTarget = (questionId: number, targetId: string) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            dragDropTargets: q.dragDropTargets?.filter(target => target.id !== targetId).map((target, index) => ({
              ...target,
              id: `target-${index + 1}`
            }))
          }
        : q
    ));
  };

  const handleDragDropItemChange = (questionId: number, itemId: string, content: string) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            dragDropItems: q.dragDropItems?.map(item => 
              item.id === itemId ? { ...item, content } : item
            )
          }
        : q
    ));
  };

  const handleDragDropTargetChange = (questionId: number, targetId: string, field: string, value: string) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            dragDropTargets: q.dragDropTargets?.map(target => 
              target.id === targetId ? { ...target, [field]: value } : target
            )
          }
        : q
    ));
  };

  // Case Study handlers
  const handleAddSubQuestion = (questionId: number) => {
    const newSubQuestion: SubQuestionTemplate = {
      id: Date.now(), // Use timestamp for unique ID
      questionType: 'single-choice',
      questionText: '',
      marks: 2,
      options: ['', '', '', ''],
      correctAnswers: [],
    };
    
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, subQuestions: [...(q.subQuestions || []), newSubQuestion] }
        : q
    ));
  };

  const handleRemoveSubQuestion = (questionId: number, subQuestionId: number) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, subQuestions: q.subQuestions?.filter(sq => sq.id !== subQuestionId) }
        : q
    ));
  };

  const handleSubQuestionChange = (questionId: number, subQuestionId: number, field: keyof SubQuestionTemplate, value: any) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            subQuestions: q.subQuestions?.map(sq => 
              sq.id === subQuestionId ? { ...sq, [field]: value } : sq
            )
          }
        : q
    ));
  };

  const handleSubQuestionTypeChange = (questionId: number, subQuestionId: number, newType: SubQuestionTemplate['questionType']) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            subQuestions: q.subQuestions?.map(sq => 
              sq.id === subQuestionId 
                ? { 
                    ...sq, 
                    questionType: newType,
                    options: newType === 'single-choice' || newType === 'multiple-choice' ? ['', '', '', ''] : [],
                    correctAnswers: []
                  } 
                : sq
            )
          }
        : q
    ));
  };

  // Option management handlers
  const handleAddOption = (questionId: number, isSubQuestion: boolean = false, subQuestionId?: number) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? isSubQuestion && subQuestionId
          ? { 
              ...q, 
              subQuestions: q.subQuestions?.map(sq => 
                sq.id === subQuestionId 
                  ? { ...sq, options: [...(sq.options || []), ''] }
                  : sq
              )
            }
          : { ...q, options: [...(q.options || []), ''] }
        : q
    ));
  };

  const handleRemoveOption = (questionId: number, optionIndex: number, isSubQuestion: boolean = false, subQuestionId?: number) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId 
        ? isSubQuestion && subQuestionId
          ? { 
              ...q, 
              subQuestions: q.subQuestions?.map(sq => 
                sq.id === subQuestionId 
                  ? { 
                      ...sq, 
                      options: sq.options?.filter((_, idx) => idx !== optionIndex),
                      correctAnswers: sq.correctAnswers?.filter(ans => ans !== `opt${optionIndex + 1}`)
                        .map(ans => {
                          const optNum = parseInt(ans.replace('opt', ''));
                          return optNum > optionIndex + 1 ? `opt${optNum - 1}` : ans;
                        })
                    }
                  : sq
              )
            }
          : { 
              ...q, 
              options: q.options?.filter((_, idx) => idx !== optionIndex),
              correctAnswers: q.correctAnswers?.filter(ans => ans !== `opt${optionIndex + 1}`)
                .map(ans => {
                  const optNum = parseInt(ans.replace('opt', ''));
                  return optNum > optionIndex + 1 ? `opt${optNum - 1}` : ans;
                })
            }
        : q
    ));
  };

  const handleSaveChanges = async (data: ExamFormData) => {
    if (!examId) return;

    try {
      setSaving(true);

      // Update exam details
      await examService.updateExam(parseInt(examId), {
        title: data.title,
        subject: data.subject,
        description: data.description,
        duration: data.duration,
        totalMarks: totalMarks,
        passingScore: data.passingScore,
        scheduledStartTime: data.scheduledStartTime || undefined,
        scheduledEndTime: data.scheduledEndTime || undefined,
      });

      // Update questions
      for (const questionTemplate of questionTemplates) {
        const transformedQuestion = transformQuestionToBackendFormat(questionTemplate);
        
        if (questionTemplate.existingQuestionId) {
          // Update existing question
          await questionService.updateQuestion(questionTemplate.existingQuestionId, transformedQuestion);
        } else {
          // Create new question
          await questionService.createQuestion({
            examId: parseInt(examId),
            ...transformedQuestion
          });
        }
      }

      toast.success('Exam and questions updated successfully!');
      navigate('/admin/exams');

    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-red-800">Error Loading Exam</h3>
            </div>
            <div className="mt-2">
              <p className="text-red-700">{error}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={loadExamData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/admin/exams')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Exams
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/exams')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Manage Exams"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Exam</h1>
              <p className="text-gray-600">Update exam details and questions</p>
            </div>
          </div>
        </div>

        <form onSubmit={examForm.handleSubmit(handleSaveChanges)} className="space-y-8">
          {/* Exam Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Exam Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...examForm.register('title')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter exam title"
                />
                {examForm.formState.errors.title && (
                  <p className="mt-1 text-sm text-red-600">{examForm.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...examForm.register('subject')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subject"
                />
                {examForm.formState.errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{examForm.formState.errors.subject.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...examForm.register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter exam description (optional)"
                />
                {examForm.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">{examForm.formState.errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...examForm.register('duration', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="60"
                />
                {examForm.formState.errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{examForm.formState.errors.duration.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Score (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...examForm.register('passingScore', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="70"
                  min="0"
                  max="100"
                />
                {examForm.formState.errors.passingScore && (
                  <p className="mt-1 text-sm text-red-600">{examForm.formState.errors.passingScore.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Start Time
                </label>
                <input
                  type="datetime-local"
                  {...examForm.register('scheduledStartTime')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled End Time
                </label>
                <input
                  type="datetime-local"
                  {...examForm.register('scheduledEndTime')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>
                    <strong>Total Questions:</strong> {questionTemplates.length}
                  </span>
                  <span className="text-blue-700">
                    <strong>Total Marks:</strong> {totalMarks}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questionTemplates.map((template, index) => (
                <div key={template.id} className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Question {index + 1}
                        {template.existingQuestionId && (
                          <span className="ml-2 text-sm text-gray-500">(ID: {template.existingQuestionId})</span>
                        )}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Question
                        </button>
                        {questionTemplates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(template.id)}
                            className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove Question
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Type
                        </label>
                        <select
                          value={template.questionType}
                          onChange={(e) => handleQuestionTypeChange(template.id, e.target.value as QuestionTemplate['questionType'])}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="single-choice">Single Choice</option>
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="drag-drop">Drag & Drop</option>
                          <option value="case-study">Case Study</option>
                          <option value="short-answer">Short Answer</option>
                          <option value="code">Code Question</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Marks
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={template.marks}
                          onChange={(e) => updateQuestionField(template.id, 'marks', parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <textarea
                        value={template.questionText}
                        onChange={(e) => updateQuestionField(template.id, 'questionText', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your question here..."
                      />
                    </div>

                    {/* Options for Single/Multiple Choice */}
                    {(template.questionType === 'single-choice' || template.questionType === 'multiple-choice') && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddOption(template.id)}
                              className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Option
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {template.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <input
                                type={template.questionType === 'single-choice' ? 'radio' : 'checkbox'}
                                name={`correct-${template.id}`}
                                checked={template.correctAnswers?.includes(`opt${optIndex + 1}`) || false}
                                onChange={(e) => {
                                  const optionId = `opt${optIndex + 1}`;
                                  let newCorrectAnswers = template.correctAnswers || [];
                                  
                                  if (template.questionType === 'single-choice') {
                                    newCorrectAnswers = e.target.checked ? [optionId] : [];
                                  } else {
                                    if (e.target.checked) {
                                      newCorrectAnswers = [...newCorrectAnswers, optionId];
                                    } else {
                                      newCorrectAnswers = newCorrectAnswers.filter(id => id !== optionId);
                                    }
                                  }
                                  
                                  updateQuestionField(template.id, 'correctAnswers', newCorrectAnswers);
                                }}
                                className="w-4 h-4"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(template.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  updateQuestionField(template.id, 'options', newOptions);
                                }}
                                placeholder={`Option ${optIndex + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {(template.options?.length || 0) > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(template.id, optIndex)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drag and Drop Configuration */}
                    {template.questionType === 'drag-drop' && (
                      <div className="mb-4 space-y-4">
                        {/* Draggable Items */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Draggable Items *
                              <span className="text-xs text-gray-500 font-normal ml-1">(text required)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddDragItem(template.id)}
                              className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Item
                            </button>
                          </div>
                          <div className="space-y-2">
                            {template.dragDropItems?.map((item, index) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 w-16 text-center">Item {index + 1}</span>
                                <div className="flex-1 relative">
                                  <input
                                    type="text"
                                    value={item.content}
                                    onChange={(e) => handleDragDropItemChange(template.id, item.id, e.target.value)}
                                    placeholder={`Enter text for Item ${index + 1} (required)`}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      !item.content.trim() 
                                        ? 'border-red-300 bg-red-50 placeholder-red-400' 
                                        : 'border-gray-300'
                                    }`}
                                  />
                                  {!item.content.trim() && (
                                    <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Required
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {(template.dragDropItems?.length || 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDragItem(template.id, item.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Drop Targets */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Drop Targets
                              <span className="text-xs text-gray-500 font-normal ml-1">(labels optional)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddDropTarget(template.id)}
                              className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Target
                            </button>
                          </div>
                          <div className="space-y-2">
                            {template.dragDropTargets?.map((target, index) => (
                              <div key={target.id} className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 w-16 text-center">Target {index + 1}</span>
                                <input
                                  type="text"
                                  value={target.content}
                                  onChange={(e) => handleDragDropTargetChange(template.id, target.id, 'content', e.target.value)}
                                  placeholder={`Optional label for Target ${index + 1}`}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                  value={target.correctItemId || ''}
                                  onChange={(e) => handleDragDropTargetChange(template.id, target.id, 'correctItemId', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select correct item</option>
                                  {template.dragDropItems?.map((item, itemIndex) => (
                                    <option key={item.id} value={item.id}>
                                      Item {itemIndex + 1}: {item.content || `Item ${itemIndex + 1}`}
                                    </option>
                                  ))}
                                </select>
                                {(template.dragDropTargets?.length || 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDropTarget(template.id, target.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Case Study Configuration */}
                    {template.questionType === 'case-study' && (
                      <div className="mb-4 space-y-4">
                        {/* Case Study Text */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Case Study Text *
                          </label>
                          <textarea
                            value={template.caseStudyText || ''}
                            onChange={(e) => updateQuestionField(template.id, 'caseStudyText', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter the case study scenario or context here..."
                          />
                        </div>

                        {/* Sub-questions */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Sub-questions
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddSubQuestion(template.id)}
                              className="inline-flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Sub-question
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            {template.subQuestions?.map((subQuestion, subIndex) => (
                              <div key={subQuestion.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-gray-700">
                                    Sub-question {subIndex + 1}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSubQuestion(template.id, subQuestion.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Type
                                    </label>
                                    <select
                                      value={subQuestion.questionType}
                                      onChange={(e) => handleSubQuestionTypeChange(template.id, subQuestion.id, e.target.value as SubQuestionTemplate['questionType'])}
                                      className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    >
                                      <option value="single-choice">Single Choice</option>
                                      <option value="multiple-choice">Multiple Choice</option>
                                      <option value="short-answer">Short Answer</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Marks
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={subQuestion.marks}
                                      onChange={(e) => handleSubQuestionChange(template.id, subQuestion.id, 'marks', parseInt(e.target.value) || 2)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Question Text
                                  </label>
                                  <textarea
                                    value={subQuestion.questionText}
                                    onChange={(e) => handleSubQuestionChange(template.id, subQuestion.id, 'questionText', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    placeholder="Enter sub-question text..."
                                  />
                                </div>

                                {/* Sub-question Options */}
                                {(subQuestion.questionType === 'single-choice' || subQuestion.questionType === 'multiple-choice') && (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <label className="block text-xs font-medium text-gray-700">
                                        Options
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => handleAddOption(template.id, true, subQuestion.id)}
                                        className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Option
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      {subQuestion.options?.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-2">
                                          <input
                                            type={subQuestion.questionType === 'single-choice' ? 'radio' : 'checkbox'}
                                            name={`subcorrect-${template.id}-${subQuestion.id}`}
                                            checked={subQuestion.correctAnswers?.includes(`opt${optIndex + 1}`) || false}
                                            onChange={(e) => {
                                              const optionId = `opt${optIndex + 1}`;
                                              let newCorrectAnswers = subQuestion.correctAnswers || [];
                                              
                                              if (subQuestion.questionType === 'single-choice') {
                                                newCorrectAnswers = e.target.checked ? [optionId] : [];
                                              } else {
                                                if (e.target.checked) {
                                                  newCorrectAnswers = [...newCorrectAnswers, optionId];
                                                } else {
                                                  newCorrectAnswers = newCorrectAnswers.filter(id => id !== optionId);
                                                }
                                              }
                                              
                                              handleSubQuestionChange(template.id, subQuestion.id, 'correctAnswers', newCorrectAnswers);
                                            }}
                                            className="w-3 h-3"
                                          />
                                          <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => {
                                              const newOptions = [...(subQuestion.options || [])];
                                              newOptions[optIndex] = e.target.value;
                                              handleSubQuestionChange(template.id, subQuestion.id, 'options', newOptions);
                                            }}
                                            placeholder={`Option ${optIndex + 1}`}
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                          />
                                          {(subQuestion.options?.length || 0) > 2 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveOption(template.id, optIndex, true, subQuestion.id)}
                                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explanation (Optional)
                      </label>
                      <textarea
                        value={template.explanation || ''}
                        onChange={(e) => updateQuestionField(template.id, 'explanation', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Provide an explanation for the answer..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/admin/exams')}
              className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditExam;
