import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  CheckCircle,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { useExams, useQuestions, useExamDetails } from '../../hooks/useAdmin';
import { toast } from 'react-hot-toast';

// Schemas for form validation
const examSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  totalQuestions: z.number().min(1, 'Must have at least 1 question'),
  passingScore: z.number().min(0).max(100, 'Passing score must be between 0-100'),
  isPublished: z.boolean().default(false),
  scheduledStartTime: z.string().optional(),
  scheduledEndTime: z.string().optional(),
});

const questionSchema = z.object({
  questionType: z.enum(['single-choice', 'multiple-choice', 'drag-drop', 'case-study', 'short-answer', 'code']),
  questionText: z.string().min(1, 'Question text is required'),
  marks: z.number().min(1, 'Marks must be at least 1'),
  explanation: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctAnswers: z.array(z.string()).optional(),
  dragItems: z.array(z.string()).optional(),
  dropTargets: z.array(z.string()).optional(),
  dragDropMappings: z.record(z.string()).optional(),
  caseStudyText: z.string().optional(),
  subQuestions: z.array(z.object({
    questionText: z.string(),
    questionType: z.enum(['single-choice', 'multiple-choice', 'short-answer']),
    marks: z.number(),
    options: z.array(z.string()).optional(),
    correctAnswers: z.array(z.string()).optional(),
  })).optional(),
  programmingLanguage: z.string().optional(),
  codeTemplate: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;
type QuestionFormData = z.infer<typeof questionSchema>;

// Temporary Question interface for in-memory storage
interface TempQuestion {
  tempId: number;
  questionType: string;
  questionText: string;
  points: number;
  explanation?: string;
  questionData: any;
  orderIndex: number;
}

function ExamCreator() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const isEditing = !!examId;
  
  // State management
  const [currentStep, setCurrentStep] = useState<'exam' | 'questions'>('exam');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  
  // Temporary data states (not saved to DB until publish/draft)
  const [tempExamData, setTempExamData] = useState<ExamFormData | null>(null);
  const [tempQuestions, setTempQuestions] = useState<TempQuestion[]>([]);
  const [nextQuestionId, setNextQuestionId] = useState(1);
  
  // Question-specific states
  const [dragItems, setDragItems] = useState<string[]>(['', '']);
  const [dropTargets, setDropTargets] = useState<string[]>(['', '']);
  const [dragDropMappings, setDragDropMappings] = useState<Record<string, string>>({});
  const [caseStudySubQuestions, setCaseStudySubQuestions] = useState<any[]>([]);

  // Hooks
  const { createExam, updateExam } = useExams();
  const { exam, loading: examLoading } = useExamDetails(examId ? parseInt(examId) : undefined);
  const { 
    questions = [],
    loading: questionsLoading, 
    createQuestion, 
    updateQuestion, 
    deleteQuestion 
  } = useQuestions(examId ? parseInt(examId) : undefined);

  // Forms
  const examForm = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      subject: '',
      description: '',
      duration: 60,
      totalQuestions: 5,
      passingScore: 70,
      isPublished: false,
      scheduledStartTime: '',
      scheduledEndTime: '',
    },
  });

  const questionForm = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      questionType: 'single-choice',
      questionText: '',
      marks: 5,
      explanation: '',
      options: ['', ''],
      correctAnswers: [],
      dragItems: [],
      dropTargets: [],
      dragDropMappings: {},
      caseStudyText: '',
      subQuestions: [],
      programmingLanguage: 'javascript',
      codeTemplate: '',
    },
  });

  // Load existing exam data if editing
  useEffect(() => {
    if (isEditing && exam && !examLoading) {
      examForm.reset({
        title: exam.title,
        subject: exam.subject,
        description: exam.description || '',
        duration: exam.duration,
        totalQuestions: exam.total_questions,
        passingScore: exam.passing_score,
        isPublished: exam.is_published,
        scheduledStartTime: exam.scheduled_start_time ? format(new Date(exam.scheduled_start_time), "yyyy-MM-dd'T'HH:mm") : '',
        scheduledEndTime: exam.scheduled_end_time ? format(new Date(exam.scheduled_end_time), "yyyy-MM-dd'T'HH:mm") : '',
      });
    }
  }, [exam, examForm, isEditing, examLoading]);

  // Handle exam form submission - store temporarily, don't save to DB yet
  const handleExamNext = (data: ExamFormData) => {
    if (isEditing) {
      // For editing existing exam, we can continue with current behavior
      setCurrentStep('questions');
    } else {
      // For new exam, store data temporarily - don't save to DB yet
      setTempExamData(data);
      toast.success('Exam details saved temporarily. Add questions and then click "Publish" or "Save as Draft" to finalize.');
      setCurrentStep('questions');
    }
  };

  // Transform question data based on type - matching backend API format
  const transformQuestionData = (data: QuestionFormData) => {
    switch (data.questionType) {
      case 'single-choice':
        return {
          options: data.options?.map((opt, index) => ({
            id: `opt${index + 1}`,
            text: opt,
            isCorrect: data.correctAnswers?.includes(`opt${index + 1}`) || false
          })) || [],
          correctAnswer: data.correctAnswers?.[0] || '',
          randomizeOptions: false
        };
      
      case 'multiple-choice':
        return {
          options: data.options?.map((opt, index) => ({
            id: `opt${index + 1}`,
            text: opt,
            isCorrect: data.correctAnswers?.includes(`opt${index + 1}`) || false
          })) || [],
          correctAnswers: data.correctAnswers || [],
          minSelections: 1,
          maxSelections: data.options?.length || 4,
          partialCredit: true
        };
      
      case 'drag-drop':
        return {
          subType: 'matching',
          dragItems: dragItems.map((item, index) => ({
            id: `item${index + 1}`,
            content: item,
            type: 'text'
          })),
          dropTargets: dropTargets.map((target, index) => ({
            id: `target${index + 1}`,
            label: target,
            correctItemId: dragDropMappings[`target${index + 1}`] || '',
            acceptsMultiple: false
          })),
          correctMappings: dragDropMappings,
          allowPartialCredit: true
        };
      
      case 'case-study':
        return {
          caseText: data.caseStudyText || '',
          subQuestions: caseStudySubQuestions.map((subQ, index) => ({
            id: `sub${index + 1}`,
            questionText: subQ.questionText,
            type: subQ.questionType,
            marks: subQ.marks,
            options: subQ.options?.map((opt: string, optIndex: number) => ({
              id: `opt${optIndex + 1}`,
              text: opt,
              isCorrect: subQ.correctAnswers?.includes(`opt${optIndex + 1}`) || false
            })) || []
          }))
        };
      
      case 'short-answer':
        return {
          maxWords: 100,
          minWords: 10,
          keyWords: [],
          sampleAnswer: '',
          gradingCriteria: []
        };
      
      case 'code':
        return {
          programmingLanguage: data.programmingLanguage || 'javascript',
          codeTemplate: data.codeTemplate || '',
          testCases: [],
          expectedOutput: '',
          timeLimit: 30
        };
      
      default:
        return {};
    }
  };

  // Handle question form submission - store temporarily, don't save to DB yet
  const handleQuestionSubmit = (data: QuestionFormData) => {
    try {
      // Merge form data with component-specific data
      const mergedData = {
        ...data,
        dragItems: dragItems.filter(item => item.trim()),
        dropTargets: dropTargets.filter(target => target.trim()),
        dragDropMappings,
        subQuestions: caseStudySubQuestions,
      };
      
      // Transform data for temporary storage
      const questionData = transformQuestionData(mergedData);
      
      if (editingQuestionId) {
        // Update existing temporary question
        setTempQuestions(prev => prev.map(q => 
          q.tempId === editingQuestionId 
            ? {
                ...q,
                questionType: data.questionType,
                questionText: data.questionText,
                points: data.marks,
                explanation: data.explanation,
                questionData,
              }
            : q
        ));
        toast.success('Question updated successfully!');
      } else {
        // Add new temporary question
        const newQuestion: TempQuestion = {
          tempId: nextQuestionId,
          questionType: data.questionType,
          questionText: data.questionText,
          points: data.marks,
          explanation: data.explanation,
          questionData,
          orderIndex: tempQuestions.length + 1,
        };
        
        setTempQuestions(prev => [...prev, newQuestion]);
        setNextQuestionId(prev => prev + 1);
        toast.success('Question added successfully!');
      }
      
      // Reset form and close
      questionForm.reset();
      setShowQuestionForm(false);
      setEditingQuestionId(null);
      // Reset component-specific states
      setDragItems(['', '']);
      setDropTargets(['', '']);
      setDragDropMappings({});
      setCaseStudySubQuestions([]);
      
    } catch (error) {
      console.error('Error adding question:', error);
      toast.error('Failed to add question');
    }
  };

  // Helper function to save all questions to database
  const saveAllQuestionsToDatabase = async (examId: number) => {
    for (const question of tempQuestions) {
      await createQuestion({
        examId,
        questionType: question.questionType,
        questionText: question.questionText,
        points: question.points,
        explanation: question.explanation,
        questionData: question.questionData,
      });
    }
  };

  // Handle final exam publishing
  const handlePublishExam = async () => {
    try {
      if (isEditing && examId) {
        // For existing exam, update and publish
        await updateExam(parseInt(examId), {
          title: exam?.title || '',
          subject: exam?.subject || '',
          description: exam?.description || '',
          duration: exam?.duration || 60,
          totalQuestions: exam?.total_questions || 0,
          passingScore: exam?.passing_score || 70,
          scheduledStartTime: exam?.scheduled_start_time,
          scheduledEndTime: exam?.scheduled_end_time,
          isPublished: true,
        });
        toast.success('Exam published successfully!');
      } else if (tempExamData) {
        // For new exam, create and publish with all questions
        const newExamId = await createExam({
          title: tempExamData.title,
          subject: tempExamData.subject,
          description: tempExamData.description,
          duration: tempExamData.duration,
          totalQuestions: tempQuestions.length, // Use actual question count
          passingScore: tempExamData.passingScore,
          scheduledStartTime: tempExamData.scheduledStartTime || undefined,
          scheduledEndTime: tempExamData.scheduledEndTime || undefined,
          isPublished: true,
        });
        
        if (newExamId) {
          // Now save all questions to the database
          await saveAllQuestionsToDatabase(newExamId);
          
          toast.success('Exam created and published successfully!');
          // Clear temporary data
          setTempExamData(null);
          setTempQuestions([]);
        }
      } else {
        toast.error('No exam data to publish');
        return;
      }
      
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Failed to publish exam');
    }
  };

  // Handle saving as draft
  const handleSaveAsDraft = async () => {
    try {
      if (isEditing && examId) {
        // For existing exam, update as draft
        await updateExam(parseInt(examId), {
          title: exam?.title || '',
          subject: exam?.subject || '',
          description: exam?.description || '',
          duration: exam?.duration || 60,
          totalQuestions: exam?.total_questions || 0,
          passingScore: exam?.passing_score || 70,
          scheduledStartTime: exam?.scheduled_start_time,
          scheduledEndTime: exam?.scheduled_end_time,
          isPublished: false,
        });
        toast.success('Exam saved as draft');
      } else if (tempExamData) {
        // For new exam, create as draft with all questions
        const newExamId = await createExam({
          title: tempExamData.title,
          subject: tempExamData.subject,
          description: tempExamData.description,
          duration: tempExamData.duration,
          totalQuestions: tempQuestions.length, // Use actual question count
          passingScore: tempExamData.passingScore,
          scheduledStartTime: tempExamData.scheduledStartTime || undefined,
          scheduledEndTime: tempExamData.scheduledEndTime || undefined,
          isPublished: false,
        });
        
        if (newExamId) {
          // Now save all questions to the database
          await saveAllQuestionsToDatabase(newExamId);
          
          toast.success('Exam created and saved as draft!');
          // Clear temporary data
          setTempExamData(null);
          setTempQuestions([]);
        }
      } else {
        toast.error('No exam data to save');
        return;
      }
      
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  // Handle editing temporary question
  const handleEditTempQuestion = (tempId: number) => {
    const question = tempQuestions.find(q => q.tempId === tempId);
    if (question) {
      setEditingQuestionId(tempId);
      
      // Populate form with question data
      questionForm.reset({
        questionType: question.questionType as any,
        questionText: question.questionText,
        marks: question.points,
        explanation: question.explanation,
      });
      
      // Populate component-specific data
      if (question.questionData?.dragItems) {
        setDragItems(question.questionData.dragItems.map((item: any) => item.content));
      }
      if (question.questionData?.dropTargets) {
        setDropTargets(question.questionData.dropTargets.map((target: any) => target.label));
      }
      if (question.questionData?.correctMappings) {
        setDragDropMappings(question.questionData.correctMappings);
      }
      if (question.questionData?.subQuestions) {
        setCaseStudySubQuestions(question.questionData.subQuestions);
      }
      
      setShowQuestionForm(true);
    }
  };

  // Handle deleting temporary question
  const handleDeleteTempQuestion = (tempId: number) => {
    setTempQuestions(prev => prev.filter(q => q.tempId !== tempId));
    toast.success('Question deleted successfully!');
  };

  // Get questions to display (temp questions or database questions)
  const questionsToShow = isEditing ? questions : tempQuestions.map(q => ({
    id: q.tempId,
    question_text: q.questionText,
    question_type: q.questionType,
    marks: q.points,
    explanation: q.explanation,
    order_index: q.orderIndex,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentStep === 'questions' ? 'Question Page' : (isEditing ? 'Edit Exam' : 'Create New Exam')}
            </h1>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              currentStep === 'exam' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Exam Details
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              currentStep === 'questions' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Questions
            </div>
          </div>
        </div>

        {/* Exam Details Step */}
        {currentStep === 'exam' && (
          <div className="bg-white rounded-lg shadow">
            <form onSubmit={examForm.handleSubmit(handleExamNext)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    {...examForm.register('title')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter exam title"
                  />
                  {examForm.formState.errors.title && (
                    <p className="text-red-500 text-sm mt-1">{examForm.formState.errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    {...examForm.register('subject')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter subject"
                  />
                  {examForm.formState.errors.subject && (
                    <p className="text-red-500 text-sm mt-1">{examForm.formState.errors.subject.message}</p>
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
                    placeholder="Enter exam description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    {...examForm.register('duration', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="60"
                  />
                  {examForm.formState.errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{examForm.formState.errors.duration.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score (%) *
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
                    <p className="text-red-500 text-sm mt-1">{examForm.formState.errors.passingScore.message}</p>
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

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Next: Add Questions
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions Step */}
        {currentStep === 'questions' && (tempExamData || isEditing) && (
          <div className="space-y-6">
            {/* Questions Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Exam Questions</h2>
                  <p className="text-gray-600">Manage questions for: {exam?.title || tempExamData?.title}</p>
                  {tempExamData && !examId && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Exam not saved yet - Click "Publish" or "Save as Draft" to finalize
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAsDraft}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </button>
                  <button
                    onClick={handlePublishExam}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Publish
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total Questions: {questionsToShow.length}
                </div>
                <button
                  onClick={() => setShowQuestionForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {questionsToShow.map((question, index) => (
                <div key={question.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Q{index + 1}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                          {question.question_type}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          {question.marks} pts
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {question.question_text}
                      </h3>
                      {question.explanation && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => isEditing ? 
                          setEditingQuestionId(question.id) : 
                          handleEditTempQuestion(question.id)
                        }
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                        title="Edit Question"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => isEditing ? 
                          deleteQuestion(question.id) : 
                          handleDeleteTempQuestion(question.id)
                        }
                        className="p-2 text-red-500 hover:bg-red-100 rounded-md"
                        title="Delete Question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {questionsToShow.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No questions added yet</h3>
                  <p className="text-gray-600 mb-4">Start building your exam by adding your first question.</p>
                  <button
                    onClick={() => setShowQuestionForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Question
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Form Modal */}
        {showQuestionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingQuestionId ? 'Edit Question' : 'Add New Question'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowQuestionForm(false);
                      setEditingQuestionId(null);
                      questionForm.reset();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={questionForm.handleSubmit(handleQuestionSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Type *
                      </label>
                      <select
                        {...questionForm.register('questionType')}
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
                        Points *
                      </label>
                      <input
                        type="number"
                        {...questionForm.register('marks', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      {...questionForm.register('questionText')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Explanation
                    </label>
                    <textarea
                      {...questionForm.register('explanation')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional explanation for the answer"
                    />
                  </div>

                  {/* Basic Options for Single/Multiple Choice */}
                  {(questionForm.watch('questionType') === 'single-choice' || 
                    questionForm.watch('questionType') === 'multiple-choice') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Options
                      </label>
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              {...questionForm.register(`options.${index}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Option ${index + 1}`}
                            />
                            <label className="flex items-center">
                              <input
                                type={questionForm.watch('questionType') === 'single-choice' ? 'radio' : 'checkbox'}
                                {...questionForm.register('correctAnswers')}
                                value={`opt${index + 1}`}
                                className="mr-1"
                              />
                              Correct
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuestionForm(false);
                        setEditingQuestionId(null);
                        questionForm.reset();
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {editingQuestionId ? 'Update Question' : 'Add Question'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamCreator;
