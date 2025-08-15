// New standardized evaluation logic that stores answers in the exact required format
function evaluateAndFormatAnswer(questionType, questionData, studentAnswer, totalMarks, questionText) {
  console.log(`🧮 Evaluating ${questionType} question with new format:`, {
    questionType,
    studentAnswer,
    totalMarks
  });

  try {
    // Parse question data if it's a string
    const parsedQuestionData = typeof questionData === 'string' ? JSON.parse(questionData) : questionData;
    
    switch (questionType) {
      case 'single-choice':
        return evaluateSingleChoiceNew(parsedQuestionData, studentAnswer, totalMarks);
        
      case 'multiple-choice':
        return evaluateMultipleChoiceNew(parsedQuestionData, studentAnswer, totalMarks);
        
      case 'case-study':
        return evaluateCaseStudyNew(parsedQuestionData, studentAnswer, totalMarks);
        
      case 'drag-drop':
      case 'drag-and-drop':
        return evaluateDragDropNew(parsedQuestionData, studentAnswer, totalMarks);
        
      case 'short-answer':
        return evaluateShortAnswerNew(parsedQuestionData, studentAnswer, totalMarks);
        
      default:
        return createFallbackAnswerNew(questionType, studentAnswer, totalMarks, `Unsupported question type: ${questionType}`);
    }
  } catch (error) {
    console.error('❌ Evaluation error:', error.message);
    return createFallbackAnswerNew(questionType, studentAnswer, totalMarks, `Evaluation error: ${error.message}`);
  }
}

function evaluateSingleChoiceNew(questionData, studentAnswer, totalMarks) {
  const correctAnswers = questionData.correctAnswers || null;
  
  // Handle comparison between string studentAnswer and correctAnswers (which could be string or array)
  let is_correct = false;
  if (correctAnswers !== null) {
    if (Array.isArray(correctAnswers)) {
      // If correctAnswers is an array, check if studentAnswer is in the array
      is_correct = correctAnswers.includes(studentAnswer);
    } else {
      // If correctAnswers is a string, do direct comparison
      is_correct = studentAnswer === correctAnswers;
    }
  }
  
  const marks_obtained = is_correct ? totalMarks : 0;

  const result = {
    questionType: "single-choice",
    studentAnswer: studentAnswer,
    correctAnswers: correctAnswers, // Use correctAnswers field for consistency
    is_correct: is_correct,
    marks_obtained: marks_obtained
  };

  return {
    isCorrect: is_correct,
    pointsEarned: marks_obtained,
    formattedAnswer: result
  };
}

function evaluateMultipleChoiceNew(questionData, studentAnswer, totalMarks) {
  const correctAnswers = questionData.correctAnswers || [];
  
  // Compare arrays (order doesn't matter)
  let is_correct = false;
  if (Array.isArray(studentAnswer) && Array.isArray(correctAnswers)) {
    const sortedStudent = [...studentAnswer].sort();
    const sortedCorrect = [...correctAnswers].sort();
    is_correct = JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect);
  }
  
  const marks_obtained = is_correct ? totalMarks : 0;

  const result = {
    questionType: "multiple-choice",
    studentAnswer: studentAnswer,
    correctAnswers: correctAnswers,
    is_correct: is_correct,
    marks_obtained: marks_obtained
  };

  return {
    isCorrect: is_correct,
    pointsEarned: marks_obtained,
    formattedAnswer: result
  };
}

function evaluateCaseStudyNew(questionData, studentAnswer, totalMarks) {
  const subQuestions = questionData.subQuestions || [];
  const caseStudyContext = questionData.caseStudyContext || questionData.questionText || 'Case study context';
  
  let total_marks_obtained = 0;
  const evaluatedSubQuestions = [];

  // studentAnswer should be an array of sub-question objects
  if (Array.isArray(studentAnswer)) {
    for (let i = 0; i < subQuestions.length; i++) {
      const subQ = subQuestions[i];
      const subAnswer = studentAnswer[i];
      
      if (subAnswer && subQ) {
        let subIsCorrect = false;
        let subMarks = 0;
        const subQuestionMarks = subQ.marks || Math.floor(totalMarks / subQuestions.length);
        
        if (subQ.questionType === 'single-choice') {
          const correctAnswers = subQ.correctAnswers || null;
          
          // Handle comparison between string studentAnswer and correctAnswers (which could be string or array)
          if (correctAnswers !== null) {
            if (Array.isArray(correctAnswers)) {
              // If correctAnswers is an array, check if studentAnswer is in the array
              subIsCorrect = correctAnswers.includes(subAnswer.studentAnswer);
            } else {
              // If correctAnswers is a string, do direct comparison
              subIsCorrect = subAnswer.studentAnswer === correctAnswers;
            }
          }
          subMarks = subIsCorrect ? subQuestionMarks : 0;
          
          evaluatedSubQuestions.push({
            questionType: "single-choice",
            questionText: subQ.questionText,
            studentAnswer: subAnswer.studentAnswer,
            correctAnswers: correctAnswers, // Use correctAnswers field for consistency
            is_correct: subIsCorrect,
            marks_obtained: subMarks
          });
          
        } else if (subQ.questionType === 'multiple-choice') {
          const correctAnswers = subQ.correctAnswers || [];
          if (Array.isArray(subAnswer.studentAnswer) && Array.isArray(correctAnswers)) {
            const sortedStudent = [...subAnswer.studentAnswer].sort();
            const sortedCorrect = [...correctAnswers].sort();
            subIsCorrect = JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect);
          }
          subMarks = subIsCorrect ? subQuestionMarks : 0;
          
          evaluatedSubQuestions.push({
            questionType: "multiple-choice",
            questionText: subQ.questionText,
            studentAnswer: subAnswer.studentAnswer,
            correctAnswers: correctAnswers,
            is_correct: subIsCorrect,
            marks_obtained: subMarks
          });
        }
        
        total_marks_obtained += subMarks;
      }
    }
  }

  const result = {
    questionType: "case-study",
    caseStudyContext: caseStudyContext,
    subQuestions: evaluatedSubQuestions,
    total_marks_obtained: total_marks_obtained
  };

  return {
    isCorrect: total_marks_obtained > 0,
    pointsEarned: total_marks_obtained,
    formattedAnswer: result
  };
}



function evaluateDragDropNew(questionData, studentAnswer, totalMarks) {
  const dragDropTargets = questionData.dragDropTargets || [];
  let is_correct = false;

  if (
    typeof studentAnswer === 'object' &&
    studentAnswer !== null &&
    !Array.isArray(studentAnswer)
  ) {
    // Check if all correctItemId are mapped to correct targetId
    is_correct = true;
    for (const target of dragDropTargets) {
      const correctItemId = target.correctItemId;
      const expectedTargetId = target.id;

      // Check if the student's answer places the correct item into the correct target
      const studentTargetId = studentAnswer[correctItemId];

      if (studentTargetId !== `target-${expectedTargetId}`) {
        is_correct = false;
        break;
      }
    }
  }

  const marks_obtained = is_correct ? totalMarks : 0;




  // CLEAN FORMAT - Exactly as specified, no nested objects or old format
  const result = {
    questionId: questionData.questionId || "q1",
    questionType: "drag-and-drop",
    dragDropTargets: dragDropTargets,
    studentAnswer: studentAnswer,
    is_correct: is_correct,
    marks_obtained: marks_obtained
  };

  // Return only the clean format - no wrapping, no old format references
  return {
    isCorrect: is_correct,
    pointsEarned: marks_obtained,
    formattedAnswer: result
  };
}

function evaluateShortAnswerNew(questionData, studentAnswer, totalMarks) {
  // For short answer, we can implement keyword matching or exact matching
  const correctAnswers = questionData.correctAnswers || questionData.correctAnswers || '';
  const acceptableAnswers = questionData.acceptableAnswers || [correctAnswers];
  
  let is_correct = false;
  if (typeof studentAnswer === 'string') {
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    is_correct = acceptableAnswers.some(acceptable => 
      normalizedStudent === acceptable.toLowerCase().trim()
    );
  }
  
  const marks_obtained = is_correct ? totalMarks : 0;

  const result = {
    questionType: "short-answer",
    studentAnswer: studentAnswer,
    correctAnswers: correctAnswers,
    is_correct: is_correct,
    marks_obtained: marks_obtained
  };

  return {
    isCorrect: is_correct,
    pointsEarned: marks_obtained,
    formattedAnswer: result
  };
}

function createFallbackAnswerNew(questionType, studentAnswer, totalMarks, errorMessage) {
  const result = {
    questionType: questionType,
    studentAnswer: studentAnswer,
    correctAnswers: null,
    is_correct: false,
    marks_obtained: 0,
    error: errorMessage,
    timestamp: new Date().toISOString()
  };

  return {
    isCorrect: false,
    pointsEarned: 0,
    formattedAnswer: result
  };
}

module.exports = {
  evaluateAndFormatAnswer
};
