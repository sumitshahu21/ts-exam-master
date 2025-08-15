// Helper function to calculate score and format answer based on question type
function calculateScore(questionType, questionData, studentAnswer, totalMarks, questionText) {
  let isCorrect = false;
  let pointsEarned = 0;
  let formattedAnswer = {};

  try {
    switch (questionType) {
      case 'single-choice':
        // Extract correct answer from question data
        let correctOptions = [];
        if (questionData.correctAnswer !== undefined) {
          correctOptions = [questionData.correctAnswer];
        } else if (questionData.correct_answer !== undefined) {
          correctOptions = [questionData.correct_answer];
        } else if (questionData.correctOptions) {
          correctOptions = questionData.correctOptions;
        }

        // Handle raw answer from frontend
        let rawStudentAnswer = studentAnswer;
        if (studentAnswer && studentAnswer.rawAnswer !== undefined) {
          rawStudentAnswer = studentAnswer.rawAnswer;
        }

        // Student selected option
        const selectedOptionIndexes = Array.isArray(rawStudentAnswer) ? rawStudentAnswer : [rawStudentAnswer];
        
        // Check if correct
        isCorrect = selectedOptionIndexes.length === correctOptions.length && 
                   selectedOptionIndexes.every(opt => correctOptions.includes(opt));
        pointsEarned = isCorrect ? totalMarks : 0;

        // Build options array with proper structure
        const optionsArray = (questionData.options || []).map((opt, index) => ({
          id: `opt${index + 1}`,
          text: typeof opt === 'string' ? opt : opt.text || `Option ${index + 1}`
        }));

        formattedAnswer = {
          question_type: "single_choice",
          question_content: questionText || "Single choice question",
          options: optionsArray,
          selected_options: selectedOptionIndexes.map(opt => `opt${parseInt(opt) + 1}`),
          correct_options: correctOptions.map(opt => `opt${parseInt(opt) + 1}`),
          is_correct: isCorrect,
          question_marks: totalMarks,
          marks_earned: pointsEarned,
          time_taken_to_answer: studentAnswer?.timeSpent || 0
        };
        break;

      case 'multiple-choice':
        // Extract correct answers
        let correctAnswers = [];
        if (questionData.correctAnswers) {
          correctAnswers = questionData.correctAnswers;
        } else if (questionData.correct_answers) {
          correctAnswers = questionData.correct_answers;
        } else if (questionData.correctOptions) {
          correctAnswers = questionData.correctOptions;
        }

        // Handle raw answer from frontend
        let rawMultipleAnswer = studentAnswer;
        if (studentAnswer && studentAnswer.rawAnswer !== undefined) {
          rawMultipleAnswer = studentAnswer.rawAnswer;
        }

        const studentAnswers = Array.isArray(rawMultipleAnswer) ? rawMultipleAnswer : [rawMultipleAnswer];
        
        // Check if all correct answers are selected and no incorrect ones
        isCorrect = correctAnswers.length === studentAnswers.length && 
                   correctAnswers.every(ans => studentAnswers.includes(ans)) &&
                   studentAnswers.every(ans => correctAnswers.includes(ans));
        pointsEarned = isCorrect ? totalMarks : 0;

        // Build options array with proper structure
        const multipleOptionsArray = (questionData.options || []).map((opt, index) => ({
          id: `opt${index + 1}`,
          text: typeof opt === 'string' ? opt : opt.text || `Option ${index + 1}`
        }));

        formattedAnswer = {
          question_type: "multiple_choice",
          question_content: questionText || "Multiple choice question",
          options: multipleOptionsArray,
          selected_options: studentAnswers.map(opt => `opt${parseInt(opt) + 1}`),
          correct_options: correctAnswers.map(opt => `opt${parseInt(opt) + 1}`),
          is_correct: isCorrect,
          question_marks: totalMarks,
          marks_earned: pointsEarned,
          time_taken_to_answer: studentAnswer?.timeSpent || 0
        };
        break;

      case 'drag-drop':
        // Handle raw answer from frontend
        let rawDragAnswer = studentAnswer;
        if (studentAnswer && studentAnswer.rawAnswer !== undefined) {
          rawDragAnswer = studentAnswer.rawAnswer;
        }

        // Handle different drag-drop formats
        if (questionData.type === 'matching') {
          // Matching format: leftItems to rightItems
          const leftItems = questionData.leftItems || [];
          const rightItems = questionData.rightItems || [];
          const correctPairs = questionData.correctPairs || [];
          
          const dragItems = leftItems.map((item, index) => ({
            id: `drag${index + 1}`,
            text: item
          }));
          
          const dropTargets = rightItems.map((item, index) => ({
            id: `drop${index + 1}`,
            text: item
          }));

          // Convert student answer to pairs format
          const studentPairs = [];
          if (rawDragAnswer && typeof rawDragAnswer === 'object') {
            Object.entries(rawDragAnswer).forEach(([dragItem, dropTarget]) => {
              const dragIndex = leftItems.indexOf(dragItem);
              const dropIndex = rightItems.indexOf(dropTarget);
              if (dragIndex >= 0 && dropIndex >= 0) {
                studentPairs.push({
                  drag_id: `drag${dragIndex + 1}`,
                  drop_id: `drop${dropIndex + 1}`
                });
              }
            });
          }

          // Convert correct pairs to proper format
          const correctPairsFormatted = correctPairs.map(pair => {
            const dragIndex = leftItems.indexOf(pair.drag_item || pair.dragItem);
            const dropIndex = rightItems.indexOf(pair.drop_target || pair.dropTarget);
            return {
              drag_id: `drag${dragIndex + 1}`,
              drop_id: `drop${dropIndex + 1}`
            };
          });

          // Check correctness
          isCorrect = correctPairsFormatted.length === studentPairs.length &&
                     correctPairsFormatted.every(correctPair => 
                       studentPairs.some(studentPair => 
                         studentPair.drag_id === correctPair.drag_id && 
                         studentPair.drop_id === correctPair.drop_id
                       )
                     );
          pointsEarned = isCorrect ? totalMarks : 0;

          formattedAnswer = {
            question_type: "drag_and_drop",
            question_content: questionText || "Drag and drop matching question",
            drag_items: dragItems,
            drop_targets: dropTargets,
            student_pairs: studentPairs,
            correct_pairs: correctPairsFormatted,
            is_correct: isCorrect,
            question_marks: totalMarks,
            marks_earned: pointsEarned,
            time_taken_to_answer: studentAnswer?.timeSpent || 0
          };
        } else if (questionData.type === 'ordering') {
          // Ordering format
          const correctOrder = questionData.correctOrder || questionData.items || [];
          const studentOrder = Array.isArray(rawDragAnswer) ? rawDragAnswer : [];

          isCorrect = correctOrder.length === studentOrder.length &&
                     correctOrder.every((item, index) => item === studentOrder[index]);
          pointsEarned = isCorrect ? totalMarks : 0;

          const dragItems = correctOrder.map((item, index) => ({
            id: `drag${index + 1}`,
            text: item
          }));

          formattedAnswer = {
            question_type: "drag_and_drop",
            question_content: questionText || "Drag and drop ordering question",
            drag_items: dragItems,
            student_order: studentOrder,
            correct_order: correctOrder,
            is_correct: isCorrect,
            question_marks: totalMarks,
            marks_earned: pointsEarned,
            time_taken_to_answer: studentAnswer?.timeSpent || 0
          };
        } else {
          // Default drag-drop format
          const correctMappings = questionData.correctMappings || {};
          const studentMappings = rawDragAnswer || {};
          
          let correctCount = 0;
          let totalMappings = Object.keys(correctMappings).length;
          
          for (const [item, correctTarget] of Object.entries(correctMappings)) {
            if (studentMappings[item] === correctTarget) {
              correctCount++;
            }
          }
          
          isCorrect = correctCount === totalMappings;
          pointsEarned = isCorrect ? totalMarks : 0;

          const studentPairs = Object.entries(studentMappings).map(([drag_item, drop_target], index) => ({
            drag_id: `drag${index + 1}`,
            drop_id: `drop${index + 1}`
          }));
          
          const correctPairs = Object.entries(correctMappings).map(([drag_item, drop_target], index) => ({
            drag_id: `drag${index + 1}`,
            drop_id: `drop${index + 1}`
          }));

          formattedAnswer = {
            question_type: "drag_and_drop",
            question_content: questionText || "Drag and drop question",
            student_pairs: studentPairs,
            correct_pairs: correctPairs,
            is_correct: isCorrect,
            question_marks: totalMarks,
            marks_earned: pointsEarned,
            time_taken_to_answer: studentAnswer?.timeSpent || 0
          };
        }
        break;

      case 'case-study':
        // Handle raw answer from frontend
        let rawCaseAnswer = studentAnswer;
        if (studentAnswer && studentAnswer.rawAnswer !== undefined) {
          rawCaseAnswer = studentAnswer.rawAnswer;
        }

        // Handle case study with multiple sub-questions
        const subQuestions = questionData.subQuestions || [];
        const studentSubAnswers = rawCaseAnswer?.responses || rawCaseAnswer?.subAnswers || rawCaseAnswer || {};
        
        let totalSubMarks = 0;
        let earnedSubMarks = 0;
        const subQuestionsFormatted = [];
        
        subQuestions.forEach((subQ, index) => {
          const subId = subQ.id || `csq${index + 1}`;
          const subAnswer = studentSubAnswers[subId] || studentSubAnswers[index];
          const subMarks = subQ.marks || 1;
          totalSubMarks += subMarks;
          
          let subIsCorrect = false;
          let subMarksEarned = 0;
          let correctAnswer = "Manual review required";
          
          if (subQ.type === 'single-choice' || subQ.question_type === 'single-choice') {
            correctAnswer = subQ.correctAnswer || subQ.correct_answer || "Option not specified";
            subIsCorrect = subAnswer === subQ.correctAnswer || subAnswer === subQ.correct_answer;
            subMarksEarned = subIsCorrect ? subMarks : 0;
          } else if (subQ.type === 'multiple-choice' || subQ.question_type === 'multiple-choice') {
            const correctAnswers = subQ.correctAnswers || subQ.correct_answers || [];
            correctAnswer = correctAnswers.join(', ');
            const studentAnswers = Array.isArray(subAnswer) ? subAnswer : [subAnswer];
            subIsCorrect = correctAnswers.length === studentAnswers.length && 
                          correctAnswers.every(ans => studentAnswers.includes(ans));
            subMarksEarned = subIsCorrect ? subMarks : 0;
          } else {
            // Text-based sub-question
            correctAnswer = subQ.correctAnswer || subQ.correct_answer || subQ.sampleAnswer || "Manual review required";
            subIsCorrect = false; // Requires manual grading
            subMarksEarned = 0;
          }
          
          earnedSubMarks += subMarksEarned;
          
          subQuestionsFormatted.push({
            sub_question_id: subId,
            question: subQ.question || subQ.questionText || `Sub-question ${index + 1}`,
            student_answer: subAnswer || "",
            correct_answer: correctAnswer,
            is_correct: subIsCorrect,
            question_marks: subMarks,
            marks_earned: subMarksEarned
          });
        });
        
        isCorrect = earnedSubMarks === totalSubMarks;
        pointsEarned = earnedSubMarks;

        formattedAnswer = {
          question_type: "case_study",
          case_title: questionData.caseTitle || questionData.title || "Case Study",
          case_description: questionData.caseDescription || questionData.description || questionText || "Case study scenario",
          sub_questions: subQuestionsFormatted,
          total_marks: totalSubMarks,
          marks_earned: earnedSubMarks,
          time_taken_to_answer: studentAnswer?.timeSpent || 0
        };
        break;

      case 'short-answer':
        // Handle raw answer from frontend
        let rawTextAnswer = studentAnswer;
        if (studentAnswer && studentAnswer.rawAnswer !== undefined) {
          rawTextAnswer = studentAnswer.rawAnswer;
        }

        // For text answers, we need manual review
        const correctAnswer = questionData.correctAnswer || questionData.sample_answer || "";
        const studentText = typeof rawTextAnswer === 'string' ? rawTextAnswer : String(rawTextAnswer || '');
        
        // Basic keyword matching (can be enhanced)
        const keywords = questionData.keywords || [];
        let keywordMatches = 0;
        if (keywords.length > 0) {
          keywords.forEach(keyword => {
            if (studentText.toLowerCase().includes(keyword.toLowerCase())) {
              keywordMatches++;
            }
          });
          
          // Award partial credit based on keyword matches
          const keywordRatio = keywordMatches / keywords.length;
          if (keywordRatio >= 0.8) {
            isCorrect = true;
            pointsEarned = totalMarks;
          } else if (keywordRatio >= 0.5) {
            isCorrect = false;
            pointsEarned = totalMarks * 0.5;
          } else {
            isCorrect = false;
            pointsEarned = 0;
          }
        } else {
          // No keywords available - requires manual review
          isCorrect = false;
          pointsEarned = 0;
        }

        formattedAnswer = {
          question_type: "short_answer",
          question_content: questionText || "Short answer question",
          student_answer: studentText,
          correct_answer: correctAnswer,
          keywords_matched: keywordMatches,
          total_keywords: keywords.length,
          is_correct: isCorrect,
          question_marks: totalMarks,
          marks_earned: pointsEarned,
          requires_manual_review: keywords.length === 0,
          time_taken_to_answer: studentAnswer?.timeSpent || 0
        };
        break;

      default:
        // Unknown question type
        isCorrect = false;
        pointsEarned = 0;
        formattedAnswer = {
          question_type: questionType,
          question_content: questionText || "Unknown question type",
          student_answer: studentAnswer,
          is_correct: false,
          question_marks: totalMarks,
          marks_earned: 0,
          error: `Unsupported question type: ${questionType}`,
          time_taken_to_answer: studentAnswer?.timeSpent || 0
        };
        break;
    }

    return {
      isCorrect,
      pointsEarned,
      formattedAnswer
    };
  } catch (error) {
    console.error('Error calculating score:', error);
    return {
      isCorrect: false,
      pointsEarned: 0,
      formattedAnswer: {
        question_type: questionType,
        error: `Error evaluating answer: ${error.message}`,
        student_answer: studentAnswer,
        is_correct: false,
        question_marks: totalMarks,
        marks_earned: 0,
        time_taken_to_answer: studentAnswer?.timeSpent || 0
      }
    };
  }
}

module.exports = calculateScore;
