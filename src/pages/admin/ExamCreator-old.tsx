import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Clock,
  ChevronDown,
  ChevronUp,
  GripVertical
} from 'lucide-react';
import ExamPreview from '../../components/ExamPreview';

const questionSchema: z.ZodType<any> = z.object({
  type: z.enum(['single-choice', 'multiple-choice', 'drag-drop', 'case-study', 'short-answer', 'code']),
  question: z.string().min(1, 'Question is required'),
  options: z.array(z.string()).optional(),
  correctAnswers: z.array(z.union([z.string(), z.number()])),
  points: z.number().min(1, 'Points must be at least 1'),
  explanation: z.string().optional(),
  caseStudyText: z.string().optional(),
  // Drag & Drop fields
  dragDropItems: z.array(z.object({
    id: z.string(),
    content: z.string(),
  })).optional(),
  dragDropTargets: z.array(z.object({
    id: z.string(),
    content: z.string(),
    correctItemId: z.string().optional(),
  })).optional(),
  // Short answer fields
  expectedAnswer: z.string().optional(),
  gradingRubric: z.string().optional(),
  // Code question fields
  programmingLanguage: z.string().optional(),
  codeTemplate: z.string().optional(),
  expectedSolution: z.string().optional(),
  testCases: z.string().optional(),
  // Case study sub-questions
  subQuestions: z.array(z.lazy((): z.ZodType<any> => questionSchema)).optional(),
});

const examSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  randomizeQuestions: z.boolean(),
  allowMultipleAttempts: z.boolean(),
  scheduledStartTime: z.string().optional(),
  scheduledEndTime: z.string().optional(),
  questions: z.array(questionSchema),
});

type ExamFormData = z.infer<typeof examSchema>;

const questionTypes = [
  { value: 'single-choice', label: 'Single Choice' },
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'drag-drop', label: 'Drag & Drop' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'code', label: 'Code Question' },
];

function QuestionEditor({ 
  question, 
  index, 
  onUpdate, 
  onDelete, 
  isExpanded, 
  onToggleExpand 
}: {
  question: any;
  index: number;
  onUpdate: (index: number, updatedQuestion: any) => void;
  onDelete: (index: number) => void;
  isExpanded: boolean;
  onToggleExpand: (index: number) => void;
}) {
  const handleFieldChange = (field: string, value: any) => {
    onUpdate(index, { ...question, [field]: value });
  };

  const handleTypeChange = (newType: string) => {
    let updatedQuestion = { ...question, type: newType };
    
    // Initialize type-specific fields
    switch (newType) {
      case 'single-choice':
      case 'multiple-choice':
        if (!updatedQuestion.options || updatedQuestion.options.length === 0) {
          updatedQuestion.options = ['', ''];
        }
        updatedQuestion.correctAnswers = [];
        break;
      case 'drag-drop':
        if (!updatedQuestion.dragDropItems) {
          updatedQuestion.dragDropItems = [
            { id: Date.now().toString(), content: '' },
            { id: (Date.now() + 1).toString(), content: '' }
          ];
        }
        if (!updatedQuestion.dragDropTargets) {
          updatedQuestion.dragDropTargets = [
            { id: Date.now().toString(), content: '', correctItemId: '' }
          ];
        }
        break;
      case 'case-study':
        if (!updatedQuestion.subQuestions) {
          updatedQuestion.subQuestions = [{
            id: Date.now().toString(),
            type: 'single-choice',
            question: '',
            options: ['', ''],
            correctAnswers: [],
            points: 2,
          }];
        }
        break;
      case 'short-answer':
        updatedQuestion.expectedAnswer = updatedQuestion.expectedAnswer || '';
        updatedQuestion.gradingRubric = updatedQuestion.gradingRubric || '';
        break;
      case 'code':
        updatedQuestion.programmingLanguage = updatedQuestion.programmingLanguage || 'javascript';
        updatedQuestion.codeTemplate = updatedQuestion.codeTemplate || '';
        updatedQuestion.expectedSolution = updatedQuestion.expectedSolution || '';
        updatedQuestion.testCases = updatedQuestion.testCases || '';
        break;
    }
    
    onUpdate(index, updatedQuestion);
  };

  const addOption = () => {
    const newOptions = [...(question.options || []), ''];
    handleFieldChange('options', newOptions);
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    handleFieldChange('options', newOptions);
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = question.options.filter((_: any, i: number) => i !== optionIndex);
    handleFieldChange('options', newOptions);
  };

  const toggleCorrectAnswer = (optionIndex: number) => {
    let newCorrectAnswers = [...question.correctAnswers];
    
    if (question.type === 'single-choice') {
      newCorrectAnswers = [optionIndex];
    } else {
      if (newCorrectAnswers.includes(optionIndex)) {
        newCorrectAnswers = newCorrectAnswers.filter(i => i !== optionIndex);
      } else {
        newCorrectAnswers.push(optionIndex);
      }
    }
    
    handleFieldChange('correctAnswers', newCorrectAnswers);
  };

  // Drag & Drop handlers
  const addDragDropItem = () => {
    const newItems = [...(question.dragDropItems || []), { id: Date.now().toString(), content: '' }];
    handleFieldChange('dragDropItems', newItems);
  };

  const updateDragDropItem = (itemIndex: number, value: string) => {
    const newItems = [...question.dragDropItems];
    newItems[itemIndex].content = value;
    handleFieldChange('dragDropItems', newItems);
  };

  const removeDragDropItem = (itemIndex: number) => {
    const newItems = question.dragDropItems.filter((_: any, i: number) => i !== itemIndex);
    handleFieldChange('dragDropItems', newItems);
  };

  const addDragDropTarget = () => {
    const newTargets = [...(question.dragDropTargets || []), { id: Date.now().toString(), content: '', correctItemId: '' }];
    handleFieldChange('dragDropTargets', newTargets);
  };

  const updateDragDropTarget = (targetIndex: number, field: string, value: string) => {
    const newTargets = [...question.dragDropTargets];
    newTargets[targetIndex][field] = value;
    handleFieldChange('dragDropTargets', newTargets);
  };

  // Case Study handlers
  const addSubQuestion = () => {
    const newSubQuestions = [...(question.subQuestions || []), {
      id: Date.now().toString(),
      type: 'single-choice',
      question: '',
      options: ['', ''],
      correctAnswers: [],
      points: 2,
    }];
    handleFieldChange('subQuestions', newSubQuestions);
  };

  const updateSubQuestion = (subIndex: number, field: string, value: any) => {
    const newSubQuestions = [...(question.subQuestions || [])];
    newSubQuestions[subIndex] = { ...newSubQuestions[subIndex], [field]: value };
    handleFieldChange('subQuestions', newSubQuestions);
  };

  const removeSubQuestion = (subIndex: number) => {
    const newSubQuestions = question.subQuestions?.filter((_: any, i: number) => i !== subIndex) || [];
    handleFieldChange('subQuestions', newSubQuestions);
  };

  const addSubQuestionOption = (subIndex: number) => {
    const newSubQuestions = [...(question.subQuestions || [])];
    const newOptions = [...(newSubQuestions[subIndex].options || []), ''];
    newSubQuestions[subIndex] = { ...newSubQuestions[subIndex], options: newOptions };
    handleFieldChange('subQuestions', newSubQuestions);
  };

  const updateSubQuestionOption = (subIndex: number, optionIndex: number, value: string) => {
    const newSubQuestions = [...(question.subQuestions || [])];
    const newOptions = [...newSubQuestions[subIndex].options];
    newOptions[optionIndex] = value;
    newSubQuestions[subIndex] = { ...newSubQuestions[subIndex], options: newOptions };
    handleFieldChange('subQuestions', newSubQuestions);
  };

  const removeSubQuestionOption = (subIndex: number, optionIndex: number) => {
    const newSubQuestions = [...(question.subQuestions || [])];
    const newOptions = newSubQuestions[subIndex].options?.filter((_: any, i: number) => i !== optionIndex) || [];
    newSubQuestions[subIndex] = { ...newSubQuestions[subIndex], options: newOptions };
    handleFieldChange('subQuestions', newSubQuestions);
  };

  const removeDragDropTarget = (targetIndex: number) => {
    const newTargets = question.dragDropTargets?.filter((_: any, i: number) => i !== targetIndex) || [];
    handleFieldChange('dragDropTargets', newTargets);
  };

  const toggleSubQuestionCorrectAnswer = (subIndex: number, optionIndex: number) => {
    const newSubQuestions = [...(question.subQuestions || [])];
    const subQuestion = newSubQuestions[subIndex];
    let newCorrectAnswers = [...subQuestion.correctAnswers];
    
    if (subQuestion.type === 'single-choice') {
      newCorrectAnswers = [optionIndex];
    } else {
      if (newCorrectAnswers.includes(optionIndex)) {
        newCorrectAnswers = newCorrectAnswers.filter(i => i !== optionIndex);
      } else {
        newCorrectAnswers.push(optionIndex);
      }
    }
    
    newSubQuestions[subIndex] = { ...subQuestion, correctAnswers: newCorrectAnswers };
    handleFieldChange('subQuestions', newSubQuestions);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
          <span className="font-medium text-gray-900">Question {index + 1}</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {questionTypes.find(t => t.value === question.type)?.label}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onToggleExpand(index)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type
            </label>
            <select
              value={question.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question
            </label>
            <textarea
              value={question.question}
              onChange={(e) => handleFieldChange('question', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your question..."
            />
          </div>

          {/* Points */}
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Points
            </label>
            <input
              type="number"
              value={question.points}
              onChange={(e) => handleFieldChange('points', parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Case Study Text */}
          {question.type === 'case-study' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Study Text
              </label>
              <textarea
                value={question.caseStudyText || ''}
                onChange={(e) => handleFieldChange('caseStudyText', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the case study scenario..."
              />
            </div>
          )}

          {/* Options for choice questions */}
          {(question.type === 'single-choice' || question.type === 'multiple-choice') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Answer Options
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Option
                </button>
              </div>
              
              <div className="space-y-2">
                {question.options?.map((option: string, optionIndex: number) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <input
                      type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                      name={`question-${index}-correct`}
                      checked={question.correctAnswers.includes(optionIndex)}
                      onChange={() => toggleCorrectAnswer(optionIndex)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(optionIndex, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        question.correctAnswers.includes(optionIndex)
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                      }`}
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(optionIndex)}
                      className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {question.correctAnswers.includes(optionIndex) && (
                      <span className="text-xs text-green-600 font-medium">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag & Drop Configuration */}
          {question.type === 'drag-drop' && (
            <div className="space-y-6">
              {/* Drag Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Draggable Items
                  </label>
                  <button
                    type="button"
                    onClick={addDragDropItem}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                
                <div className="space-y-2">
                  {question.dragDropItems?.map((item: any, itemIndex: number) => (
                    <div key={itemIndex} className="flex items-center space-x-2">
                      <div className="w-16 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded text-center">
                        Item {itemIndex + 1}
                      </div>
                      <input
                        type="text"
                        value={item.content}
                        onChange={(e) => updateDragDropItem(itemIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Draggable item ${itemIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeDragDropItem(itemIndex)}
                        className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drop Targets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Drop Targets
                  </label>
                  <button
                    type="button"
                    onClick={addDragDropTarget}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Target
                  </button>
                </div>
                
                <div className="space-y-3">
                  {question.dragDropTargets?.map((target: any, targetIndex: number) => (
                    <div key={targetIndex} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-20 px-2 py-1 bg-green-100 text-green-800 text-xs rounded text-center">
                          Target {targetIndex + 1}
                        </div>
                        <input
                          type="text"
                          value={target.content}
                          onChange={(e) => updateDragDropTarget(targetIndex, 'content', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Drop target ${targetIndex + 1} description`}
                        />
                        <button
                          type="button"
                          onClick={() => removeDragDropTarget(targetIndex)}
                          className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="ml-22">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Correct Item for this target:
                        </label>
                        <select
                          value={target.correctItemId || ''}
                          onChange={(e) => updateDragDropTarget(targetIndex, 'correctItemId', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select correct item</option>
                          {question.dragDropItems?.map((item: any, itemIndex: number) => (
                            <option key={item.id} value={item.id}>
                              Item {itemIndex + 1}: {item.content || 'Unnamed item'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Case Study Configuration */}
          {question.type === 'case-study' && (
            <div className="space-y-6">
              {/* Sub-questions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sub-questions
                  </label>
                  <button
                    type="button"
                    onClick={addSubQuestion}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Sub-question
                  </button>
                </div>
                
                <div className="space-y-4">
                  {question.subQuestions?.map((subQuestion: any, subIndex: number) => (
                    <div key={subIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-700">
                          Part {String.fromCharCode(97 + subIndex).toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubQuestion(subIndex)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Sub-question type */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Question Type
                        </label>
                        <select
                          value={subQuestion.type}
                          onChange={(e) => updateSubQuestion(subIndex, 'type', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="single-choice">Single Choice</option>
                          <option value="multiple-choice">Multiple Choice</option>
                        </select>
                      </div>
                      
                      {/* Sub-question text */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Question
                        </label>
                        <textarea
                          value={subQuestion.question}
                          onChange={(e) => updateSubQuestion(subIndex, 'question', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter sub-question..."
                        />
                      </div>
                      
                      {/* Sub-question points */}
                      <div className="mb-3 w-24">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          value={subQuestion.points}
                          onChange={(e) => updateSubQuestion(subIndex, 'points', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Sub-question options */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-gray-600">
                            Answer Options
                          </label>
                          <button
                            type="button"
                            onClick={() => addSubQuestionOption(subIndex)}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            + Add Option
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {subQuestion.options?.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type={subQuestion.type === 'single-choice' ? 'radio' : 'checkbox'}
                                name={`subquestion-${index}-${subIndex}-correct`}
                                checked={subQuestion.correctAnswers?.includes(optionIndex) || false}
                                onChange={() => toggleSubQuestionCorrectAnswer(subIndex, optionIndex)}
                                className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateSubQuestionOption(subIndex, optionIndex, e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeSubQuestionOption(subIndex, optionIndex)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Short Answer Configuration */}
          {question.type === 'short-answer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Answer / Key Points
                </label>
                <textarea
                  value={question.expectedAnswer || ''}
                  onChange={(e) => handleFieldChange('expectedAnswer', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the expected answer or key points for grading reference..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be used for grading reference. Short answers typically require manual grading.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grading Rubric (Optional)
                </label>
                <textarea
                  value={question.gradingRubric || ''}
                  onChange={(e) => handleFieldChange('gradingRubric', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter grading criteria (e.g., key points worth X points each)..."
                />
              </div>
            </div>
          )}

          {/* Code Question Configuration */}
          {question.type === 'code' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Programming Language
                </label>
                <select
                  value={question.programmingLanguage || 'javascript'}
                  onChange={(e) => handleFieldChange('programmingLanguage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="csharp">C#</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starting Code Template (Optional)
                </label>
                <textarea
                  value={question.codeTemplate || ''}
                  onChange={(e) => handleFieldChange('codeTemplate', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="// Starting code for students..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Solution ⭐
                </label>
                <textarea
                  value={question.expectedSolution || ''}
                  onChange={(e) => handleFieldChange('expectedSolution', e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="// Expected solution code..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This is the correct answer for this coding question.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Cases (Optional)
                </label>
                <textarea
                  value={question.testCases || ''}
                  onChange={(e) => handleFieldChange('testCases', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="// Test cases to validate the solution..."
                />
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explanation (Optional)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => handleFieldChange('explanation', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide an explanation for the correct answer..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamCreator() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set([0]));
  const [showPreview, setShowPreview] = useState(false);
  const isEditing = !!examId;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      subject: '',
      description: '',
      duration: 60,
      randomizeQuestions: false,
      allowMultipleAttempts: false,
      scheduledStartTime: '',
      scheduledEndTime: '',
      questions: [{
        type: 'single-choice',
        question: '',
        options: ['', ''],
        correctAnswers: [],
        points: 5,
        dragDropItems: [],
        dragDropTargets: [],
        expectedAnswer: '',
        gradingRubric: '',
        programmingLanguage: 'javascript',
        codeTemplate: '',
        expectedSolution: '',
        testCases: '',
        subQuestions: [],
      }],
    },
  });

  const questions = watch('questions') || [];

  const addQuestion = () => {
    const newQuestion = {
      type: 'single-choice' as const,
      question: '',
      options: ['', ''],
      correctAnswers: [],
      points: 5,
      dragDropItems: [],
      dragDropTargets: [],
      expectedAnswer: '',
      gradingRubric: '',
      programmingLanguage: 'javascript',
      codeTemplate: '',
      expectedSolution: '',
      testCases: '',
      subQuestions: [],
    };
    
    setValue('questions', [...questions, newQuestion]);
    setExpandedQuestions(new Set([questions.length]));
  };

  const updateQuestion = (index: number, updatedQuestion: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setValue('questions', newQuestions);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setValue('questions', newQuestions);
      setExpandedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const toggleQuestionExpand = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const onSubmit = async (data: ExamFormData) => {
    try {
      console.log('Saving exam:', data);
      
      // Validate that all questions have correct answers marked
      const invalidQuestions = data.questions.filter((q) => {
        if (q.type === 'single-choice' || q.type === 'multiple-choice') {
          return q.correctAnswers.length === 0;
        }
        if (q.type === 'drag-drop') {
          return !q.dragDropTargets?.every((target: any) => target.correctItemId);
        }
        if (q.type === 'case-study') {
          return !q.subQuestions?.every((sub: any) => sub.correctAnswers.length > 0);
        }
        return false;
      });

      if (invalidQuestions.length > 0) {
        alert('Please mark correct answers for all questions before saving.');
        return;
      }

      // Prepare exam data for API
      const examData = {
        id: examId || undefined,
        title: data.title,
        subject: data.subject,
        description: data.description,
        duration: data.duration,
        randomizeQuestions: data.randomizeQuestions,
        allowMultipleAttempts: data.allowMultipleAttempts,
        questions: data.questions,
        isPublished: false
      };

      // Save to backend API
      const response = await fetch('http://localhost:5000/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(examData),
      });

      if (!response.ok) {
        throw new Error('Failed to save exam');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Exam saved successfully!');
        navigate('/admin');
      } else {
        throw new Error(result.message || 'Failed to save exam');
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Failed to save exam. Please check if the backend server is running.');
    }
  };

  const publishExam = async () => {
    const formData = watch();
    
    if (!formData.title || !formData.subject || formData.questions.length === 0) {
      alert('Please complete all required fields before publishing.');
      return;
    }

    try {
      // First save the exam
      const examData = {
        id: examId || undefined,
        title: formData.title,
        subject: formData.subject,
        description: formData.description,
        duration: formData.duration,
        randomizeQuestions: formData.randomizeQuestions,
        allowMultipleAttempts: formData.allowMultipleAttempts,
        questions: formData.questions,
        isPublished: true,
        scheduledStartTime: formData.scheduledStartTime || null,
        scheduledEndTime: formData.scheduledEndTime || null
      };

      const response = await fetch('http://localhost:5000/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(examData),
      });

      if (!response.ok) {
        throw new Error('Failed to publish exam');
      }

      const result = await response.json();
      
      if (result.success) {
        let message = 'Exam published successfully! Students can now access this exam.';
        if (formData.scheduledStartTime) {
          message += `\n\nScheduled to start: ${new Date(formData.scheduledStartTime).toLocaleString()}`;
        }
        if (formData.scheduledEndTime) {
          message += `\nScheduled to end: ${new Date(formData.scheduledEndTime).toLocaleString()}`;
        }
        
        alert(message);
        navigate('/admin');
      } else {
        throw new Error(result.message || 'Failed to publish exam');
      }
    } catch (error) {
      console.error('Error publishing exam:', error);
      alert('Failed to publish exam. Please check if the backend server is running.');
    }
  };

  const previewExam = () => {
    setShowPreview(true);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Exam' : 'Create New Exam'}
          </h1>
          <p className="mt-2 text-gray-600">
            Build comprehensive tests with multiple question types
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={previewExam}
            className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </button>
          <button
            type="submit"
            form="exam-form"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Update Exam' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={publishExam}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Clock className="h-4 w-4 mr-2" />
            Publish Exam
          </button>
        </div>
      </div>

      <form id="exam-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Title *
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter exam title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                {...register('subject')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subject"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                {...register('duration', { valueAsNumber: true })}
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="60"
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="text-sm">Total Points: {totalPoints}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter exam description or instructions"
            />
          </div>

          {/* Scheduling Section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Exam Scheduling (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Start Time
                </label>
                <input
                  {...register('scheduledStartTime')}
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty for immediate availability
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled End Time
                </label>
                <input
                  {...register('scheduledEndTime')}
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty for no end time
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-6">
            <label className="flex items-center">
              <input
                {...register('randomizeQuestions')}
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Randomize question order</span>
            </label>

            <label className="flex items-center">
              <input
                {...register('allowMultipleAttempts')}
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow multiple attempts</span>
            </label>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionEditor
                key={index}
                question={question}
                index={index}
                onUpdate={updateQuestion}
                onDelete={deleteQuestion}
                isExpanded={expandedQuestions.has(index)}
                onToggleExpand={toggleQuestionExpand}
              />
            ))}
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      <ExamPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        exam={{
          title: watch('title') || 'Untitled Exam',
          subject: watch('subject') || 'No Subject',
          description: watch('description'),
          duration: watch('duration') || 60,
          questions: questions.map((q, index) => ({
            ...q,
            id: `preview-${index}`,
          })),
        }}
      />
    </div>
  );
}
