const express = require('express');
const router = express.Router();
const QuestionModel = require('../models/QuestionModel');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Initialize Question Model (will be set when route is used)
let questionModel;

// Set the database pool
const initQuestionRoutes = (pool) => {
  questionModel = new QuestionModel(pool);
  return router;
};

// Get all questions for an exam
router.get('/exam/:examId', auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const questions = await questionModel.getQuestionsByExamId(parseInt(examId));
    
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message
    });
  }
});

// Get questions by type for an exam
router.get('/exam/:examId/type/:questionType', auth, async (req, res) => {
  try {
    const { examId, questionType } = req.params;
    const questions = await questionModel.getQuestionsByType(parseInt(examId), questionType);
    
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching questions by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions by type',
      error: error.message
    });
  }
});

// Get single question by ID
router.get('/:questionId', auth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await questionModel.getQuestionById(parseInt(questionId));
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question',
      error: error.message
    });
  }
});

// Create new question (Admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      examId,
      questionType,
      questionText,
      points,
      explanation,
      questionData,
      orderIndex
    } = req.body;

    // Validate required fields
    if (!examId || !questionType || !questionText || !points || !questionData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: examId, questionType, questionText, points, questionData'
      });
    }

    // Get next order index if not provided
    const finalOrderIndex = orderIndex || await questionModel.getNextOrderIndex(examId);

    const questionId = await questionModel.createQuestion({
      examId,
      questionType,
      questionText,
      points,
      explanation,
      questionData,
      orderIndex: finalOrderIndex
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: {
        questionId,
        orderIndex: finalOrderIndex
      }
    });

  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
});

// Update question (Admin only)
router.put('/:questionId', adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updates = req.body;

    const success = await questionModel.updateQuestion(parseInt(questionId), updates);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Question not found or update failed'
      });
    }

    res.json({
      success: true,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
});

// Delete question (Admin only)
router.delete('/:questionId', adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const success = await questionModel.deleteQuestion(parseInt(questionId));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Question not found or delete failed'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
});

// Reorder questions in an exam (Admin only)
router.put('/exam/:examId/reorder', adminAuth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionOrders } = req.body;

    if (!questionOrders || !Array.isArray(questionOrders)) {
      return res.status(400).json({
        success: false,
        message: 'questionOrders array is required'
      });
    }

    const success = await questionModel.reorderQuestions(parseInt(examId), questionOrders);
    
    res.json({
      success: true,
      message: 'Questions reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder questions',
      error: error.message
    });
  }
});

// Bulk create questions (Admin only)
router.post('/bulk', adminAuth, async (req, res) => {
  try {
    const { examId, questions } = req.body;

    if (!examId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'examId and questions array are required'
      });
    }

    const createdQuestions = [];
    let currentOrder = await questionModel.getNextOrderIndex(examId);

    for (const questionData of questions) {
      try {
        const questionId = await questionModel.createQuestion({
          ...questionData,
          examId,
          orderIndex: currentOrder++
        });
        
        createdQuestions.push({
          questionId,
          orderIndex: currentOrder - 1,
          originalData: questionData
        });
      } catch (error) {
        console.error(`Failed to create question:`, error);
        // Continue with other questions
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdQuestions.length} out of ${questions.length} questions`,
      data: createdQuestions
    });

  } catch (error) {
    console.error('Error bulk creating questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create questions',
      error: error.message
    });
  }
});

module.exports = initQuestionRoutes;
