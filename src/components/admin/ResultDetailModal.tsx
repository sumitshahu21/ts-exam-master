import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  BookOpen, 
  Trophy, 
  CheckCircle, 
  XCircle,
  Timer,
  FileText,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '../../services/authService';
import { toast } from 'react-hot-toast';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: number;
  resultData: any;
}

interface DetailedResult {
  attempt: {
    id: number;
    user_id: number;
    exam_id: number;
    start_time: string;
    end_time: string;
    status: string;
    total_score: number;
    is_submitted: boolean;
  };
  exam: {
    title: string;
    subject: string;
    duration: number;
    passing_score: number;
    total_questions: number;
  };
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  result: {
    total_score: number;
    percentage: number;
    grade: string;
    is_passed: boolean;
  };
  questions: Array<{
    id: number;
    question_text: string;
    question_type: string;
    marks: number;
    student_answer: any;
    correct_answer: any;
    is_correct: boolean;
    points_earned: number;
  }>;
}

function ResultDetailModal({ isOpen, onClose, attemptId, resultData }: ResultDetailModalProps) {
  const [detailedResult, setDetailedResult] = useState<DetailedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && attemptId) {
      fetchDetailedResult();
    }
  }, [isOpen, attemptId]);

  const fetchDetailedResult = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching detailed result for attempt:', attemptId);
      
      const response = await apiClient.get(`/results/attempt/${attemptId}/detailed`);
      
      console.log('📊 Detailed result response:', response.data);
      
      if (response.data.success && response.data.data) {
        setDetailedResult(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch detailed result');
      }
    } catch (err: any) {
      console.error('❌ Error fetching detailed result:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch detailed result');
      toast.error('Failed to load detailed result');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getQuestionTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'single-choice': 'Single Choice',
      'multiple-choice': 'Multiple Choice',
      'drag-drop': 'Drag & Drop',
      'case-study': 'Case Study',
      'short-answer': 'Short Answer'
    };
    return types[type] || type;
  };

  // Helper function to get option text by ID
  const getOptionText = (options: any[], optionId: string) => {
    const option = options?.find((opt: any) => opt.id === optionId);
    return option ? option.text : optionId;
  };

  // Helper function to get option number (A, B, C, etc.)
  const getOptionNumber = (options: any[], optionId: string) => {
    const index = options?.findIndex((opt: any) => opt.id === optionId);
    return index !== -1 ? String.fromCharCode(65 + index) : '?';
  };

  // Helper function to render sub-questions for case studies
  const renderSubQuestion = (subQuestion: any, subQuestionData: any, index: number) => {
    // Use questionType from subQuestionData if subQuestion doesn't have it (unattempted questions)
    const questionType = subQuestion.questionType || subQuestionData?.questionType;
    const studentAnswer = subQuestion.studentAnswer;
    const options = subQuestionData?.options || [];

    return (
      <div key={index} className="border border-gray-200 rounded p-3 bg-white">
        <div className="mb-2">
          <p className="font-semibold text-gray-800">Sub-question {index + 1}: {subQuestionData?.questionText}</p>
          <p className="text-xs text-gray-600">Type: {questionType}</p>
        </div>

        {(questionType === 'single-choice' || questionType === 'multiple-choice') && (
          <div className="space-y-2">
            {/* All Options - Always show for single/multiple choice */}
            <div>
              <span className="font-medium text-blue-700 text-xs">All Options:</span>
              <div className="mt-1 space-y-1">
                {options.map((option: any, optIndex: number) => {
                  const isSelected = questionType === 'single-choice' 
                    ? studentAnswer === option.id
                    : Array.isArray(studentAnswer) && studentAnswer.includes(option.id);
                  
                  return (
                    <div key={option.id} className={`p-2 rounded border text-xs ${
                      isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <span className="font-medium">[{String.fromCharCode(65 + optIndex)}]</span> {option.text}
                      {isSelected && <span className="ml-2 text-blue-600 font-medium">(Selected)</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Student Answer */}
            <div>
              <span className="font-medium text-blue-700 text-xs">Student's Answer: </span>
              {studentAnswer ? (
                questionType === 'single-choice' ? (
                  <span className="bg-blue-50 px-2 py-1 rounded text-xs">
                    [{getOptionNumber(options, studentAnswer)}] {getOptionText(options, studentAnswer)}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]).map((optionId: string, i: number) => (
                      <span key={i} className="bg-blue-50 px-2 py-1 rounded text-xs">
                        [{getOptionNumber(options, optionId)}] {getOptionText(options, optionId)}
                      </span>
                    ))}
                  </div>
                )
              ) : (
                <span className="text-gray-400 italic text-xs">No answer provided</span>
              )}
            </div>

            {/* Correct Answer */}
            <div>
              <span className="font-medium text-green-700 text-xs">Correct Answer: </span>
              {subQuestionData?.correctAnswers || subQuestionData?.correctAnswer || subQuestionData?.correct_answer ? (
                questionType === 'single-choice' ? (
                  <span className="bg-green-50 px-2 py-1 rounded text-green-800 text-xs">
                    [{getOptionNumber(options, (subQuestionData.correctAnswers?.[0] || subQuestionData.correctAnswer || subQuestionData.correct_answer))}] {getOptionText(options, (subQuestionData.correctAnswers?.[0] || subQuestionData.correctAnswer || subQuestionData.correct_answer))}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(subQuestionData.correctAnswers || 
                      Array.isArray(subQuestionData.correctAnswer || subQuestionData.correct_answer) ? 
                      (subQuestionData.correctAnswer || subQuestionData.correct_answer) : 
                      [subQuestionData.correctAnswer || subQuestionData.correct_answer]
                    ).map((optionId: string, i: number) => (
                      <span key={i} className="bg-green-50 px-2 py-1 rounded text-green-800 text-xs">
                        [{getOptionNumber(options, optionId)}] {getOptionText(options, optionId)}
                      </span>
                    ))}
                  </div>
                )
              ) : (
                <span className="text-gray-400 italic text-xs">No correct answer available</span>
              )}
            </div>

            {/* Result */}
            <div className="text-xs">
              <span className={`font-medium ${subQuestion.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                {subQuestion.is_correct ? '✓ Correct' : '✗ Incorrect'} 
                ({subQuestion.marks_obtained || 0}/{subQuestionData?.marks || 0} points)
              </span>
            </div>
          </div>
        )}

        {questionType !== 'single-choice' && questionType !== 'multiple-choice' && (
          <div className="text-xs">
            <span className="font-medium text-blue-700">Answer: </span>
            {studentAnswer ? (
              <code className="bg-blue-50 p-1 rounded">{JSON.stringify(studentAnswer, null, 2)}</code>
            ) : (
              <span className="text-gray-400 italic">No answer provided</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStudentAnswer = (question: any) => {
    const { question_type, student_answer, question_data } = question;
    
    // Debug logging
    console.log('Rendering question:', { question_type, student_answer, question_data });
    
    // Extract the actual answer from the parsed JSON object
    const actualAnswer = student_answer?.studentAnswer || student_answer;
    const options = question_data?.options || [];

    switch (question_type) {
      case 'single-choice':
        const selectedOptionText = actualAnswer ? getOptionText(options, actualAnswer) : null;
        const selectedOptionNumber = actualAnswer ? getOptionNumber(options, actualAnswer) : null;
        
        return (
          <div className="text-sm space-y-2">
            <div className="mb-3">
              <span className="font-medium text-blue-700">All Options:</span>
              <div className="mt-1 space-y-1">
                {options.map((option: any, index: number) => (
                  <div key={option.id} className={`p-2 rounded border ${
                    actualAnswer && option.id === actualAnswer 
                      ? 'bg-blue-100 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <span className="font-medium">[{String.fromCharCode(65 + index)}]</span> {option.text}
                    {actualAnswer && option.id === actualAnswer && <span className="ml-2 text-blue-600 font-medium">(Selected)</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="font-medium text-blue-700">Student's Answer: </span>
              {actualAnswer ? (
                <span className="bg-blue-50 px-2 py-1 rounded">
                  [{selectedOptionNumber}] {selectedOptionText}
                </span>
              ) : (
                <span className="text-gray-400 italic">No answer provided</span>
              )}
            </div>
          </div>
        );

      case 'multiple-choice':
        const selectedOptions = actualAnswer && Array.isArray(actualAnswer) ? actualAnswer : (actualAnswer ? [actualAnswer] : []);
        
        return (
          <div className="text-sm space-y-2">
            <div className="mb-3">
              <span className="font-medium text-blue-700">All Options:</span>
              <div className="mt-1 space-y-1">
                {options.map((option: any, index: number) => (
                  <div key={option.id} className={`p-2 rounded border ${
                    selectedOptions.includes(option.id)
                      ? 'bg-blue-100 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <span className="font-medium">[{String.fromCharCode(65 + index)}]</span> {option.text}
                    {selectedOptions.includes(option.id) && <span className="ml-2 text-blue-600 font-medium">(Selected)</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="font-medium text-blue-700">Student's Answer: </span>
              {selectedOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedOptions.map((optionId: string, index: number) => (
                    <span key={index} className="bg-blue-50 px-2 py-1 rounded text-sm">
                      [{getOptionNumber(options, optionId)}] {getOptionText(options, optionId)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">No answer provided</span>
              )}
            </div>
          </div>
        );

      case 'drag-and-drop':
      case 'drag-drop':
      case 'dragdrop':
        const dragDropData = question_data || {};
        const dragDropTargets = dragDropData.dragDropTargets || [];
        const dragDropItems = dragDropData.dragDropItems || [];
        const studentAnswerData = student_answer?.studentAnswer || {};
        
        // Helper function to get item content by ID
        const getItemContent = (itemId: string) => {
          const item = dragDropItems.find((item: any) => item.id === itemId);
          return item?.content || `Item ${itemId.replace('item-', '')}`;
        };
        
        return (
          <div className="text-sm space-y-3">
            {/* Student's Order */}
            <div>
              <span className="font-medium text-blue-700">Student's Order:</span>
              <div className="mt-1 space-y-1">
                {Object.keys(studentAnswerData).length > 0 ? (
                  Object.entries(studentAnswerData).map(([itemId], index: number) => {
                    const position = index + 1;
                    
                    return (
                      <div key={index} className="p-2 rounded border bg-blue-50 border-blue-300">
                        <span className="font-medium">{position}. {getItemContent(itemId)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 rounded border bg-gray-50 border-gray-200">
                    <span className="text-gray-400 italic">No answer provided</span>
                  </div>
                )}
              </div>
            </div>

            {/* Correct Order */}
            <div>
              <span className="font-medium text-green-700">Correct Order:</span>
              <div className="mt-1 space-y-1">
                {dragDropTargets.map((target: any, index: number) => {
                  const position = index + 1;
                  
                  return (
                    <div key={index} className="p-2 rounded border bg-green-50 border-green-300">
                      <span className="font-medium">{position}. {getItemContent(target.correctItemId)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'case-study':
        const caseStudyData = question_data || {};
        const subQuestions = caseStudyData.subQuestions || [];
        const studentSubQuestions = student_answer?.subQuestions || [];
        
        return (
          <div className="text-sm">
            <div className="mb-3">
              <span className="font-medium text-blue-700">Case Study Context: </span>
              <div className="bg-blue-50 p-2 rounded mt-1">
                <p className="text-sm">{caseStudyData.caseStudyText || 'No context provided'}</p>
              </div>
            </div>
            
            <span className="font-medium text-blue-700">Sub-questions: </span>
            <div className="mt-2 space-y-3">
              {subQuestions.length > 0 ? (
                subQuestions.map((subQuestionData: any, index: number) => {
                  // Find corresponding student answer for this sub-question
                  const studentSubQ = studentSubQuestions.find((sq: any) => 
                    sq.id === subQuestionData.id || index === studentSubQuestions.indexOf(sq)
                  ) || studentSubQuestions[index] || {};
                  
                  return renderSubQuestion(studentSubQ, subQuestionData, index);
                })
              ) : studentSubQuestions.length > 0 ? (
                // Fallback: show student answers even if we don't have the original sub-question data
                studentSubQuestions.map((subQ: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded p-3 bg-white">
                    <div className="mb-2">
                      <p className="font-semibold text-gray-800">Sub-question {index + 1}</p>
                      <p className="text-xs text-gray-600">Type: {subQ.questionType || 'Unknown'}</p>
                    </div>
                    <div className="text-xs">
                      <span className="font-medium text-blue-700">Answer: </span>
                      <code className="bg-blue-50 p-1 rounded">{JSON.stringify(subQ.studentAnswer, null, 2)}</code>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-gray-400 italic">No sub-questions or answers available</span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm">
            <span className="font-medium text-blue-700">Answer: </span>
            <div className="bg-blue-50 p-2 rounded mt-1">
              {actualAnswer ? (
                <code className="text-xs">{JSON.stringify(actualAnswer, null, 2)}</code>
              ) : (
                <span className="text-gray-400 italic">No answer provided</span>
              )}
            </div>
          </div>
        );
    }
  };

  const renderCorrectAnswer = (question: any) => {
    const { question_type, correct_answer, question_data } = question;
    
    // Don't show correct answer section for drag-and-drop and case-study
    if (question_type === 'drag-and-drop' || question_type === 'drag-drop' || 
        question_type === 'dragdrop' || question_type === 'case-study') {
      return null;
    }
    
    if (!correct_answer) {
      return <span className="text-gray-400 italic">No correct answer available</span>;
    }

    const options = question_data?.options || [];

    switch (question_type) {
      case 'single-choice':
        const correctOptionText = getOptionText(options, correct_answer[0] || correct_answer);
        const correctOptionNumber = getOptionNumber(options, correct_answer[0] || correct_answer);
        
        return (
          <div className="text-sm">
            <span className="font-medium text-green-700">Correct Answer: </span>
            <span className="bg-green-50 px-2 py-1 rounded text-green-800">
              [{correctOptionNumber}] {correctOptionText}
            </span>
          </div>
        );

      case 'multiple-choice':
        const correctOptions = Array.isArray(correct_answer) 
          ? correct_answer 
          : [correct_answer];
        
        return (
          <div className="space-y-1">
            <span className="font-medium text-green-700">Correct Options:</span>
            <div className="flex flex-wrap gap-1">
              {correctOptions.map((optionId: any, index: number) => (
                <span key={index} className="bg-green-50 px-2 py-1 rounded text-sm text-green-800">
                  [{getOptionNumber(options, optionId)}] {getOptionText(options, optionId)}
                </span>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm">
            <span className="font-medium text-green-700">Correct Answer: </span>
            <div className="bg-green-50 p-2 rounded mt-1">
              <code className="text-xs text-green-800">{JSON.stringify(correct_answer, null, 2)}</code>
            </div>
          </div>
        );
    }
  };

  const exportToPDF = () => {
    if (!detailedResult) return;
    
    // Safe date formatting helper
    const formatSafeDate = (dateValue: any, formatStr: string = 'PPP') => {
      try {
        if (!dateValue) return 'N/A';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, formatStr);
      } catch (error) {
        console.error('Date formatting error:', error);
        return 'Date unavailable';
      }
    };

    // Helper function to render student answer for PDF
    const renderStudentAnswerForPDF = (question: any) => {
      const { question_type, student_answer, question_data } = question;
      const actualAnswer = student_answer?.studentAnswer || student_answer;
      const options = question_data?.options || [];

      switch (question_type) {
        case 'single-choice':
          const selectedOptionText = actualAnswer ? getOptionText(options, actualAnswer) : null;
          const selectedOptionNumber = actualAnswer ? getOptionNumber(options, actualAnswer) : null;
          
          return `
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 10px;">
                <span style="font-weight: 600; color: #2563eb; font-size: 14px;">All Options:</span>
                <div style="margin-top: 5px;">
                  ${options.map((option: any, index: number) => `
                    <div style="padding: 8px; margin: 4px 0; border-radius: 6px; border: 1px solid ${actualAnswer && option.id === actualAnswer ? '#93c5fd' : '#d1d5db'}; background-color: ${actualAnswer && option.id === actualAnswer ? '#dbeafe' : '#f9fafb'}; font-size: 12px;">
                      <span style="font-weight: 500;">[${String.fromCharCode(65 + index)}]</span> ${option.text}
                      ${actualAnswer && option.id === actualAnswer ? '<span style="margin-left: 8px; color: #2563eb; font-weight: 500;">(Selected)</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
              <div>
                <span style="font-weight: 600; color: #2563eb; font-size: 14px;">Student's Answer: </span>
                ${actualAnswer ? 
                  `<span style="background-color: #eff6ff; padding: 4px 8px; border-radius: 4px; font-size: 14px;">[${selectedOptionNumber}] ${selectedOptionText}</span>` :
                  '<span style="color: #9ca3af; font-style: italic; font-size: 14px;">No answer provided</span>'
                }
              </div>
            </div>
          `;

        case 'multiple-choice':
          const selectedOptions = actualAnswer && Array.isArray(actualAnswer) ? actualAnswer : (actualAnswer ? [actualAnswer] : []);
          
          return `
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 10px;">
                <span style="font-weight: 600; color: #2563eb; font-size: 14px;">All Options:</span>
                <div style="margin-top: 5px;">
                  ${options.map((option: any, index: number) => `
                    <div style="padding: 8px; margin: 4px 0; border-radius: 6px; border: 1px solid ${selectedOptions.includes(option.id) ? '#93c5fd' : '#d1d5db'}; background-color: ${selectedOptions.includes(option.id) ? '#dbeafe' : '#f9fafb'}; font-size: 12px;">
                      <span style="font-weight: 500;">[${String.fromCharCode(65 + index)}]</span> ${option.text}
                      ${selectedOptions.includes(option.id) ? '<span style="margin-left: 8px; color: #2563eb; font-weight: 500;">(Selected)</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
              <div>
                <span style="font-weight: 600; color: #2563eb; font-size: 14px;">Student's Answer: </span>
                ${selectedOptions.length > 0 ? 
                  `<div style="margin-top: 4px;">${selectedOptions.map((optionId: string) => 
                    `<span style="background-color: #eff6ff; padding: 4px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px;">[${getOptionNumber(options, optionId)}] ${getOptionText(options, optionId)}</span>`
                  ).join('')}</div>` :
                  '<span style="color: #9ca3af; font-style: italic; font-size: 14px;">No answer provided</span>'
                }
              </div>
            </div>
          `;

        case 'drag-and-drop':
        case 'drag-drop':
        case 'dragdrop':
          const dragDropData = question_data || {};
          const dragDropTargets = dragDropData.dragDropTargets || [];
          const dragDropItems = dragDropData.dragDropItems || [];
          const studentAnswerData = student_answer?.studentAnswer || {};
          
          const getItemContent = (itemId: string) => {
            const item = dragDropItems.find((item: any) => item.id === itemId);
            return item?.content || `Item ${itemId.replace('item-', '')}`;
          };

          return `
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600; color: #2563eb; font-size: 14px;">Student's Order:</span>
                <div style="margin-top: 5px;">
                  ${Object.keys(studentAnswerData).length > 0 ? 
                    Object.entries(studentAnswerData).map(([itemId], index: number) => 
                      `<div style="padding: 8px; margin: 4px 0; border-radius: 6px; border: 1px solid #93c5fd; background-color: #dbeafe; font-size: 12px;">
                        <span style="font-weight: 500;">${index + 1}. ${getItemContent(itemId)}</span>
                      </div>`
                    ).join('') :
                    '<div style="padding: 8px; margin: 4px 0; border-radius: 6px; border: 1px solid #d1d5db; background-color: #f9fafb; font-size: 12px;"><span style="color: #9ca3af; font-style: italic;">No answer provided</span></div>'
                  }
                </div>
              </div>
              <div>
                <span style="font-weight: 600; color: #059669; font-size: 14px;">Correct Order:</span>
                <div style="margin-top: 5px;">
                  ${dragDropTargets.map((target: any, index: number) => 
                    `<div style="padding: 8px; margin: 4px 0; border-radius: 6px; border: 1px solid #34d399; background-color: #d1fae5; font-size: 12px;">
                      <span style="font-weight: 500;">${index + 1}. ${getItemContent(target.correctItemId)}</span>
                    </div>`
                  ).join('')}
                </div>
              </div>
            </div>
          `;

        case 'case-study':
          const caseStudyData = question_data || {};
          const subQuestions = caseStudyData.subQuestions || [];
          const studentSubQuestions = student_answer?.subQuestions || [];
          
          return `
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600; color: #2563eb; font-size: 14px;">Case Study Context: </span>
                <div style="background-color: #eff6ff; padding: 8px; border-radius: 6px; margin-top: 4px;">
                  <p style="font-size: 14px; margin: 0;">${caseStudyData.caseStudyText || 'No context provided'}</p>
                </div>
              </div>
              <span style="font-weight: 600; color: #2563eb; font-size: 14px;">Sub-questions: </span>
              <div style="margin-top: 8px;">
                ${subQuestions.length > 0 ? 
                  subQuestions.map((subQuestionData: any, index: number) => {
                    const studentSubQ = studentSubQuestions.find((sq: any) => 
                      sq.id === subQuestionData.id || index === studentSubQuestions.indexOf(sq)
                    ) || studentSubQuestions[index] || {};
                    
                    const questionType = studentSubQ.questionType || subQuestionData?.questionType;
                    const studentAnswer = studentSubQ.studentAnswer;
                    const options = subQuestionData?.options || [];
                    
                    if (questionType === 'single-choice' || questionType === 'multiple-choice') {
                      return `
                        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background-color: white; margin-bottom: 8px;">
                          <div style="margin-bottom: 8px;">
                            <p style="font-weight: 600; color: #374151; margin: 0 0 4px 0;">Sub-question ${index + 1}: ${subQuestionData?.questionText}</p>
                            <p style="font-size: 12px; color: #6b7280; margin: 0;">Type: ${questionType}</p>
                          </div>
                          <div style="margin-bottom: 8px;">
                            <span style="font-weight: 600; color: #2563eb; font-size: 12px;">All Options:</span>
                            <div style="margin-top: 4px;">
                              ${options.map((option: any, optIndex: number) => {
                                const isSelected = questionType === 'single-choice' 
                                  ? studentAnswer === option.id
                                  : Array.isArray(studentAnswer) && studentAnswer.includes(option.id);
                                
                                return `
                                  <div style="padding: 8px; margin: 2px 0; border-radius: 4px; border: 1px solid ${isSelected ? '#93c5fd' : '#d1d5db'}; background-color: ${isSelected ? '#dbeafe' : '#f9fafb'}; font-size: 12px;">
                                    <span style="font-weight: 500;">[${String.fromCharCode(65 + optIndex)}]</span> ${option.text}
                                    ${isSelected ? '<span style="margin-left: 8px; color: #2563eb; font-weight: 500;">(Selected)</span>' : ''}
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          </div>
                          <div style="margin-bottom: 8px;">
                            <span style="font-weight: 600; color: #2563eb; font-size: 12px;">Student's Answer: </span>
                            ${studentAnswer ? 
                              (questionType === 'single-choice' ? 
                                `<span style="background-color: #eff6ff; padding: 4px 8px; border-radius: 4px; font-size: 12px;">[${getOptionNumber(options, studentAnswer)}] ${getOptionText(options, studentAnswer)}</span>` :
                                `<div style="margin-top: 4px;">${(Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]).map((optionId: string) => 
                                  `<span style="background-color: #eff6ff; padding: 4px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px;">[${getOptionNumber(options, optionId)}] ${getOptionText(options, optionId)}</span>`
                                ).join('')}</div>`
                              ) :
                              '<span style="color: #9ca3af; font-style: italic; font-size: 12px;">No answer provided</span>'
                            }
                          </div>
                          <div style="margin-bottom: 8px;">
                            <span style="font-weight: 600; color: #059669; font-size: 12px;">Correct Answer: </span>
                            ${subQuestionData?.correctAnswers || subQuestionData?.correctAnswer || subQuestionData?.correct_answer ? 
                              (questionType === 'single-choice' ? 
                                `<span style="background-color: #f0fdf4; padding: 4px 8px; border-radius: 4px; color: #166534; font-size: 12px;">[${getOptionNumber(options, (subQuestionData.correctAnswers?.[0] || subQuestionData.correctAnswer || subQuestionData.correct_answer))}] ${getOptionText(options, (subQuestionData.correctAnswers?.[0] || subQuestionData.correctAnswer || subQuestionData.correct_answer))}</span>` :
                                `<div style="margin-top: 4px;">${(subQuestionData.correctAnswers || 
                                  Array.isArray(subQuestionData.correctAnswer || subQuestionData.correct_answer) ? 
                                  (subQuestionData.correctAnswer || subQuestionData.correct_answer) : 
                                  [subQuestionData.correctAnswer || subQuestionData.correct_answer]
                                ).map((optionId: string) => 
                                  `<span style="background-color: #f0fdf4; padding: 4px 8px; border-radius: 4px; color: #166534; margin: 2px; display: inline-block; font-size: 12px;">[${getOptionNumber(options, optionId)}] ${getOptionText(options, optionId)}</span>`
                                ).join('')}</div>`
                              ) :
                              '<span style="color: #9ca3af; font-style: italic; font-size: 12px;">No correct answer available</span>'
                            }
                          </div>
                          <div style="font-size: 12px;">
                            <span style="font-weight: 600; color: ${studentSubQ.is_correct ? '#059669' : '#dc2626'};">
                              ${studentSubQ.is_correct ? '✓ Correct' : '✗ Incorrect'} 
                              (${studentSubQ.marks_obtained || 0}/${subQuestionData?.marks || 0} points)
                            </span>
                          </div>
                        </div>
                      `;
                    } else {
                      return `
                        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background-color: white; margin-bottom: 8px;">
                          <div style="margin-bottom: 8px;">
                            <p style="font-weight: 600; color: #374151; margin: 0 0 4px 0;">Sub-question ${index + 1}: ${subQuestionData?.questionText}</p>
                            <p style="font-size: 12px; color: #6b7280; margin: 0;">Type: ${questionType}</p>
                          </div>
                          <div style="font-size: 12px;">
                            <span style="font-weight: 600; color: #2563eb;">Answer: </span>
                            ${studentAnswer ? 
                              `<code style="background-color: #eff6ff; padding: 4px; border-radius: 4px;">${JSON.stringify(studentAnswer, null, 2)}</code>` :
                              '<span style="color: #9ca3af; font-style: italic;">No answer provided</span>'
                            }
                          </div>
                        </div>
                      `;
                    }
                  }).join('') :
                  '<span style="color: #9ca3af; font-style: italic; font-size: 14px;">No sub-questions or answers available</span>'
                }
              </div>
            </div>
          `;

        default:
          return `
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #2563eb; font-size: 14px;">Answer: </span>
              <div style="background-color: #eff6ff; padding: 8px; border-radius: 6px; margin-top: 4px;">
                ${actualAnswer ? 
                  `<code style="font-size: 12px;">${JSON.stringify(actualAnswer, null, 2)}</code>` :
                  '<span style="color: #9ca3af; font-style: italic; font-size: 14px;">No answer provided</span>'
                }
              </div>
            </div>
          `;
      }
    };

    // Helper function to render correct answer for PDF
    const renderCorrectAnswerForPDF = (question: any) => {
      const { question_type, correct_answer, question_data } = question;
      
      // Don't show correct answer section for drag-and-drop and case-study
      if (question_type === 'drag-and-drop' || question_type === 'drag-drop' || 
          question_type === 'dragdrop' || question_type === 'case-study') {
        return '';
      }
      
      if (!correct_answer) {
        return '<span style="color: #9ca3af; font-style: italic; font-size: 14px;">No correct answer available</span>';
      }

      const options = question_data?.options || [];

      switch (question_type) {
        case 'single-choice':
          const correctOptionText = getOptionText(options, correct_answer[0] || correct_answer);
          const correctOptionNumber = getOptionNumber(options, correct_answer[0] || correct_answer);
          
          return `
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #059669; font-size: 14px;">Correct Answer: </span>
              <span style="background-color: #f0fdf4; padding: 4px 8px; border-radius: 4px; color: #166534; font-size: 14px;">
                [${correctOptionNumber}] ${correctOptionText}
              </span>
            </div>
          `;

        case 'multiple-choice':
          const correctOptions = Array.isArray(correct_answer) ? correct_answer : [correct_answer];
          
          return `
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #059669; font-size: 14px;">Correct Options:</span>
              <div style="margin-top: 4px;">
                ${correctOptions.map((optionId: any) => 
                  `<span style="background-color: #f0fdf4; padding: 4px 8px; border-radius: 4px; color: #166534; margin: 2px; display: inline-block; font-size: 12px;">
                    [${getOptionNumber(options, optionId)}] ${getOptionText(options, optionId)}
                  </span>`
                ).join('')}
              </div>
            </div>
          `;

        default:
          return `
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #059669; font-size: 14px;">Correct Answer: </span>
              <div style="background-color: #f0fdf4; padding: 8px; border-radius: 6px; margin-top: 4px;">
                <code style="font-size: 12px; color: #166534;">${JSON.stringify(correct_answer, null, 2)}</code>
              </div>
            </div>
          `;
      }
    };

    // Pre-format dates
    const startedAtFormatted = formatSafeDate(detailedResult.attempt.start_time);
    const generatedOnFormatted = formatSafeDate(new Date(), 'PPPp');
    
    // Create a temporary element with the content
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; margin: 20px; color: #333;">
        <!-- Header Section -->
        <div style="border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #1f2937; font-size: 24px;">Test Result Details</h1>
          <h2 style="margin: 10px 0; color: #374151; font-size: 20px;">${detailedResult.exam.title}</h2>
        </div>
        
        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px;">
            <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #1e40af;">Student</p>
            <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #1e3a8a;">
              ${detailedResult.user.first_name} ${detailedResult.user.last_name}
            </p>
            <p style="margin: 0; font-size: 14px; color: #1d4ed8;">${detailedResult.user.email}</p>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px;">
            <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #166534;">Score</p>
            <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #14532d;">
              ${detailedResult.result.total_score || detailedResult.attempt.total_score || 0}%
            </p>
            <p style="margin: 0; font-size: 14px; color: #15803d;">
              ${detailedResult.result.is_passed ? '✓ PASSED' : '✗ FAILED'}
            </p>
          </div>
          
          <div style="background-color: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 15px;">
            <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #7c3aed;">Exam</p>
            <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #6b21a8;">${detailedResult.exam.title}</p>
            <p style="margin: 0; font-size: 14px; color: #7c2d12;">${detailedResult.exam.subject}</p>
          </div>
          
          <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px;">
            <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #ea580c;">Date</p>
            <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #9a3412;">
              ${detailedResult.attempt.end_time ? 
                formatDuration(detailedResult.attempt.start_time, detailedResult.attempt.end_time) : 
                'In Progress'
              }
            </p>
            <p style="margin: 0; font-size: 14px; color: #c2410c;">${startedAtFormatted}</p>
          </div>
        </div>
        
        <!-- Questions Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Questions & Answers</h3>
          ${detailedResult.questions.map((question, index) => `
            <div style="border: 1px solid ${question.is_correct ? '#bbf7d0' : '#fecaca'}; background-color: ${question.is_correct ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; align-items: center;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background-color: #dbeafe; color: #1e40af; font-size: 14px; font-weight: 600; border-radius: 50%; margin-right: 8px;">
                    ${index + 1}
                  </span>
                  <span style="font-size: 14px; font-weight: 600; color: #4b5563; margin-right: 8px;">
                    ${getQuestionTypeDisplay(question.question_type)}
                  </span>
                  <span style="font-size: 14px; color: #6b7280;">(${question.marks} marks)</span>
                </div>
                <div style="background-color: ${question.is_correct ? '#dcfce7' : '#fee2e2'}; color: ${question.is_correct ? '#166534' : '#991b1b'}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                  ${question.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  (${question.points_earned || 0}/${question.marks})
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <p style="font-weight: 600; color: #111827; margin: 0 0 4px 0;">Question:</p>
                <p style="color: #374151; margin: 0;">${question.question_text}</p>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="font-weight: 600; color: #111827; margin: 0 0 8px 0;">Student's Answer:</p>
                  ${renderStudentAnswerForPDF(question)}
                </div>
                <div>
                  <p style="font-weight: 600; color: #111827; margin: 0 0 8px 0;">Correct Answer:</p>
                  ${renderCorrectAnswerForPDF(question)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; color: #6b7280; font-size: 12px;">
          Generated on ${generatedOnFormatted}
        </div>
      </div>
    `;

    // Configure html2pdf options
    const options = {
      margin: 0.5,
      filename: `test-result-${detailedResult.user.first_name}-${detailedResult.user.last_name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generate and download PDF
    html2pdf()
      .from(element)
      .set(options)
      .save()
      .then(() => {
        toast.success('PDF exported successfully');
      })
      .catch((error: any) => {
        console.error('PDF export error:', error);
        toast.error('Failed to export PDF');
      });
  };

  const exportToCSV = () => {
    if (!detailedResult) return;

    const headers = ['Student Name', 'Email', 'Exam', 'Question', 'Student Answer', 'Correct Answer', 'Is Correct', 'Points'];
    const rows = detailedResult.questions.map((q, index) => [
      `${detailedResult.user.first_name} ${detailedResult.user.last_name}`,
      detailedResult.user.email,
      detailedResult.exam.title,
      `Q${index + 1}: ${q.question_text}`,
      q.student_answer ? JSON.stringify(q.student_answer) : 'No answer',
      q.correct_answer ? JSON.stringify(q.correct_answer) : 'N/A',
      q.is_correct ? 'Correct' : 'Incorrect',
      `${q.points_earned || 0}/${q.marks}`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-result-data-${detailedResult.user.first_name}-${detailedResult.user.last_name}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Result data exported as CSV');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Test Result Details</h2>
              <p className="text-sm text-gray-500">
                {resultData?.first_name} {resultData?.last_name} - {resultData?.exam_title}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {detailedResult && (
              <>
                <button
                  onClick={exportToPDF}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={fetchDetailedResult}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : detailedResult ? (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Student</p>
                      <p className="text-lg font-bold text-blue-900">
                        {detailedResult.user.first_name} {detailedResult.user.last_name}
                      </p>
                      <p className="text-sm text-blue-700">{detailedResult.user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Trophy className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Score</p>
                      <p className="text-lg font-bold text-green-900">
                        {detailedResult.result.total_score || detailedResult.attempt.total_score || 0}%
                      </p>
                      <p className="text-sm text-green-700">
                        {detailedResult.result.is_passed ? '✓ PASSED' : '✗ FAILED'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-purple-800">Exam</p>
                      <p className="text-lg font-bold text-purple-900">{detailedResult.exam.title}</p>
                      <p className="text-sm text-purple-700">{detailedResult.exam.subject}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Timer className="h-5 w-5 text-orange-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Duration</p>
                      <p className="text-lg font-bold text-orange-900">
                        {detailedResult.attempt.end_time ? 
                          formatDuration(detailedResult.attempt.start_time, detailedResult.attempt.end_time) : 
                          'In Progress'
                        }
                      </p>
                      <p className="text-sm text-orange-700">
                        {format(new Date(detailedResult.attempt.start_time), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Attempt Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status: </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      detailedResult.attempt.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {detailedResult.attempt.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Timer className="h-3 w-3 mr-1" />
                      )}
                      {detailedResult.attempt.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Questions Answered: </span>
                    <span className="text-gray-900">
                      {detailedResult.questions.filter(q => q.student_answer).length} / {detailedResult.questions.length}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions & Answers</h3>
                <div className="space-y-4">
                  {detailedResult.questions.map((question, index) => (
                    <div key={question.id} className={`border rounded-lg p-4 ${
                      question.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-600">
                            {getQuestionTypeDisplay(question.question_type)}
                          </span>
                          <span className="text-sm text-gray-500">({question.marks} marks)</span>
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          question.is_correct 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {question.is_correct ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {question.is_correct ? 'Correct' : 'Incorrect'}
                          <span className="ml-1">({question.points_earned || 0}/{question.marks})</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-gray-900">Question:</p>
                          <p className="text-gray-700 mt-1">{question.question_text}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium text-gray-900 mb-2">Student's Answer:</p>
                            {renderStudentAnswer(question)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 mb-2">Correct Answer:</p>
                            {renderCorrectAnswer(question)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultDetailModal;
