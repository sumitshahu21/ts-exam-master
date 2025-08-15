const sql = require('mssql');
const Joi = require('joi');

// Question validation schemas
const questionSchemas = {
  'single-choice': Joi.object({
    options: Joi.array().min(2).items(Joi.object({
      id: Joi.string().required(),
      text: Joi.string().min(1).required(),
      isCorrect: Joi.boolean().required()
    })).required(),
    correctAnswer: Joi.string().required(),
    randomizeOptions: Joi.boolean().default(false)
  }),

  'multiple-choice': Joi.object({
    options: Joi.array().min(2).items(Joi.object({
      id: Joi.string().required(),
      text: Joi.string().min(1).required(),
      isCorrect: Joi.boolean().required()
    })).required(),
    correctAnswers: Joi.array().min(1).items(Joi.string()).required(),
    minSelections: Joi.number().min(1).default(1),
    maxSelections: Joi.number().min(1),
    partialCredit: Joi.boolean().default(false)
  }),

  'drag-drop': Joi.object({
    subType: Joi.string().valid('matching', 'ordering', 'labeling').default('matching'),
    dragItems: Joi.array().min(1).items(Joi.object({
      id: Joi.string().required(),
      content: Joi.string().required(),
      type: Joi.string().valid('text', 'image').default('text')
    })).required(),
    dropTargets: Joi.array().min(1).items(Joi.object({
      id: Joi.string().required(),
      label: Joi.string().required(),
      description: Joi.string().allow(''),
      correctItemId: Joi.string().required(),
      acceptsMultiple: Joi.boolean().default(false)
    })).required(),
    correctMappings: Joi.object().required(),
    allowPartialCredit: Joi.boolean().default(true),
    showLabels: Joi.boolean().default(true)
  }),

  'case-study': Joi.object({
    caseStudyText: Joi.string().required(),
    attachments: Joi.array().items(Joi.object({
      type: Joi.string().valid('image', 'pdf', 'video'),
      url: Joi.string().uri(),
      caption: Joi.string().allow('')
    })).default([]),
    subQuestions: Joi.array().min(1).items(Joi.object({
      id: Joi.string().required(),
      questionText: Joi.string().required(),
      type: Joi.string().valid('single-choice', 'multiple-choice', 'short-answer').required(),
      points: Joi.number().min(1).required(),
      options: Joi.array().when('type', {
        is: Joi.string().valid('single-choice', 'multiple-choice'),
        then: Joi.required()
      }),
      correctAnswer: Joi.when('type', {
        is: 'single-choice',
        then: Joi.string().required()
      }),
      correctAnswers: Joi.when('type', {
        is: 'multiple-choice',
        then: Joi.array().required()
      })
    })).required()
  }),

  'short-answer': Joi.object({
    inputType: Joi.string().valid('text', 'number', 'email').default('text'),
    maxLength: Joi.number().min(1).default(500),
    expectedAnswers: Joi.array().items(Joi.object({
      text: Joi.string().required(),
      keywords: Joi.array().items(Joi.string()).default([]),
      points: Joi.number().min(0).required()
    })).default([]),
    gradingType: Joi.string().valid('manual', 'keyword', 'exact').default('manual'),
    gradingRubric: Joi.string().allow(''),
    caseSensitive: Joi.boolean().default(false),
    allowPartialCredit: Joi.boolean().default(true)
  }),

  'code': Joi.object({
    programmingLanguage: Joi.string().valid('javascript', 'python', 'java', 'cpp', 'csharp').required(),
    codeTemplate: Joi.string().allow(''),
    expectedSolution: Joi.string().allow(''),
    testCases: Joi.array().items(Joi.object({
      input: Joi.string().required(),
      expectedOutput: Joi.string().required(),
      points: Joi.number().min(0).required(),
      hidden: Joi.boolean().default(false)
    })).default([]),
    gradingCriteria: Joi.object({
      syntaxCorrect: Joi.number().min(0).default(0),
      logicCorrect: Joi.number().min(0).default(0),
      allTestsPassed: Joi.number().min(0).default(0)
    }).default({}),
    allowedLanguages: Joi.array().items(Joi.string()).default(['javascript']),
    timeLimit: Joi.number().min(1).default(30),
    memoryLimit: Joi.string().default('128MB')
  })
};

class QuestionModel {
  constructor(pool) {
    this.pool = pool;
  }

  // Validate question data based on type
  validateQuestionData(questionType, questionData) {
    const schema = questionSchemas[questionType];
    if (!schema) {
      throw new Error(`Unsupported question type: ${questionType}`);
    }

    const { error, value } = schema.validate(questionData);
    if (error) {
      throw new Error(`Validation failed: ${error.details[0].message}`);
    }

    return value;
  }

  // Create a new question
  async createQuestion(questionInfo) {
    const {
      examId,
      questionType,
      questionText,
      points,
      explanation,
      questionData,
      orderIndex
    } = questionInfo;

    // Validate question data
    const validatedData = this.validateQuestionData(questionType, questionData);

    const result = await this.pool.request()
      .input('examId', sql.Int, examId)
      .input('questionType', sql.NVarChar(50), questionType)
      .input('questionText', sql.NVarChar(sql.MAX), questionText)
      .input('points', sql.Int, points)
      .input('explanation', sql.NVarChar(sql.MAX), explanation || null)
      .input('questionData', sql.NVarChar(sql.MAX), JSON.stringify(validatedData))
      .input('orderIndex', sql.Int, orderIndex || 1)
      .query(`
        INSERT INTO questions (
          exam_id, question_type, question_text, points, 
          explanation, question_data, order_index
        )
        VALUES (
          @examId, @questionType, @questionText, @points,
          @explanation, @questionData, @orderIndex
        );
        SELECT SCOPE_IDENTITY() as id;
      `);

    return result.recordset[0].id;
  }

  // Get question by ID with parsed JSON
  async getQuestionById(questionId) {
    const result = await this.pool.request()
      .input('questionId', sql.Int, questionId)
      .query('SELECT * FROM questions WHERE id = @questionId AND is_active = 1');

    if (result.recordset.length > 0) {
      const question = result.recordset[0];
      return {
        ...question,
        question_data: JSON.parse(question.question_data)
      };
    }

    return null;
  }

  // Get all questions for an exam
  async getQuestionsByExamId(examId) {
    const result = await this.pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT * FROM questions 
        WHERE exam_id = @examId AND is_active = 1 
        ORDER BY order_index ASC
      `);

    return result.recordset.map(question => ({
      ...question,
      question_data: JSON.parse(question.question_data)
    }));
  }

  // Get questions by type
  async getQuestionsByType(examId, questionType) {
    const result = await this.pool.request()
      .input('examId', sql.Int, examId)
      .input('questionType', sql.NVarChar(50), questionType)
      .query(`
        SELECT 
          id,
          question_text,
          points,
          JSON_VALUE(question_data, '$.options') as options_json,
          JSON_VALUE(question_data, '$.correctAnswer') as correct_answer
        FROM questions 
        WHERE exam_id = @examId 
        AND question_type = @questionType 
        AND is_active = 1
        ORDER BY order_index ASC
      `);

    return result.recordset;
  }

  // Update question
  async updateQuestion(questionId, updates) {
    const {
      questionText,
      points,
      explanation,
      questionData,
      questionType
    } = updates;

    let validatedData = questionData;
    if (questionType && questionData) {
      validatedData = this.validateQuestionData(questionType, questionData);
    }

    const result = await this.pool.request()
      .input('questionId', sql.Int, questionId)
      .input('questionText', sql.NVarChar(sql.MAX), questionText)
      .input('points', sql.Int, points)
      .input('explanation', sql.NVarChar(sql.MAX), explanation)
      .input('questionData', sql.NVarChar(sql.MAX), JSON.stringify(validatedData))
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        UPDATE questions SET
          question_text = COALESCE(@questionText, question_text),
          points = COALESCE(@points, points),
          explanation = COALESCE(@explanation, explanation),
          question_data = COALESCE(@questionData, question_data),
          updated_at = @updatedAt
        WHERE id = @questionId
      `);

    return result.rowsAffected[0] > 0;
  }

  // Soft delete question
  async deleteQuestion(questionId) {
    const result = await this.pool.request()
      .input('questionId', sql.Int, questionId)
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        UPDATE questions SET
          is_active = 0,
          updated_at = @updatedAt
        WHERE id = @questionId
      `);

    return result.rowsAffected[0] > 0;
  }

  // Get next order index for exam
  async getNextOrderIndex(examId) {
    const result = await this.pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT COALESCE(MAX(order_index), 0) + 1 as next_index
        FROM questions 
        WHERE exam_id = @examId AND is_active = 1
      `);

    return result.recordset[0].next_index;
  }

  // Reorder questions
  async reorderQuestions(examId, questionOrders) {
    const transaction = new sql.Transaction(this.pool);
    
    try {
      await transaction.begin();

      for (const { questionId, orderIndex } of questionOrders) {
        await transaction.request()
          .input('questionId', sql.Int, questionId)
          .input('orderIndex', sql.Int, orderIndex)
          .input('examId', sql.Int, examId)
          .query(`
            UPDATE questions SET
              order_index = @orderIndex,
              updated_at = GETDATE()
            WHERE id = @questionId AND exam_id = @examId
          `);
      }

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = QuestionModel;
