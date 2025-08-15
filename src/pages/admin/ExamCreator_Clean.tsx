import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  CheckCircle,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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
}

function ExamCreator() {
  const navigate = useNavigate();
  
  // State management
  const [showPreview, setShowPreview] = useState(false);
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>([
    {
      id: 1,
      questionType: 'single-choice',
      questionText: '',
      marks: 5,
      explanation: '',
      options: ['', '', '', ''],
      correctAnswers: [],
    }
  ]);
  const [nextQuestionId, setNextQuestionId] = useState(2);

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

  // New handlers for question template management
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
        ? { ...q, questionType: newType, options: newType === 'single-choice' || newType === 'multiple-choice' ? ['', '', '', ''] : [] }
        : q
    ));
  };

  const handleQuestionChange = (questionId: number, field: keyof QuestionTemplate, value: any) => {
    setQuestionTemplates(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handlePublish = async () => {
    const examData = examForm.getValues();
    
    // Validate exam form
    const examValidation = examSchema.safeParse(examData);
    if (!examValidation.success) {
      toast.error('Please fill in all required exam details');
      return;
    }

    // Check if at least one question has content
    const hasValidQuestions = questionTemplates.some(q => q.questionText.trim() !== '');
    if (!hasValidQuestions) {
      toast.error('Please add at least one question with content');
      return;
    }

    try {
      // Here you would integrate with your backend API
      console.log('Publishing exam:', {
        examData,
        questions: questionTemplates.filter(q => q.questionText.trim() !== '')
      });
      
      toast.success('Exam published successfully!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Failed to publish exam');
    }
  };

  const handleSaveDraft = async () => {
    const examData = examForm.getValues();
    
    // Validate exam form
    const examValidation = examSchema.safeParse(examData);
    if (!examValidation.success) {
      toast.error('Please fill in all required exam details');
      return;
    }

    try {
      // Here you would integrate with your backend API
      console.log('Saving draft:', {
        examData,
        questions: questionTemplates.filter(q => q.questionText.trim() !== '')
      });
      
      toast.success('Exam saved as draft!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header with Action Buttons */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Exam
              </h1>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </button>
              <button
                onClick={handleSaveDraft}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </button>
              <button
                onClick={handlePublish}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </button>
            </div>
          </div>
        </div>

        {/* Exam Details Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Exam Details</h2>
            <p className="text-gray-600 text-sm mt-1">Configure the basic settings for your exam</p>
          </div>
          
          <form className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  {...examForm.register('title')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter exam title"
                />
                {examForm.formState.errors.title && (
                  <p className="text-red-500 text-xs mt-1">{examForm.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  {...examForm.register('subject')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subject"
                />
                {examForm.formState.errors.subject && (
                  <p className="text-red-500 text-xs mt-1">{examForm.formState.errors.subject.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  {...examForm.register('duration', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {examForm.formState.errors.duration && (
                  <p className="text-red-500 text-xs mt-1">{examForm.formState.errors.duration.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Score (%) *
                </label>
                <input
                  {...examForm.register('passingScore', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {examForm.formState.errors.passingScore && (
                  <p className="text-red-500 text-xs mt-1">{examForm.formState.errors.passingScore.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="scheduledStartTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Start Time
                </label>
                <input
                  {...examForm.register('scheduledStartTime')}
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="scheduledEndTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled End Time
                </label>
                <input
                  {...examForm.register('scheduledEndTime')}
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Question Management Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
              <p className="text-gray-600 text-sm mt-1">Add and configure questions for your exam</p>
            </div>
          </div>

          {/* Question Templates */}
          {questionTemplates.map((template, index) => (
            <div key={template.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Question {index + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddQuestion}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Question
                    </button>
                    {questionTemplates.length > 1 && (
                      <button
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
                      onChange={(e) => handleQuestionChange(template.id, 'marks', parseInt(e.target.value) || 5)}
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
                    onChange={(e) => handleQuestionChange(template.id, 'questionText', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your question here..."
                  />
                </div>

                {/* Options for Single/Multiple Choice */}
                {(template.questionType === 'single-choice' || template.questionType === 'multiple-choice') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
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
                              
                              handleQuestionChange(template.id, 'correctAnswers', newCorrectAnswers);
                            }}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(template.options || [])];
                              newOptions[optIndex] = e.target.value;
                              handleQuestionChange(template.id, 'options', newOptions);
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={template.explanation || ''}
                    onChange={(e) => handleQuestionChange(template.id, 'explanation', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide an explanation for the answer..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Exam Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium">{examForm.watch('title') || 'Untitled Exam'}</h3>
                  <p className="text-gray-600">{examForm.watch('description') || 'No description'}</p>
                  <p className="text-sm text-gray-500">Duration: {examForm.watch('duration')} minutes</p>
                </div>
                {questionTemplates.map((template, index) => (
                  <div key={template.id} className="border-b pb-4">
                    <h4 className="font-medium mb-2">Question {index + 1}: {template.questionText || 'No question text'}</h4>
                    <p className="text-sm text-gray-600 mb-2">Type: {template.questionType} | Marks: {template.marks}</p>
                    {template.options && (
                      <div className="space-y-1">
                        {template.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <span className={`w-6 h-6 border rounded flex items-center justify-center text-xs ${
                              template.correctAnswers?.includes(`opt${optIndex + 1}`) ? 'bg-green-100 border-green-500' : 'border-gray-300'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span>{option || `Option ${optIndex + 1}`}</span>
                            {template.correctAnswers?.includes(`opt${optIndex + 1}`) && 
                              <span className="text-green-600 text-xs">✓ Correct</span>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamCreator;
