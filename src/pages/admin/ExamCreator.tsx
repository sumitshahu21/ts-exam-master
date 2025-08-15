import { useState, useMemo } from 'react';
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
import { examService, questionService } from '../../services/adminService';

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
  // Drag and Drop specific fields (matching existing types)
  dragDropItems?: Array<{ id: string; content: string }>;
  dragDropTargets?: Array<{ id: string; content: string; correctItemId?: string }>;
  // Case Study specific fields
  caseStudyText?: string;
  subQuestions?: SubQuestionTemplate[];
}

interface SubQuestionTemplate {
  id: number;
  questionType: 'single-choice' | 'multiple-choice' | 'short-answer';
  questionText: string;
  marks: number;
  options?: string[];
  correctAnswers?: string[];
}

function ExamCreator() {
  const navigate = useNavigate();
  
  // State management
  const [showPreview, setShowPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, any>>({});
  const [dragDropState, setDragDropState] = useState<Record<number, {
    availableItems: Array<{ id: string; content: string; originalIndex: number }>;
    targetAssignments: Record<string, { id: string; content: string; originalIndex: number } | null>;
  }>>({});
  const [draggedItem, setDraggedItem] = useState<{ 
    questionId: number; 
    item: { id: string; content: string; originalIndex: number } 
  } | null>(null);
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

  // Helper function to transform QuestionTemplate to standardized backend format
  const transformQuestionToBackendFormat = (questionTemplate: QuestionTemplate) => {
    const baseQuestion = {
      questionType: questionTemplate.questionType,
      questionText: questionTemplate.questionText,
      marks: questionTemplate.marks,
      explanation: questionTemplate.explanation || '',
    };

    // Create the standardized question_data JSON based on question type
    let questionData: any = {
      id: `q${questionTemplate.id}`,
      questionType: questionTemplate.questionType,
      questionText: questionTemplate.questionText,
      points: questionTemplate.marks,
      explanation: questionTemplate.explanation || ''
    };

    switch (questionTemplate.questionType) {
      case 'single-choice':
        questionData = {
          ...questionData,
          options: (questionTemplate.options?.filter(opt => opt.trim() !== '') || []).map((text, index) => {
            const optionId = `opt${index + 1}`;
            return {
              id: optionId,
              text: text,
              isCorrect: questionTemplate.correctAnswers?.includes(optionId) || false
            };
          }),
          correctAnswers: questionTemplate.correctAnswers || []
        };
        break;

      case 'multiple-choice':
        questionData = {
          ...questionData,
          options: (questionTemplate.options?.filter(opt => opt.trim() !== '') || []).map((text, index) => {
            const optionId = `opt${index + 1}`;
            return {
              id: optionId,
              text: text,
              isCorrect: questionTemplate.correctAnswers?.includes(optionId) || false
            };
          }),
          correctAnswers: questionTemplate.correctAnswers || []
        };
        break;

      case 'drag-drop':
        questionData = {
          ...questionData,
          questionType: 'drag-and-drop', // Standardize the type name
          dragDropItems: (questionTemplate.dragDropItems || []).map((item, index) => ({
            id: `item-${index + 1}`,
            content: item.content
          })),
          dragDropTargets: (questionTemplate.dragDropTargets || []).map((target, index) => ({
            id: `target-${index + 1}`,
            content: target.content || '',
            correctItemId: target.correctItemId ? `item-${(questionTemplate.dragDropItems?.findIndex(item => item.id === target.correctItemId) || 0) + 1}` : ''
          }))
        };
        break;

      case 'case-study':
        // Transform sub-questions to standardized format
        const transformedSubQuestions = (questionTemplate.subQuestions || []).map((subQ, subIndex) => ({
          id: `q${questionTemplate.id}-${subIndex + 1}`,
          questionType: subQ.questionType,
          questionText: subQ.questionText,
          marks: subQ.marks,
          ...(subQ.questionType !== 'short-answer' && {
            options: (subQ.options?.filter(opt => opt.trim() !== '') || []).map((text, optIndex) => {
              const optionId = `opt${optIndex + 1}`;
              return {
                id: optionId,
                text: text,
                isCorrect: subQ.correctAnswers?.includes(optionId) || false
              };
            }),
            correctAnswers: subQ.correctAnswers || []
          })
        }));
        
        questionData = {
          ...questionData,
          caseStudyText: questionTemplate.caseStudyText || '',
          subQuestions: transformedSubQuestions
        };
        break;

      case 'short-answer':
        questionData = {
          ...questionData,
          expectedAnswer: '', // Could be added to UI later
          gradingRubric: '' // Could be added to UI later
        };
        break;

      case 'code':
        questionData = {
          ...questionData,
          programmingLanguage: 'javascript', // Could be made configurable
          codeTemplate: '', // Could be added to UI later
          expectedSolution: '', // Could be added to UI later
          testCases: [] // Could be added to UI later
        };
        break;

      default:
        console.warn('Unknown question type:', questionTemplate.questionType);
    }

    return {
      ...baseQuestion,
      questionData: questionData  // Send as object, backend will stringify it
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

  const handleQuestionChange = (questionId: number, field: keyof QuestionTemplate, value: any) => {
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

  // Validation function for drag-drop questions
  const validateDragDropQuestion = (template: QuestionTemplate): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check if items have text (mandatory)
    const emptyItems = template.dragDropItems?.filter(item => !item.content.trim()) || [];
    if (emptyItems.length > 0) {
      errors.push(`All draggable items must have text content.`);
    }
    
    // Check if there are any items at all
    if (!template.dragDropItems || template.dragDropItems.length === 0) {
      errors.push(`At least one draggable item is required.`);
    }
    
    // Check if there are any targets at all
    if (!template.dragDropTargets || template.dragDropTargets.length === 0) {
      errors.push(`At least one drop target is required.`);
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handlePreview = () => {
    // Validate drag-drop questions before opening preview
    const dragDropQuestions = questionTemplates.filter(q => q.questionType === 'drag-drop');
    let hasValidationErrors = false;
    
    for (const template of dragDropQuestions) {
      const validation = validateDragDropQuestion(template);
      if (!validation.isValid) {
        // Show a more user-friendly validation message
        const questionNumber = questionTemplates.indexOf(template) + 1;
        const errorMessage = `Drag & Drop Question ${questionNumber} needs attention:\n\n${validation.errors.join('\n')}\n\nPlease fix these issues before previewing.`;
        alert(errorMessage);
        hasValidationErrors = true;
        break;
      }
    }
    
    if (hasValidationErrors) {
      return; // Don't open preview if validation fails
    }

    setShowPreview(true);
    setPreviewAnswers({}); // Reset answers when opening preview
    
    // Initialize drag-and-drop state for all drag-drop questions
    const initialDragDropState: Record<number, {
      availableItems: Array<{ id: string; content: string; originalIndex: number }>;
      targetAssignments: Record<string, { id: string; content: string; originalIndex: number } | null>;
    }> = {};
    
    questionTemplates.forEach(template => {
      if (template.questionType === 'drag-drop' && template.dragDropItems && template.dragDropTargets) {
        const availableItems = template.dragDropItems.map((item, index) => ({
          id: item.id,
          content: item.content,
          originalIndex: index
        }));
        
        const targetAssignments: Record<string, { id: string; content: string; originalIndex: number } | null> = {};
        template.dragDropTargets.forEach(target => {
          targetAssignments[target.id] = null;
        });
        
        initialDragDropState[template.id] = {
          availableItems,
          targetAssignments
        };
      }
    });
    
    setDragDropState(initialDragDropState);
  };

  // Preview interaction handlers
  const handlePreviewSingleChoice = (questionId: number, optionIndex: number) => {
    setPreviewAnswers(prev => ({
      ...prev,
      [questionId]: [optionIndex]
    }));
  };

  const handlePreviewMultipleChoice = (questionId: number, optionIndex: number) => {
    setPreviewAnswers(prev => {
      const currentAnswers = prev[questionId] || [];
      const newAnswers = currentAnswers.includes(optionIndex)
        ? currentAnswers.filter((idx: number) => idx !== optionIndex)
        : [...currentAnswers, optionIndex];
      
      return {
        ...prev,
        [questionId]: newAnswers
      };
    });
  };

  const handlePreviewShortAnswer = (questionId: number, answer: string) => {
    setPreviewAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Drag and Drop preview handlers
  const handleDragStart = (questionId: number, item: { id: string; content: string; originalIndex: number }) => {
    setDraggedItem({ questionId, item });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const resetDragDropQuestion = (questionId: number) => {
    const template = questionTemplates.find(t => t.id === questionId);
    if (!template || template.questionType !== 'drag-drop') return;

    const availableItems = template.dragDropItems?.map((item, index) => ({
      id: item.id,
      content: item.content,
      originalIndex: index
    })) || [];
    
    const targetAssignments: Record<string, { id: string; content: string; originalIndex: number } | null> = {};
    template.dragDropTargets?.forEach(target => {
      targetAssignments[target.id] = null;
    });

    setDragDropState(prev => ({
      ...prev,
      [questionId]: {
        availableItems,
        targetAssignments
      }
    }));
  };

  const handleDropOnTarget = (questionId: number, targetId: string) => {
    if (!draggedItem || draggedItem.questionId !== questionId) return;

    setDragDropState(prev => {
      const questionState = prev[questionId];
      if (!questionState) return prev;

      // Remove item from available items
      const newAvailableItems = questionState.availableItems.filter(
        item => item.id !== draggedItem.item.id
      );

      // If target already has an item, move it back to available items
      const currentTargetItem = questionState.targetAssignments[targetId];
      if (currentTargetItem) {
        newAvailableItems.push(currentTargetItem);
      }

      // Assign dragged item to target
      const newTargetAssignments = {
        ...questionState.targetAssignments,
        [targetId]: draggedItem.item
      };

      return {
        ...prev,
        [questionId]: {
          availableItems: newAvailableItems,
          targetAssignments: newTargetAssignments
        }
      };
    });

    setDraggedItem(null);
  };

  const handleDropOnAvailable = (questionId: number) => {
    if (!draggedItem || draggedItem.questionId !== questionId) return;

    setDragDropState(prev => {
      const questionState = prev[questionId];
      if (!questionState) return prev;

      // Find which target had this item
      let sourceTargetId: string | null = null;
      for (const [targetId, item] of Object.entries(questionState.targetAssignments)) {
        if (item && item.id === draggedItem.item.id) {
          sourceTargetId = targetId;
          break;
        }
      }

      // If item was in a target, remove it from there
      const newTargetAssignments = { ...questionState.targetAssignments };
      if (sourceTargetId) {
        newTargetAssignments[sourceTargetId] = null;
      }

      // Add item back to available items (if not already there)
      const newAvailableItems = questionState.availableItems.some(item => item.id === draggedItem.item.id)
        ? questionState.availableItems
        : [...questionState.availableItems, draggedItem.item];

      return {
        ...prev,
        [questionId]: {
          availableItems: newAvailableItems,
          targetAssignments: newTargetAssignments
        }
      };
    });

    setDraggedItem(null);
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
    const validQuestions = questionTemplates.filter(q => q.questionText.trim() !== '');
    if (validQuestions.length === 0) {
      toast.error('Please add at least one question with content');
      return;
    }

    try {
      console.log('📝 Publishing exam with data:', examData);
      
      // Step 1: Create the exam first
      const validQuestions = questionTemplates.filter(q => q.questionText.trim() !== '');
      console.log('📝 Valid questions:', validQuestions);
      
      const examCreateData = {
        title: examData.title,
        subject: examData.subject,
        description: examData.description || '',
        duration: examData.duration,
        totalQuestions: validQuestions.length,
        totalMarks: totalMarks,
        passingScore: examData.passingScore,
        scheduledStartTime: examData.scheduledStartTime || undefined,
        scheduledEndTime: examData.scheduledEndTime || undefined,
        isPublished: true // Published status
      };

      console.log('📝 Creating exam with data:', examCreateData);
      console.log('🔥 PUBLISH - isPublished should be TRUE:', examCreateData.isPublished);
      const examResult = await examService.createExam(examCreateData);
      console.log('📝 Exam creation result:', examResult);
      
      if (!examResult.success) {
        throw new Error(examResult.message || 'Failed to create exam');
      }

      const examId = examResult.data.examId;
      console.log('📝 Created exam with ID:', examId);

      // Step 2: Create each question with the examId
      const questionPromises = validQuestions.map(async (questionTemplate, index) => {
        const transformedQuestion = transformQuestionToBackendFormat(questionTemplate);
        console.log(`📝 Creating question ${index + 1}:`, transformedQuestion);
        
        const result = await questionService.createQuestion({
          examId: examId,
          ...transformedQuestion
        });
        console.log(`📝 Question ${index + 1} result:`, result);
        return result;
      });

      const questionResults = await Promise.all(questionPromises);
      
      // Check if all questions were created successfully
      const failedQuestions = questionResults.filter(result => !result.success);
      if (failedQuestions.length > 0) {
        console.warn('Some questions failed to create:', failedQuestions);
        toast.error(`Exam published but ${failedQuestions.length} question(s) failed to save`);
      } else {
        toast.success('Exam published successfully!');
      }
      
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Failed to publish exam:', error);
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
      console.log('📝 Saving draft with data:', examData);
      console.log('📝 Question templates:', questionTemplates);
      
      // Step 1: Create the exam as draft
      const validQuestions = questionTemplates.filter(q => q.questionText.trim() !== '');
      
      const examCreateData = {
        title: examData.title,
        subject: examData.subject,
        description: examData.description || '',
        duration: examData.duration,
        totalQuestions: validQuestions.length,
        totalMarks: totalMarks,
        passingScore: examData.passingScore,
        scheduledStartTime: examData.scheduledStartTime || undefined,
        scheduledEndTime: examData.scheduledEndTime || undefined,
        isPublished: false // Draft status
      };

      console.log('📝 Creating draft exam with data:', examCreateData);
      console.log('💾 DRAFT - isPublished should be FALSE:', examCreateData.isPublished);
      const examResult = await examService.createExam(examCreateData);
      console.log('📝 Draft exam creation result:', examResult);
      
      if (!examResult.success) {
        throw new Error(examResult.message || 'Failed to create exam');
      }

      const examId = examResult.data.examId;
      console.log('📝 Created draft exam with ID:', examId);

      // Step 2: Create questions (including empty ones for drafts)
      if (validQuestions.length > 0) {
        const questionPromises = validQuestions.map(async (questionTemplate, index) => {
          const transformedQuestion = transformQuestionToBackendFormat(questionTemplate);
          console.log(`📝 Creating draft question ${index + 1}:`, transformedQuestion);
          
          const result = await questionService.createQuestion({
            examId: examId,
            ...transformedQuestion
          });
          console.log(`📝 Draft question ${index + 1} result:`, result);
          return result;
        });

        const questionResults = await Promise.all(questionPromises);
        
        // Check if all questions were created successfully
        const failedQuestions = questionResults.filter(result => !result.success);
        if (failedQuestions.length > 0) {
          console.warn('Some questions failed to create:', failedQuestions);
          toast.error(`Draft saved but ${failedQuestions.length} question(s) failed to save`);
        } else {
          toast.success('Exam saved as draft!');
        }
      } else {
        toast.success('Exam saved as draft!');
      }
      
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Failed to save draft:', error);
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700">
                  <strong>Total Questions:</strong> {questionTemplates.length}
                </span>
                <span className="text-blue-700">
                  <strong>Total Marks:</strong> {totalMarks}
                </span>
              </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Options
                      </label>
                      <div className="flex gap-2">
                        <button
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
                          {(template.options?.length || 0) > 2 && (
                            <button
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
                        onChange={(e) => handleQuestionChange(template.id, 'caseStudyText', e.target.value)}
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
                                onClick={() => handleRemoveSubQuestion(template.id, subQuestion.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Question Type
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
                                <label className="block text-xs font-medium text-gray-600 mb-1">
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
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Question Text *
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
                                  <label className="block text-xs font-medium text-gray-600">
                                    Options
                                  </label>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleAddOption(template.id, true, subQuestion.id)}
                                      className="inline-flex items-center px-1 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                    >
                                      <Plus className="h-2 w-2 mr-0.5" />
                                      Add
                                    </button>
                                  </div>
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
                                          onClick={() => handleRemoveOption(template.id, optIndex, true, subQuestion.id)}
                                          className="p-0.5 text-red-600 hover:bg-red-50 rounded"
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

        {/* Interactive Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-6xl max-h-[90vh] overflow-y-auto w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Student View Preview</h2>
                  <p className="text-sm text-gray-600 mt-1">Interactive simulation of the exam experience</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              {/* Exam Header */}
              <div className="border-b-2 border-gray-200 pb-6 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {examForm.watch('title') || 'Untitled Exam'}
                </h1>
                {examForm.watch('description') && (
                  <p className="text-gray-700 mb-4">{examForm.watch('description')}</p>
                )}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span className="flex items-center">
                    <strong>Duration:</strong> {examForm.watch('duration')} minutes
                  </span>
                  <span className="flex items-center">
                    <strong>Total Questions:</strong> {questionTemplates.length}
                  </span>
                  <span className="flex items-center">
                    <strong>Total Marks:</strong> {questionTemplates.reduce((sum, q) => sum + q.marks, 0)}
                  </span>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {questionTemplates.map((template, index) => (
                  <div key={template.id} className="border-2 border-gray-100 rounded-xl p-6 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Question {index + 1}
                      </h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        {template.marks} {template.marks === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>
                    
                    <p className="text-gray-800 mb-6 text-lg leading-relaxed">
                      {template.questionText || 'No question text provided'}
                    </p>

                    {/* Single Choice Preview */}
                    {template.questionType === 'single-choice' && template.options && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 mb-4">Select one answer:</p>
                        {template.options.map((option, optIndex) => (
                          option.trim() && (
                            <label key={optIndex} className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all">
                              <input
                                type="radio"
                                name={`preview-${template.id}`}
                                checked={(previewAnswers[template.id] || []).includes(optIndex)}
                                onChange={() => handlePreviewSingleChoice(template.id, optIndex)}
                                className="w-5 h-5 text-blue-600 border-2 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-gray-900 text-lg">{option}</span>
                            </label>
                          )
                        ))}
                      </div>
                    )}

                    {/* Multiple Choice Preview */}
                    {template.questionType === 'multiple-choice' && template.options && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 mb-4">Select all correct answers:</p>
                        {template.options.map((option, optIndex) => (
                          option.trim() && (
                            <label key={optIndex} className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all">
                              <input
                                type="checkbox"
                                checked={(previewAnswers[template.id] || []).includes(optIndex)}
                                onChange={() => handlePreviewMultipleChoice(template.id, optIndex)}
                                className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-gray-900 text-lg">{option}</span>
                            </label>
                          )
                        ))}
                      </div>
                    )}

                    {/* Interactive Drag and Drop Preview */}
                    {template.questionType === 'drag-drop' && template.dragDropItems && template.dragDropTargets && dragDropState[template.id] && (
                      <div>
                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <h5 className="text-amber-800 font-medium mb-1">How to interact:</h5>
                              <ul className="text-amber-700 text-sm space-y-1">
                                <li>• Drag items from the left panel to the appropriate targets on the right</li>
                                <li>• Drag items back to the left panel to remove them from targets</li>
                                <li>• Items will automatically move between blocks when dropped</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Available Items Block */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                                Items to Drag
                              </h4>
                              <button
                                onClick={() => resetDragDropQuestion(template.id)}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors flex items-center"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset
                              </button>
                            </div>
                            <div 
                              className={`
                                min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-all duration-200
                                ${draggedItem && draggedItem.questionId === template.id
                                  ? 'border-blue-500 bg-blue-100/50' 
                                  : 'border-blue-300 bg-blue-50/30'
                                }
                              `}
                              onDrop={() => handleDropOnAvailable(template.id)}
                              onDragOver={handleDragOver}
                            >
                              <div className="space-y-3">
                                {dragDropState[template.id].availableItems.length === 0 ? (
                                  <div className="text-center py-8">
                                    <div className="text-blue-400 mb-2">
                                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                      </svg>
                                    </div>
                                    <p className="text-blue-600 font-medium">All items have been placed</p>
                                    <p className="text-blue-500 text-sm">Drag items back here from targets</p>
                                  </div>
                                ) : (
                                  dragDropState[template.id].availableItems.map((item) => (
                                    <div
                                      key={item.id}
                                      draggable
                                      onDragStart={() => handleDragStart(template.id, item)}
                                      onDragEnd={handleDragEnd}
                                      className={`
                                        group p-4 bg-white border-2 rounded-lg cursor-move transition-all duration-200 transform
                                        ${draggedItem && draggedItem.item.id === item.id
                                          ? 'border-blue-500 shadow-lg scale-105 opacity-75'
                                          : 'border-blue-300 hover:border-blue-500 hover:shadow-md hover:scale-[1.02]'
                                        }
                                      `}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-900 font-medium">{item.content}</span>
                                        <div className="flex items-center text-blue-600">
                                          <span className="text-xs font-medium mr-2">Item {item.originalIndex + 1}</span>
                                          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Drop Targets Block */}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                              Drop Targets
                            </h4>
                            <div className="space-y-3">
                              {template.dragDropTargets.map((target, targetIndex) => {
                                const assignedItem = dragDropState[template.id].targetAssignments[target.id];
                                const isEmpty = !assignedItem;
                                const isDragOverTarget = draggedItem && draggedItem.questionId === template.id;
                                
                                // Always show target blocks, regardless of content
                                return (
                                  <div
                                    key={target.id}
                                    onDrop={() => handleDropOnTarget(template.id, target.id)}
                                    onDragOver={handleDragOver}
                                    className={`
                                      p-4 min-h-[100px] border-2 border-dashed rounded-lg transition-all duration-200
                                      ${isEmpty 
                                        ? isDragOverTarget
                                          ? 'border-green-500 bg-green-100 shadow-md'
                                          : 'border-green-300 bg-green-50/30 hover:border-green-500 hover:bg-green-50'
                                        : 'border-green-500 bg-green-100'
                                      }
                                    `}
                                  >
                                    <div className="text-center mb-3">
                                      <div className="flex items-center justify-center mb-2">
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                          Target {targetIndex + 1}
                                        </span>
                                      </div>
                                      <p className="font-medium text-gray-700">
                                        {target.content.trim() ? (
                                          target.content
                                        ) : (
                                          <span className="text-gray-500 italic">Target {targetIndex + 1}</span>
                                        )}
                                      </p>
                                    </div>
                                    
                                    {assignedItem ? (
                                      <div
                                        draggable
                                        onDragStart={() => handleDragStart(template.id, assignedItem)}
                                        onDragEnd={handleDragEnd}
                                        className={`
                                          p-3 bg-white border-2 rounded-lg cursor-move transition-all duration-200 transform
                                          ${draggedItem && draggedItem.item.id === assignedItem.id
                                            ? 'border-green-600 shadow-lg scale-105 opacity-75'
                                            : 'border-green-400 hover:border-green-600 hover:shadow-md hover:scale-[1.02]'
                                          }
                                        `}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-900 font-medium">{assignedItem.content}</span>
                                          <div className="flex items-center text-green-600">
                                            <span className="text-xs font-medium mr-2">Item {assignedItem.originalIndex + 1}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-4">
                                        <div className={`mb-2 transition-colors ${isDragOverTarget ? 'text-green-600' : 'text-green-400'}`}>
                                          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                              d="M12 4v16m8-8H4" />
                                          </svg>
                                        </div>
                                        <p className={`text-sm font-medium transition-colors ${isDragOverTarget ? 'text-green-700' : 'text-green-600'}`}>
                                          {isDragOverTarget ? 'Drop item here' : 'Drop an item here'}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Case Study Preview */}
                    {template.questionType === 'case-study' && (
                      <div className="space-y-6">
                        {template.caseStudyText && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
                            <h4 className="text-lg font-semibold text-blue-900 mb-3">Case Study</h4>
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {template.caseStudyText}
                            </div>
                          </div>
                        )}
                        
                        {template.subQuestions && template.subQuestions.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Questions based on the case study:
                            </h4>
                            <div className="space-y-6">
                              {template.subQuestions.map((subQ, subIndex) => (
                                <div key={subQ.id} className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                        Part {String.fromCharCode(97 + subIndex).toUpperCase()}
                                      </span>
                                      <span className="text-sm text-gray-600">{subQ.marks} marks</span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-gray-800 mb-4 font-medium">{subQ.questionText || 'No question text'}</p>
                                  
                                  {/* Sub-question options */}
                                  {(subQ.questionType === 'single-choice' || subQ.questionType === 'multiple-choice') && subQ.options && (
                                    <div className="space-y-2">
                                      {subQ.options.map((option, optIndex) => (
                                        option.trim() && (
                                          <label key={optIndex} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                            <input
                                              type={subQ.questionType === 'single-choice' ? 'radio' : 'checkbox'}
                                              name={`preview-sub-${template.id}-${subQ.id}`}
                                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-gray-900">{option}</span>
                                          </label>
                                        )
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Short answer */}
                                  {subQ.questionType === 'short-answer' && (
                                    <textarea
                                      rows={3}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                      placeholder="Enter your answer here..."
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Short Answer Preview */}
                    {template.questionType === 'short-answer' && (
                      <div>
                        <textarea
                          rows={4}
                          value={previewAnswers[template.id] || ''}
                          onChange={(e) => handlePreviewShortAnswer(template.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-lg"
                          placeholder="Enter your answer here..."
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          Word count: {(previewAnswers[template.id] || '').toString().trim().split(/\s+/).filter((word: string) => word.length > 0).length}
                        </p>
                      </div>
                    )}

                    {/* Code Question Preview */}
                    {template.questionType === 'code' && (
                      <div>
                        <div className="bg-gray-900 rounded-lg p-4 mb-4">
                          <code className="text-green-400 text-sm">
                            // Code editor would appear here
                            <br />
                            function solution() {'{'}
                            <br />
                            &nbsp;&nbsp;// Write your code here
                            <br />
                            {'}'}
                          </code>
                        </div>
                        <textarea
                          rows={6}
                          value={previewAnswers[template.id] || ''}
                          onChange={(e) => handlePreviewShortAnswer(template.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                          placeholder="// Write your code here..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview Footer */}
              <div className="mt-8 pt-6 border-t-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p><strong>Note:</strong> This is a preview simulation. In the actual exam, students would see submit buttons and time remaining.</p>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamCreator;
