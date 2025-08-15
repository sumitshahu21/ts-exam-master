// Standardized evaluation logic for all question types
function evaluateStandardizedAnswer(questionType, questionData, studentAnswer, totalMarks, questionText) {
  console.log(`🧮 Evaluating ${questionType} question:`, {
    questionData: typeof questionData === 'string' ? questionData.substring(0, 200) + '...' : questionData,
    studentAnswer,
    totalMarks
  });

  let isCorrect = false;
  let pointsEarned = 0;
  let evaluationDetails = {};

  try {
    // Parse question data if it's a string
    const parsedQuestionData = typeof questionData === 'string' ? JSON.parse(questionData) : questionData;
    
    // Validate required fields
    if (!parsedQuestionData || !parsedQuestionData.id) {
      throw new Error('Invalid question data format - missing required fields');
    }

    switch (questionType) {
      case 'single-choice':
        evaluationDetails = evaluateSingleChoice(parsedQuestionData, studentAnswer, totalMarks);
        break;
        
      case 'multiple-choice':
        evaluationDetails = evaluateMultipleChoice(parsedQuestionData, studentAnswer, totalMarks);
        break;
        
      case 'drag-and-drop':
        evaluationDetails = evaluateDragAndDrop(parsedQuestionData, studentAnswer, totalMarks);
        break;
        
      case 'case-study':
        evaluationDetails = evaluateCaseStudy(parsedQuestionData, studentAnswer, totalMarks);
        break;
        
      case 'short-answer':
        evaluationDetails = evaluateShortAnswer(parsedQuestionData, studentAnswer, totalMarks);
        break;
        
      case 'code':
        evaluationDetails = evaluateCodeQuestion(parsedQuestionData, studentAnswer, totalMarks);
        break;
        
      default:
        throw new Error(`Unsupported question type: ${questionType}`);
    }

    isCorrect = evaluationDetails.isCorrect;
    pointsEarned = evaluationDetails.pointsEarned;

    // Create standardized response format
    const standardizedResponse = {
      questionId: parsedQuestionData.id,
      questionType: questionType,
      questionText: parsedQuestionData.questionText || questionText || 'Question text not available',
      selectedOptions: evaluationDetails.selectedOptions || null,
      correctOptions: evaluationDetails.correctOptions || null,
      dragDropResults: evaluationDetails.dragDropResults || null,
      correctItemIds: evaluationDetails.correctItemIds || null,
      subQuestionResults: evaluationDetails.subQuestionResults || null,
      isCorrect: isCorrect,
      pointsEarned: pointsEarned,
      totalPoints: totalMarks,
      rawAnswer: studentAnswer,
      evaluationMethod: 'standardized',
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Evaluation complete: ${isCorrect ? 'CORRECT' : 'INCORRECT'} - ${pointsEarned}/${totalMarks} points`);

    return {
      isCorrect,
      pointsEarned,
      formattedAnswer: standardizedResponse
    };

  } catch (error) {
    console.error('❌ Error in standardized evaluation:', error.message);
    
    // Fallback response
    const fallbackResponse = {
      questionId: 'unknown',
      questionType: questionType,
      questionText: questionText || 'Question text not available',
      selectedOptions: null,
      correctOptions: null,
      isCorrect: false,
      pointsEarned: 0,
      totalPoints: totalMarks,
      rawAnswer: studentAnswer,
      evaluationMethod: 'fallback',
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return {
      isCorrect: false,
      pointsEarned: 0,
      formattedAnswer: fallbackResponse
    };
  }
}

// Single Choice Evaluation
function evaluateSingleChoice(questionData, studentAnswer, totalMarks) {
  console.log('📊 Single Choice Evaluation:', { questionData, studentAnswer });

  // Handle both old and new formats
  let correctAnswer;
  
  if (questionData.correctAnswer) {
    // New standardized format: single correctAnswer
    correctAnswer = questionData.correctAnswer;
  } else if (questionData.correctAnswers && questionData.correctAnswers.length > 0) {
    // Legacy format: correctAnswers array, take first one
    correctAnswer = questionData.correctAnswers[0];
  } else if (questionData.options) {
    // Extract correct answer from options array
    const correctOption = questionData.options.find(opt => opt.isCorrect);
    correctAnswer = correctOption ? correctOption.id : null;
  }

  if (!correctAnswer) {
    console.error('❌ No correct answer found in question data');
    return {
      isCorrect: false,
      pointsEarned: 0,
      selectedOptions: [studentAnswer],
      correctOptions: []
    };
  }

  // Student answer should already be in format "opt1", "opt2", etc.
  const normalizedStudentAnswer = typeof studentAnswer === 'number' 
    ? `opt${studentAnswer + 1}` 
    : studentAnswer;

  const isCorrect = normalizedStudentAnswer === correctAnswer;
  const pointsEarned = isCorrect ? totalMarks : 0;
  
  console.log(`✅ Single Choice Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'} - ${pointsEarned}/${totalMarks} points`);
  
  return {
    isCorrect,
    pointsEarned,
    selectedOptions: [normalizedStudentAnswer],
    correctOptions: [correctAnswer]
  };
}

// Multiple Choice Evaluation
function evaluateMultipleChoice(questionData, studentAnswer, totalMarks) {
  console.log('📊 Multiple Choice Evaluation:', { questionData, studentAnswer });

  // Handle both old and new formats
  let correctAnswers = [];
  
  if (questionData.correctAnswers && Array.isArray(questionData.correctAnswers)) {
    // New standardized format: correctAnswers array
    correctAnswers = questionData.correctAnswers;
  } else if (questionData.options) {
    // Extract correct answers from options array
    correctAnswers = questionData.options
      .filter(opt => opt.isCorrect)
      .map(opt => opt.id);
  }

  if (correctAnswers.length === 0) {
    console.error('❌ No correct answers found in question data');
    return {
      isCorrect: false,
      pointsEarned: 0,
      selectedOptions: [],
      correctOptions: []
    };
  }

  // Student answer should already be in format ["opt1", "opt3"], etc.
  const selectedAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
  
  // Normalize in case we get numbers instead of option IDs
  const normalizedSelections = selectedAnswers
    .filter(ans => ans !== null && ans !== undefined)
    .map(ans => typeof ans === 'number' ? `opt${ans + 1}` : ans);
  
  // For multiple choice, we require exact match (all correct, no incorrect)
  const correctSet = new Set(correctAnswers);
  const selectedSet = new Set(normalizedSelections);
  
  // Check if sets are identical
  const isCorrect = correctSet.size === selectedSet.size && 
                   [...correctSet].every(answer => selectedSet.has(answer));
  
  const pointsEarned = isCorrect ? totalMarks : 0;
  
  console.log(`✅ Multiple Choice Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'} - ${pointsEarned}/${totalMarks} points`);
  console.log(`Selected: [${normalizedSelections.join(', ')}], Correct: [${correctAnswers.join(', ')}]`);
  
  return {
    isCorrect,
    pointsEarned,
    selectedOptions: normalizedSelections,
    correctOptions: correctAnswers
  };
}

// Drag and Drop Evaluation
function evaluateDragAndDrop(questionData, studentAnswer, totalMarks) {
  console.log('📊 Drag and Drop Evaluation:', { questionData, studentAnswer });

  // Student answer should be in format: { "item-1": "target-2", "item-2": "target-1" }
  const studentPlacements = studentAnswer || {};
  
  // Handle different question data formats
  let correctMappings = {};
  
  if (questionData.correctMappings) {
    // New standardized format
    correctMappings = questionData.correctMappings;
  } else if (questionData.dragDropTargets) {
    // Legacy format - extract from targets
    questionData.dragDropTargets.forEach(target => {
      if (target.correctItemId) {
        correctMappings[target.correctItemId] = target.id;
      }
    });
  }

  if (Object.keys(correctMappings).length === 0) {
    console.error('❌ No correct mappings found in question data');
    return {
      isCorrect: false,
      pointsEarned: 0,
      dragDropResults: {},
      correctItemIds: {}
    };
  }

  let correctPlacements = 0;
  const totalExpectedPlacements = Object.keys(correctMappings).length;
  const results = {};
  
  // Check each expected mapping
  Object.entries(correctMappings).forEach(([itemId, expectedTargetId]) => {
    const studentTargetId = studentPlacements[itemId];
    const isCorrect = studentTargetId === expectedTargetId;
    
    results[itemId] = {
      assignedTarget: studentTargetId || null,
      correctTarget: expectedTargetId,
      isCorrect: isCorrect
    };
    
    if (isCorrect) {
      correctPlacements++;
    }
  });
  
  const isCorrect = correctPlacements === totalExpectedPlacements;
  const pointsEarned = isCorrect ? totalMarks : 0; // All or nothing for drag-drop
  
  console.log(`✅ Drag and Drop Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'} - ${pointsEarned}/${totalMarks} points`);
  console.log(`Correct placements: ${correctPlacements}/${totalExpectedPlacements}`);
  
  return {
    isCorrect,
    pointsEarned,
    dragDropResults: results,
    correctItemIds: correctMappings
  };
}

// Case Study Evaluation
function evaluateCaseStudy(questionData, studentAnswer, totalMarks) {
  console.log('📊 Case Study Evaluation:', { questionData, studentAnswer });

  const subQuestions = questionData.subQuestions || [];
  
  // Student answer should be in format:
  // [
  //   { questionText: "...", questionType: "single-choice", studentAnswer: "opt1" },
  //   { questionText: "...", questionType: "multiple-choice", studentAnswer: ["opt1", "opt2"] }
  // ]
  const studentSubAnswers = Array.isArray(studentAnswer) ? studentAnswer : [];
  
  let totalSubPoints = 0;
  let earnedSubPoints = 0;
  const subQuestionResults = [];
  
  subQuestions.forEach((subQ, index) => {
    const subAnswer = studentSubAnswers[index];
    let subResult;
    
    if (!subAnswer) {
      // No answer provided for this sub-question
      subResult = { isCorrect: false, pointsEarned: 0 };
    } else if (subQ.questionType === 'single-choice') {
      // Extract correct answer from sub-question options
      const correctAnswer = subQ.options?.find(opt => opt.isCorrect)?.id || subQ.correctAnswer;
      const tempSubQuestionData = {
        correctAnswer: correctAnswer,
        options: subQ.options
      };
      subResult = evaluateSingleChoice(tempSubQuestionData, subAnswer.studentAnswer, subQ.marks || (totalMarks / subQuestions.length));
    } else if (subQ.questionType === 'multiple-choice') {
      // Extract correct answers from sub-question options
      const correctAnswers = subQ.options?.filter(opt => opt.isCorrect).map(opt => opt.id) || subQ.correctAnswers || [];
      const tempSubQuestionData = {
        correctAnswers: correctAnswers,
        options: subQ.options
      };
      subResult = evaluateMultipleChoice(tempSubQuestionData, subAnswer.studentAnswer, subQ.marks || (totalMarks / subQuestions.length));
    } else if (subQ.questionType === 'short-answer') {
      subResult = evaluateShortAnswer(subQ, subAnswer.studentAnswer, subQ.marks || (totalMarks / subQuestions.length));
    } else {
      subResult = { isCorrect: false, pointsEarned: 0 };
    }
    
    subQuestionResults.push({
      questionIndex: index,
      questionType: subQ.questionType,
      questionText: subQ.questionText,
      studentAnswer: subAnswer?.studentAnswer,
      isCorrect: subResult.isCorrect,
      pointsEarned: subResult.pointsEarned,
      maxPoints: subQ.marks || (totalMarks / subQuestions.length)
    });
    
    totalSubPoints += (subQ.marks || (totalMarks / subQuestions.length));
    earnedSubPoints += subResult.pointsEarned;
  });
  
  const isCorrect = earnedSubPoints === totalSubPoints;
  const pointsEarned = Math.round(earnedSubPoints * 100) / 100;
  
  console.log(`✅ Case Study Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'} - ${pointsEarned}/${totalMarks} points`);
  console.log(`Sub-question breakdown:`, subQuestionResults);
  
  return {
    isCorrect,
    pointsEarned,
    subQuestionResults
  };
}

// Short Answer Evaluation (basic keyword matching)
function evaluateShortAnswer(questionData, studentAnswer, totalMarks) {
  const expectedAnswer = questionData.expectedAnswer || '';
  const studentText = (studentAnswer || '').toString().toLowerCase().trim();
  
  // Basic evaluation - can be enhanced with more sophisticated NLP
  const isCorrect = expectedAnswer && studentText.includes(expectedAnswer.toLowerCase());
  const pointsEarned = isCorrect ? totalMarks : 0;
  
  return {
    isCorrect,
    pointsEarned,
    studentText,
    expectedAnswer
  };
}

// Code Question Evaluation (placeholder)
function evaluateCodeQuestion(questionData, studentAnswer, totalMarks) {
  // Placeholder - would integrate with code execution engine
  const isCorrect = false; // Default to manual review
  const pointsEarned = 0;
  
  return {
    isCorrect,
    pointsEarned,
    requiresManualReview: true,
    submittedCode: studentAnswer
  };
}

module.exports = { evaluateStandardizedAnswer };
