const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

// Import route handlers
const initQuestionRoutes = require('./routes/questions');

const app = express();

// Database configuration
const config = {
  server: 'ntms-sql-server.database.windows.net',
  port: 1433,
  database: 'exam_db',
  user: 'ntms',
  password: 'Dev@2024Test!',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Database connection
let pool;
async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    // Check if database is connected
    if (!pool) {
      console.error('❌ Database pool not initialized');
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { email, password, firstName, lastName, role = 'student' } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Email, password, first name, and last name are required' 
      });
    }

    // Check if user already exists
    const existingUserResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existingUserResult.recordset.length > 0) {
      console.log('❌ User already exists');
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('🔐 Password hashed');

    // Insert new user
    const insertResult = await pool.request()
      .input('email', sql.VarChar, email)
      .input('password_hash', sql.VarChar, passwordHash)
      .input('first_name', sql.VarChar, firstName)
      .input('last_name', sql.VarChar, lastName)
      .input('role', sql.VarChar, role)
      .query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name, INSERTED.role
        VALUES (@email, @password_hash, @first_name, @last_name, @role)
      `);

    const user = insertResult.recordset[0];
    console.log('✅ User created:', user);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, userId: user.id, email: user.email, role: user.role },
      'exam-portal-super-secure-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: error.message 
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔑 Login attempt:', { email: req.body.email });
    
    // Check if database is connected
    if (!pool) {
      console.error('❌ Database pool not initialized');
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userResult.recordset[0];

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, userId: user.id, email: user.email, role: user.role },
      'exam-portal-super-secure-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful');

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.',
      error: error.message 
    });
  }
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, 'exam-portal-super-secure-jwt-secret-key-2024');
    
    // Get user details from database to ensure user still exists
    const userResult = await pool.request()
      .input('userId', sql.Int, decoded.id || decoded.userId)
      .query('SELECT id, email, role, first_name, last_name FROM users WHERE id = @userId AND is_active = 1');

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Attach user info to request
    req.user = {
      id: userResult.recordset[0].id,
      email: userResult.recordset[0].email,
      role: userResult.recordset[0].role,
      firstName: userResult.recordset[0].first_name,
      lastName: userResult.recordset[0].last_name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Create or update exam
app.post('/api/exams', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🆕 Creating/updating exam:', req.body.title);
    console.log('📋 Full request body:', req.body);
    
    const {
      id,
      title,
      subject,
      description,
      duration,
      totalQuestions,
      totalMarks,
      passingScore,
      isPublished,
      scheduledStartTime,
      scheduledEndTime
    } = req.body;

    console.log('📊 isPublished value:', isPublished, typeof isPublished);
    const statusValue = isPublished ? 'published' : 'draft';
    console.log('🔄 Will set status to:', statusValue);

    // Get the authenticated user ID
    const createdBy = req.user.id;

    let result;
    if (id) {
      console.log('🔄 UPDATE MODE - Exam ID:', id);
      // Update existing exam - use the corrected column names
      const request = pool.request()
        .input('id', sql.Int, id)
        .input('title', sql.VarChar, title)
        .input('subject', sql.VarChar, subject || 'General')
        .input('description', sql.Text, description)
        .input('duration', sql.Int, duration)
        .input('total_marks', sql.Int, totalMarks || 0)
        .input('passing_marks', sql.Int, passingScore || 70)
        .input('status', sql.VarChar, statusValue)
        .input('is_published', sql.Bit, isPublished ? 1 : 0)
        .input('scheduled_start', sql.DateTime, scheduledStartTime || null)
        .input('scheduled_end', sql.DateTime, scheduledEndTime || null)
        .input('updated_at', sql.DateTime, new Date());

      console.log('🗄️ About to execute UPDATE with status:', statusValue, 'and is_published:', isPublished ? 1 : 0);
      
      result = await request.query(`
          UPDATE exams SET
            title = @title,
            subject = @subject,
            description = @description,
            duration = @duration,
            total_marks = @total_marks,
            passing_marks = @passing_marks,
            status = @status,
            is_published = @is_published,
            scheduled_start = @scheduled_start,
            scheduled_end = @scheduled_end,
            updated_at = @updated_at
          WHERE id = @id
        `);
      
      console.log('✅ UPDATE result rowsAffected:', result.rowsAffected);
    } else {
      console.log('🆕 CREATE MODE - New exam');
      // Create new exam - use the corrected column names
      const request = pool.request()
        .input('title', sql.VarChar, title)
        .input('subject', sql.VarChar, subject || 'General')
        .input('description', sql.Text, description)
        .input('duration', sql.Int, duration)
        .input('total_marks', sql.Int, totalMarks || 0)
        .input('passing_marks', sql.Int, passingScore || 70)
        .input('status', sql.VarChar, statusValue)
        .input('is_published', sql.Bit, isPublished ? 1 : 0)
        .input('scheduled_start', sql.DateTime, scheduledStartTime || null)
        .input('scheduled_end', sql.DateTime, scheduledEndTime || null)
        .input('created_by', sql.Int, createdBy)
        .input('created_at', sql.DateTime, new Date())
        .input('updated_at', sql.DateTime, new Date());

      console.log('🗄️ About to execute INSERT with status:', statusValue, 'and is_published:', isPublished ? 1 : 0);
      
      result = await request.query(`
          INSERT INTO exams (
            title, subject, description, duration, total_marks, passing_marks,
            status, is_published, scheduled_start, scheduled_end, created_by, created_at, updated_at
          )
          OUTPUT INSERTED.id
          VALUES (
            @title, @subject, @description, @duration, @total_marks, @passing_marks,
            @status, @is_published, @scheduled_start, @scheduled_end, @created_by, @created_at, @updated_at
          )
        `);
      
      console.log('✅ INSERT result:', result.recordset[0]);
    }

    const examId = id || result.recordset[0].id;
    
    // Verify what was actually saved in the database
    const verifyResult = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT id, title, status, is_published
        FROM exams 
        WHERE id = @examId
      `);
    
    const savedExam = verifyResult.recordset[0];
    console.log('🔍 Verification - What was actually saved:', {
      id: savedExam.id,
      title: savedExam.title,
      status: savedExam.status,
      is_published_bit_value: savedExam.is_published
    });
    
    console.log(`✅ Exam ${id ? 'updated' : 'created'} successfully with ID: ${examId}`);
    
    res.json({
      success: true,
      message: `Exam ${id ? 'updated' : 'created'} successfully`,
      examId: examId,
      isPublished: isPublished || false
    });

  } catch (error) {
    console.error('❌ Error saving exam:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save exam', 
      error: error.message 
    });
  }
});

// Get all exams (for admin)
app.get('/api/exams', async (req, res) => {
  try {
    console.log('🔍 Fetching all exams for admin...');
    
    const result = await pool.request().query(`
      SELECT 
        id, title, subject, description, duration,
        total_marks, passing_marks as passing_score,
        status, is_published, scheduled_start as scheduled_start_time, 
        scheduled_end as scheduled_end_time,
        created_at, updated_at
      FROM exams
      ORDER BY created_at DESC
    `);

    console.log(`✅ Found ${result.recordset.length} exams`);

    // Add question counts
    const examsWithQuestionCounts = await Promise.all(
      result.recordset.map(async (exam) => {
        try {
          const questionResult = await pool.request()
            .input('examId', sql.Int, exam.id)
            .query('SELECT COUNT(*) as question_count FROM questions WHERE exam_id = @examId AND is_active = 1');
          
          return {
            ...exam,
            total_questions: questionResult.recordset[0].question_count || 0
          };
        } catch (error) {
          console.error(`Error getting question count for exam ${exam.id}:`, error);
          return {
            ...exam,
            total_questions: 0
          };
        }
      })
    );

    res.json(examsWithQuestionCounts);
  } catch (error) {
    console.error('❌ Error fetching exams:', error);
    console.error('Error details:', error);
    res.status(500).json({ 
      message: 'Failed to fetch exams',
      error: error.message 
    });
  }
});

// Get published exams (for students)
app.get('/api/exams/published', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        id, title, subject, description, duration,
        scheduled_start_time, scheduled_end_time, created_at
      FROM exams
      WHERE is_published = 1
      ORDER BY scheduled_start_time ASC, created_at DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching published exams:', error);
    res.status(500).json({ message: 'Failed to fetch published exams' });
  }
});

// Get specific exam with questions
app.get('/api/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          id, title, subject, description, duration, 
          total_marks, passing_marks as passing_score,
          status, is_published, scheduled_start as scheduled_start_time, 
          scheduled_end as scheduled_end_time,
          created_at, updated_at
        FROM exams
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const exam = result.recordset[0];
    
    console.log(`✅ Successfully fetched exam ${id}:`, exam);
    
    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('❌ Error fetching exam:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch exam',
      error: error.message 
    });
  }
});

// Publish exam
app.post('/api/exams/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledStartTime, scheduledEndTime } = req.body;
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('is_published', sql.Bit, true)
      .input('scheduled_start_time', sql.DateTime, scheduledStartTime || null)
      .input('scheduled_end_time', sql.DateTime, scheduledEndTime || null)
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE exams SET
          is_published = @is_published,
          scheduled_start_time = @scheduled_start_time,
          scheduled_end_time = @scheduled_end_time,
          updated_at = @updated_at
        WHERE id = @id
      `);

    console.log(`✅ Exam ${id} published successfully`);
    
    res.json({
      success: true,
      message: 'Exam published successfully',
      scheduledStartTime,
      scheduledEndTime
    });

  } catch (error) {
    console.error('❌ Error publishing exam:', error);
    res.status(500).json({ message: 'Failed to publish exam' });
  }
});

// Delete exam and all associated questions
app.delete('/api/exams/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting exam ${id} and all associated questions`);

    // Begin transaction
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // First, delete all questions associated with this exam
      const deleteQuestionsResult = await transaction.request()
        .input('examId', sql.Int, id)
        .query('DELETE FROM questions WHERE exam_id = @examId');

      console.log(`✅ Deleted ${deleteQuestionsResult.rowsAffected[0]} questions for exam ${id}`);

      // Then, delete the exam itself
      const deleteExamResult = await transaction.request()
        .input('examId', sql.Int, id)
        .query('DELETE FROM exams WHERE id = @examId');

      if (deleteExamResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Exam not found'
        });
      }

      await transaction.commit();
      
      console.log(`✅ Exam ${id} and all associated questions deleted successfully`);
      
      res.json({
        success: true,
        message: 'Exam and all associated questions deleted successfully',
        deletedQuestions: deleteQuestionsResult.rowsAffected[0],
        deletedExam: deleteExamResult.rowsAffected[0]
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error deleting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: error.message
    });
  }
});

// Update exam
app.put('/api/exams/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const examData = req.body;
    
    console.log(`🔄 PUT - Updating exam ${id} with data:`, examData);
    console.log('📊 PUT - isPublished value:', examData.isPublished, typeof examData.isPublished);
    const statusValue = examData.isPublished ? 'published' : 'draft';
    console.log('🔄 PUT - Will set status to:', statusValue);

    // Validate required fields
    if (!examData.title && !examData.subject && examData.isPublished === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided for update'
      });
    }

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('updated_at', sql.DateTime, new Date());

    let updateFields = ['updated_at = @updated_at'];
    
    if (examData.title) {
      request.input('title', sql.NVarChar(255), examData.title);
      updateFields.push('title = @title');
    }
    if (examData.subject) {
      request.input('subject', sql.NVarChar(100), examData.subject);
      updateFields.push('subject = @subject');
    }
    if (examData.description !== undefined) {
      request.input('description', sql.Text, examData.description || '');
      updateFields.push('description = @description');
    }
    if (examData.duration) {
      request.input('duration', sql.Int, examData.duration);
      updateFields.push('duration = @duration');
    }
    if (examData.passingScore) {
      request.input('passing_marks', sql.Int, examData.passingScore);
      updateFields.push('passing_marks = @passing_marks');
    }
    if (examData.isPublished !== undefined) {
      request.input('status', sql.NVarChar(20), statusValue);
      request.input('is_published', sql.Bit, examData.isPublished ? 1 : 0);
      updateFields.push('status = @status');
      updateFields.push('is_published = @is_published');
      console.log('🗄️ PUT - About to execute UPDATE with status:', statusValue, 'and is_published:', examData.isPublished ? 1 : 0);
    }
    if (examData.scheduledStartTime !== undefined) {
      request.input('scheduled_start', sql.DateTime, examData.scheduledStartTime || null);
      updateFields.push('scheduled_start = @scheduled_start');
    }
    if (examData.scheduledEndTime !== undefined) {
      request.input('scheduled_end', sql.DateTime, examData.scheduledEndTime || null);
      updateFields.push('scheduled_end = @scheduled_end');
    }

    const result = await request.query(`
        UPDATE exams SET
          ${updateFields.join(', ')}
        WHERE id = @id
      `);

    console.log('✅ PUT - UPDATE result rowsAffected:', result.rowsAffected);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify what was actually saved in the database
    const verifyResult = await pool.request()
      .input('examId', sql.Int, id)
      .query(`
        SELECT id, title, status, is_published
        FROM exams 
        WHERE id = @examId
      `);
    
    const savedExam = verifyResult.recordset[0];
    console.log('🔍 PUT Verification - What was actually saved:', {
      id: savedExam.id,
      title: savedExam.title,
      status: savedExam.status,
      is_published_bit_value: savedExam.is_published
    });

    console.log(`✅ Exam ${id} updated successfully`);
    
    res.json({
      success: true,
      message: 'Exam updated successfully',
      examId: parseInt(id)
    });

  } catch (error) {
    console.error('❌ Error updating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: error.message
    });
  }
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT COUNT(*) as userCount FROM users');
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      userCount: result.recordset[0].userCount
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ===== QUESTIONS API ENDPOINTS =====

// Validate question data based on type
const validateQuestionData = (questionType, questionData) => {
  // Basic validation - you can expand this later
  if (!questionData) {
    throw new Error('Question data is required');
  }
  
  switch (questionType) {
    case 'single-choice':
      if (!questionData.options || !Array.isArray(questionData.options)) {
        throw new Error('Single choice questions must have options array');
      }
      // Make correctAnswer optional for now - frontend might send correctAnswers array
      break;
    case 'multiple-choice':
      if (!questionData.options || !Array.isArray(questionData.options)) {
        throw new Error('Multiple choice questions must have options array');
      }
      // Make correctAnswers optional for now - let it be flexible
      break;
    case 'drag-drop':
      if (!questionData.dragDropItems && !questionData.dragItems) {
        throw new Error('Drag-drop questions must have dragDropItems or dragItems');
      }
      if (!questionData.dragDropTargets && !questionData.dropTargets) {
        throw new Error('Drag-drop questions must have dragDropTargets or dropTargets');
      }
      break;
    case 'case-study':
      // Case study validation can be flexible
      break;
    case 'short-answer':
    case 'code':
      // These can be flexible for now
      break;
  }
  
  return true;
};

// Create question
app.post('/api/questions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📝 Creating question:', req.body);
    
    const {
      examId,
      questionType,
      questionText,
      marks,
      explanation,
      questionData,
      orderIndex
    } = req.body;

    // Validate required fields
    if (!examId || !questionType || !questionData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: examId, questionType, questionData'
      });
    }

    // Validate question data
    try {
      validateQuestionData(questionType, questionData);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question data',
        error: validationError.message
      });
    }

    // Check current table schema
    const schemaCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'questions'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('📊 Current questions table schema:', schemaCheck.recordset);

    // Get next order index if not provided
    let finalOrderIndex = orderIndex;
    if (!finalOrderIndex) {
      const orderResult = await pool.request()
        .input('examId', sql.Int, examId)
        .query(`
          SELECT COALESCE(MAX(order_index), 0) + 1 as next_index
          FROM questions 
          WHERE exam_id = @examId AND is_active = 1
        `);
      finalOrderIndex = orderResult.recordset[0].next_index;
    }

    // Use the simplified schema - only insert into existing columns
    const insertQuery = `
      INSERT INTO questions (
        exam_id, 
        question_type, 
        question_data, 
        marks, 
        order_index,
        is_active
      )
      OUTPUT INSERTED.id
      VALUES (
        @examId, 
        @questionType, 
        @questionData, 
        @marks,
        @orderIndex,
        1
      )
    `;

    // Prepare the complete question data JSON
    const completeQuestionData = {
      questionText: questionText || questionData.questionText,
      points: marks || questionData.points,
      explanation: explanation || questionData.explanation || '',
      ...questionData
    };

    const request = pool.request()
      .input('examId', sql.Int, examId)
      .input('questionType', sql.NVarChar(50), questionType)
      .input('questionData', sql.NVarChar(sql.MAX), JSON.stringify(completeQuestionData))
      .input('marks', sql.Int, marks || questionData.points || 5)
      .input('orderIndex', sql.Int, finalOrderIndex);

    console.log('🔧 Inserting question with data:', {
      examId,
      questionType,
      questionData: completeQuestionData,
      marks: marks || questionData.points || 5,
      orderIndex: finalOrderIndex
    });

    const result = await request.query(insertQuery);
    const questionId = result.recordset[0].id;

    console.log('✅ Question created with ID:', questionId);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: {
        questionId: questionId,
        orderIndex: finalOrderIndex
      }
    });

  } catch (error) {
    console.error('❌ Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
});

// Get all questions for an exam
app.get('/api/questions/exam/:examId', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    
    console.log(`🔍 Fetching questions for exam ${examId}`);
    
    // Use the correct column names based on actual database schema
    const selectQuery = `
      SELECT id, exam_id, question_type, marks, 
             question_data, order_index, is_active, created_at, updated_at
      FROM questions 
      WHERE exam_id = @examId AND is_active = 1 
      ORDER BY order_index ASC
    `;

    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query(selectQuery);

    console.log(`✅ Found ${result.recordset.length} questions for exam ${examId}`);

    const questions = result.recordset.map(question => {
      let questionData = null;
      try {
        questionData = question.question_data ? JSON.parse(question.question_data) : {};
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse question_data for question ${question.id}:`, parseError);
        questionData = {};
      }

      return {
        ...question,
        question_data: questionData,
        // Extract question_text from question_data for compatibility
        question_text: questionData.questionText || questionData.question_text || ''
      };
    });

    const totalPoints = questions.reduce((sum, q) => sum + q.marks, 0);
    
    res.json({
      success: true,
      data: questions,
      totalQuestions: questions.length,
      totalPoints: totalPoints
    });
  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message
    });
  }
});

// Get single question by ID
app.get('/api/questions/:questionId', authenticateToken, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Validate questionId is a number
    const questionIdNum = parseInt(questionId);
    if (isNaN(questionIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID. Must be a number.'
      });
    }
    
    const result = await pool.request()
      .input('questionId', sql.Int, questionIdNum)
      .query('SELECT * FROM questions WHERE id = @questionId AND is_active = 1');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const question = result.recordset[0];
    question.question_data = JSON.parse(question.question_data);
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question',
      error: error.message
    });
  }
});

// Update question
app.put('/api/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      questionText,
      marks,
      explanation,
      questionData
    } = req.body;

    console.log(`🔧 Updating question ${questionId}:`, { questionText, marks, questionData });

    // Check if updated_at column exists
    const updatedAtColumnCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'questions' AND COLUMN_NAME = 'updated_at'
    `);
    
    const hasUpdatedAtColumn = updatedAtColumnCheck.recordset.length > 0;

    // Prepare the complete question data JSON
    const completeQuestionData = {
      questionText: questionText || questionData?.questionText,
      points: marks || questionData?.points,
      explanation: explanation || questionData?.explanation || '',
      ...questionData
    };

    let request = pool.request()
      .input('questionId', sql.Int, questionId)
      .input('marks', sql.Int, marks)
      .input('questionData', sql.NVarChar(sql.MAX), JSON.stringify(completeQuestionData));

    let setParts = [
      'marks = COALESCE(@marks, marks)',
      'question_data = COALESCE(@questionData, question_data)'
    ];

    if (hasUpdatedAtColumn) {
      setParts.push('updated_at = @updatedAt');
      request.input('updatedAt', sql.DateTime, new Date());
    }

    const updateQuery = `UPDATE questions SET ${setParts.join(', ')} WHERE id = @questionId`;

    console.log('🔧 Executing update query:', updateQuery);
    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    console.log('✅ Question updated successfully');

    res.json({
      success: true,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
});

// Delete question (soft delete)
app.delete('/api/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const result = await pool.request()
      .input('questionId', sql.Int, questionId)
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        UPDATE questions SET
          is_active = 0,
          updated_at = @updatedAt
        WHERE id = @questionId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
});

// Get questions by type
app.get('/api/questions/exam/:examId/type/:questionType', authenticateToken, async (req, res) => {
  try {
    const { examId, questionType } = req.params;
    
    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .input('questionType', sql.NVarChar(50), questionType)
      .query(`
        SELECT * FROM questions 
        WHERE exam_id = @examId 
        AND question_type = @questionType 
        AND is_active = 1
        ORDER BY order_index ASC
      `);

    const questions = result.recordset.map(question => ({
      ...question,
      question_data: JSON.parse(question.question_data)
    }));

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('❌ Error fetching questions by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions by type',
      error: error.message
    });
  }
});

// ===== TEST ATTEMPTS API ENDPOINTS =====

// Start a new test attempt
app.post('/api/test-attempts/start', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.body;
    const userId = req.user.id; // Changed from studentId to userId

    console.log(`📝 Starting test attempt for user ${userId}, exam ${examId}`);

    // Check if exam exists and is published
    const examCheck = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT id, title, duration, is_published, scheduled_start_time, scheduled_end_time
        FROM exams 
        WHERE id = @examId AND is_published = 1
      `);

    if (examCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or not published'
      });
    }

    const exam = examCheck.recordset[0];

    // Check if exam is within scheduled time (if scheduled)
    const now = new Date();
    if (exam.scheduled_start_time && new Date(exam.scheduled_start_time) > now) {
      return res.status(400).json({
        success: false,
        message: 'Exam has not started yet'
      });
    }

    if (exam.scheduled_end_time && new Date(exam.scheduled_end_time) < now) {
      return res.status(400).json({
        success: false,
        message: 'Exam has ended'
      });
    }

    // Check for existing incomplete attempts - using user_id instead of student_id
    const existingAttempt = await pool.request()
      .input('userId', sql.Int, userId)
      .input('examId', sql.Int, examId)
      .query(`
        SELECT id, start_time, status, created_at
        FROM test_attempts 
        WHERE user_id = @userId AND exam_id = @examId AND status = 'in_progress'
      `);

    if (existingAttempt.recordset.length > 0) {
      const attempt = existingAttempt.recordset[0];
      console.log(`🔄 Resuming existing attempt ${attempt.id} for user ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Resuming existing test attempt',
        isResume: true,
        data: {
          attemptId: attempt.id,
          examId: examId,
          startTime: attempt.start_time,
          duration: exam.duration,
          examTitle: exam.title,
          resuming: true
        }
      });
    }

    // Create new test attempt - using both start_time and created_at
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('examId', sql.Int, examId)
      .input('startTime', sql.DateTime, now)
      .input('createdAt', sql.DateTime, now)
      .input('status', sql.VarChar(20), 'in_progress')
      .query(`
        INSERT INTO test_attempts (user_id, exam_id, start_time, status, created_at)
        OUTPUT INSERTED.id, INSERTED.start_time
        VALUES (@userId, @examId, @startTime, @status, @createdAt)
      `);

    const attemptId = result.recordset[0].id;
    
    console.log(`✅ Test attempt ${attemptId} started for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Test attempt started successfully',
      data: {
        attemptId: attemptId,
        examId: examId,
        startTime: result.recordset[0].start_time,
        duration: exam.duration,
        examTitle: exam.title
      }
    });

  } catch (error) {
    console.error('❌ Error starting test attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start test attempt',
      error: error.message
    });
  }
});

// Get student's test attempts
app.get('/api/test-attempts/student', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Changed from studentId to userId

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          ta.id,
          ta.exam_id,
          e.title as exam_title,
          e.subject,
          ta.start_time,
          ta.end_time,
          ta.status,
          ta.total_score,
          ta.is_submitted,
          e.duration,
          e.passing_score
        FROM test_attempts ta
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.user_id = @userId
        ORDER BY ta.start_time DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching test attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempts',
      error: error.message
    });
  }
});

// Get all test attempts (admin only) - must come before /:attemptId route
app.get('/api/test-attempts/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Getting all test attempts for admin');
    
    const result = await pool.request()
      .query(`
        SELECT 
          ta.id,
          ta.user_id,
          ta.exam_id,
          e.title as exam_title,
          e.subject,
          e.duration,
          ta.start_time,
          ta.end_time,
          ta.status,
          ta.total_score,
          ta.is_submitted,
          u.first_name,
          u.last_name,
          u.email
        FROM test_attempts ta
        JOIN exams e ON ta.exam_id = e.id
        JOIN users u ON ta.user_id = u.id
        ORDER BY ta.created_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching all test attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempts',
      error: error.message
    });
  }
});

// Get specific test attempt details
app.get('/api/test-attempts/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    console.log('🔍 test-attempts route hit with attemptId:', attemptId);
    
    // Validate attemptId is a number
    const attemptIdNum = parseInt(attemptId);
    if (isNaN(attemptIdNum)) {
      console.error('❌ Invalid attemptId:', attemptId);
      return res.status(400).json({
        success: false,
        message: 'Validation failed for parameter \'attemptId\'. Invalid number.'
      });
    }
    
    const userId = req.user.id;

    let query = `
      SELECT 
        ta.id,
        ta.user_id,
        ta.exam_id,
        e.title as exam_title,
        e.subject,
        e.duration,
        ta.start_time,
        ta.end_time,
        ta.status,
        ta.total_score,
        ta.is_submitted,
        u.first_name,
        u.last_name,
        u.email
      FROM test_attempts ta
      JOIN exams e ON ta.exam_id = e.id
      JOIN users u ON ta.user_id = u.id
      WHERE ta.id = @attemptId
    `;

    // Students can only see their own attempts, admins can see all
    if (req.user.role !== 'admin') {
      query += ' AND ta.user_id = @userId';
    }

    const request = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, userId);
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error fetching test attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempt',
      error: error.message
    });
  }
});

// Get existing answers for resumed attempt
app.get('/api/test-attempts/:attemptId/resume', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    console.log(`🔄 Getting resume data for attempt ${attemptId}, user ${userId}`);

    // Verify attempt belongs to user and is active
    const attemptCheck = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ta.id, ta.exam_id, ta.start_time, ta.status, e.duration, e.title
        FROM test_attempts ta
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.id = @attemptId AND ta.user_id = @userId AND ta.status = 'in_progress'
      `);

    if (attemptCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active test attempt not found'
      });
    }

    const attempt = attemptCheck.recordset[0];

    // Get existing answers
    const answersResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .query(`
        SELECT 
          a.question_id,
          a.student_answer,
          a.is_correct,
          a.points_earned,
          q.question_type,
          q.marks
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.attempt_id = @attemptId
        ORDER BY q.order_index
      `);

    // Transform answers to frontend format
    const existingAnswers = {};
    answersResult.recordset.forEach(answer => {
      try {
        existingAnswers[answer.question_id] = {
          questionId: answer.question_id,
          answer: JSON.parse(answer.student_answer),
          isMarkedForReview: false,
          timeSpent: 0
        };
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse answer for question ${answer.question_id}:`, parseError);
      }
    });

    // Calculate elapsed time
    const now = new Date();
    const startTime = new Date(attempt.start_time);
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    const remainingMinutes = Math.max(0, attempt.duration - elapsedMinutes);

    console.log(`✅ Resume data prepared: ${answersResult.recordset.length} existing answers, ${remainingMinutes} minutes remaining`);

    res.json({
      success: true,
      message: 'Resume data retrieved successfully',
      data: {
        attemptId: attempt.id,
        examId: attempt.exam_id,
        examTitle: attempt.title,
        existingAnswers: existingAnswers,
        elapsedTime: elapsedMinutes,
        remainingTime: remainingMinutes,
        startTime: attempt.start_time
      }
    });

  } catch (error) {
    console.error('❌ Error getting resume data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resume data',
      error: error.message
    });
  }
});

// ===== ANSWERS API ENDPOINTS =====

// Submit answer for a question
app.post('/api/answers/submit', authenticateToken, async (req, res) => {
  try {
    const { attemptId, questionId, studentAnswer } = req.body;
    const userId = req.user.id; // Changed from studentId to userId

    console.log(`📝 Submitting answer for attempt ${attemptId}, question ${questionId}`);

    // Validate that this attempt belongs to the user and is active
    const attemptCheck = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id, status 
        FROM test_attempts 
        WHERE id = @attemptId AND user_id = @userId
      `);

    if (attemptCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (attemptCheck.recordset[0].status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Test attempt is not active'
      });
    }

    // Get question details for validation
    const questionResult = await pool.request()
      .input('questionId', sql.Int, questionId)
      .query(`
        SELECT id, question_type, marks, question_data
        FROM questions 
        WHERE id = @questionId AND is_active = 1
      `);

    if (questionResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const question = questionResult.recordset[0];
    const questionData = JSON.parse(question.question_data);

    // Calculate if answer is correct and points earned with formatted structure
    const { isCorrect, pointsEarned, formattedAnswer } = calculateScore(
      question.question_type, 
      questionData, 
      studentAnswer, 
      question.marks
    );

    // Check if answer already exists (update) or create new
    const existingAnswer = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('questionId', sql.Int, questionId)
      .query(`
        SELECT id FROM answers 
        WHERE attempt_id = @attemptId AND question_id = @questionId
      `);

    let result;
    if (existingAnswer.recordset.length > 0) {
      // Update existing answer
      result = await pool.request()
        .input('answerId', sql.Int, existingAnswer.recordset[0].id)
        .input('studentAnswer', sql.NVarChar(sql.MAX), JSON.stringify(formattedAnswer))
        .input('isCorrect', sql.Bit, isCorrect)
        .input('pointsEarned', sql.Decimal(5,2), pointsEarned)
        .input('updatedAt', sql.DateTime, new Date())
        .query(`
          UPDATE answers SET
            student_answer = @studentAnswer,
            is_correct = @isCorrect,
            points_earned = @pointsEarned,
            updated_at = @updatedAt
          WHERE id = @answerId
        `);
    } else {
      // Create new answer
      result = await pool.request()
        .input('attemptId', sql.Int, attemptId)
        .input('questionId', sql.Int, questionId)
        .input('studentAnswer', sql.NVarChar(sql.MAX), JSON.stringify(formattedAnswer))
        .input('isCorrect', sql.Bit, isCorrect)
        .input('pointsEarned', sql.Decimal(5,2), pointsEarned)
        .input('createdAt', sql.DateTime, new Date())
        .query(`
          INSERT INTO answers (attempt_id, question_id, student_answer, is_correct, points_earned, created_at)
          OUTPUT INSERTED.id
          VALUES (@attemptId, @questionId, @studentAnswer, @isCorrect, @pointsEarned, @createdAt)
        `);
    }

    console.log(`✅ Answer submitted for question ${questionId}, ${isCorrect ? 'correct' : 'incorrect'}, ${pointsEarned} points`);

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        isCorrect: isCorrect,
        pointsEarned: pointsEarned,
        totalMarks: question.marks,
        formattedAnswer: formattedAnswer
      }
    });

  } catch (error) {
    console.error('❌ Error submitting answer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
});

// Get answers for a test attempt
app.get('/api/answers/attempt/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // Verify access rights
    let query = `
      SELECT 
        a.id,
        a.question_id,
        q.question_text,
        q.question_type,
        q.marks,
        a.student_answer,
        a.is_correct,
        a.points_earned,
        a.created_at,
        a.updated_at
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN test_attempts ta ON a.attempt_id = ta.id
      WHERE a.attempt_id = @attemptId
    `;

    // Students can only see their own answers, admins can see all
    if (req.user.role !== 'admin') {
      query += ' AND ta.user_id = @userId';
    }

    const request = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, userId);
    }

    const result = await request.query(query);

    const answers = result.recordset.map(answer => ({
      ...answer,
      student_answer: JSON.parse(answer.student_answer)
    }));

    res.json({
      success: true,
      data: answers
    });
  } catch (error) {
    console.error('❌ Error fetching answers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch answers',
      error: error.message
    });
  }
});

// ===== RESULTS API ENDPOINTS =====

// Submit test attempt and calculate final results
app.post('/api/test-attempts/:attemptId/submit', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id; // Changed from studentId to userId

    console.log(`🎯 Submitting test attempt ${attemptId} for final grading`);

    // Verify attempt belongs to user and is in progress
    const attemptResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ta.id, ta.exam_id, ta.created_at as start_time, ta.status, e.title, e.passing_score
        FROM test_attempts ta
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.id = @attemptId AND ta.user_id = @userId AND ta.status = 'in_progress'
      `);

    if (attemptResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active test attempt not found'
      });
    }

    const attempt = attemptResult.recordset[0];
    const endTime = new Date();

    // Calculate total score and statistics
    const answersResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .query(`
        SELECT 
          COUNT(*) as total_answered,
          SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
          SUM(points_earned) as total_score
        FROM answers a
        WHERE a.attempt_id = @attemptId
      `);

    // Get total possible marks from questions
    const examMarksResult = await pool.request()
      .input('examId', sql.Int, attempt.exam_id)
      .query(`
        SELECT 
          COUNT(*) as question_count,
          SUM(marks) as total_possible_marks
        FROM questions 
        WHERE exam_id = @examId AND is_active = 1
      `);

    const stats = answersResult.recordset[0];
    const examStats = examMarksResult.recordset[0];
    const questionCount = examStats.question_count || 0;
    const totalPossibleMarks = examStats.total_possible_marks || 0;
    
    const totalScore = stats.total_score || 0;
    const percentageScore = totalPossibleMarks > 0 ? 
      (totalScore / totalPossibleMarks) * 100 : 0;
    
    const grade = percentageScore >= attempt.passing_score ? 'PASS' : 'FAIL';
    const passed = percentageScore >= attempt.passing_score;
    const timeTaken = Math.round((endTime - new Date(attempt.start_time)) / 60000); // minutes

    // Begin transaction for final submission
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Update test attempt with total score and percentage
      await transaction.request()
        .input('attemptId', sql.Int, attemptId)
        .input('updatedAt', sql.DateTime, endTime)
        .input('totalScore', sql.Decimal(5,2), totalScore)
        .input('percentage', sql.Decimal(5,2), percentageScore)
        .query(`
          UPDATE test_attempts SET
            updated_at = @updatedAt,
            status = 'completed',
            total_score = @totalScore,
            percentage = @percentage,
            is_submitted = 1
          WHERE id = @attemptId
        `);

      // Create or update results record
      await transaction.request()
        .input('attemptId', sql.Int, attemptId)
        .input('totalQuestions', sql.Int, questionCount)
        .input('questionsAnswered', sql.Int, stats.total_answered || 0)
        .input('correctAnswers', sql.Int, stats.correct_answers || 0)
        .input('totalScore', sql.Decimal(5,2), totalScore)
        .input('totalMarks', sql.Decimal(5,2), totalPossibleMarks)
        .input('percentageScore', sql.Decimal(5,2), percentageScore)
        .input('grade', sql.VarChar(10), grade)
        .input('timeTaken', sql.Int, timeTaken)
        .input('createdAt', sql.DateTime, endTime)
        .query(`
          INSERT INTO results (
            attempt_id, total_questions, questions_answered, correct_answers,
            total_score, total_marks, percentage_score, grade, time_taken, created_at
          )
          VALUES (
            @attemptId, @totalQuestions, @questionsAnswered, @correctAnswers,
            @totalScore, @totalMarks, @percentageScore, @grade, @timeTaken, @createdAt
          )
        `);

      await transaction.commit();
      
      console.log(`✅ Test attempt ${attemptId} submitted successfully - Grade: ${grade}, Score: ${percentageScore.toFixed(2)}%`);
      
      res.json({
        success: true,
        message: 'Test submitted successfully',
        data: {
          attemptId: attemptId,
          totalQuestions: questionCount,
          questionsAnswered: stats.total_answered || 0,
          correctAnswers: stats.correct_answers || 0,
          totalScore: totalScore,
          totalMarks: totalPossibleMarks,
          percentageScore: parseFloat(percentageScore.toFixed(2)),
          grade: grade,
          timeTaken: timeTaken,
          passed: passed
        }
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error submitting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit test',
      error: error.message
    });
  }
});

// Get results for a test attempt
app.get('/api/results/attempt/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    let query = `
      SELECT 
        r.*,
        ta.user_id,
        ta.exam_id,
        e.title as exam_title,
        e.subject,
        e.passing_score,
        u.first_name,
        u.last_name,
        u.email
      FROM results r
      JOIN test_attempts ta ON r.attempt_id = ta.id
      JOIN exams e ON ta.exam_id = e.id
      JOIN users u ON ta.user_id = u.id
      WHERE r.attempt_id = @attemptId
    `;

    // Students can only see their own results, admins can see all
    if (req.user.role !== 'admin') {
      query += ' AND ta.user_id = @userId';
    }

    const request = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, userId);
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Results not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results',
      error: error.message
    });
  }
});

// Get all results for an exam (admin only)
app.get('/api/results/exam/:examId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params;

    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT 
          r.*,
          ta.user_id,
          ta.created_at as start_time,
          ta.updated_at as end_time,
          u.first_name,
          u.last_name,
          u.email,
          e.title as exam_title
        FROM results r
        JOIN test_attempts ta ON r.attempt_id = ta.id
        JOIN users u ON ta.user_id = u.id
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.exam_id = @examId
        ORDER BY r.percentage_score DESC, ta.updated_at ASC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching exam results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam results',
      error: error.message
    });
  }
});

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
const PORT = 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server only after database connection is established
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log('📊 Endpoints available:');
      console.log('  POST /api/auth/register - User registration');
      console.log('  POST /api/auth/login - User login');
      console.log('  POST /api/exams - Create/update exam');
      console.log('  GET /api/exams - Get all exams (admin)');
      console.log('  GET /api/exams/published - Get published exams (students)');
      console.log('  GET /api/exams/:id - Get specific exam');
      console.log('  PUT /api/exams/:id - Update exam (admin)');
      console.log('  POST /api/exams/:id/publish - Publish exam');
      console.log('  DELETE /api/exams/:id - Delete exam and all questions (admin)');
      console.log('  POST /api/questions - Create question (admin)');
      console.log('  GET /api/questions/exam/:examId - Get exam questions');
      console.log('  GET /api/questions/:id - Get single question');
      console.log('  PUT /api/questions/:id - Update question (admin)');
      console.log('  DELETE /api/questions/:id - Delete question (admin)');
      console.log('  GET /api/questions/exam/:examId/type/:type - Get questions by type');
      console.log('  GET /api/health - Health check');
      console.log('  GET /api/test-db - Database test');
      console.log('');
      console.log('📝 Test Attempts:');
      console.log('  POST /api/test-attempts/start - Start new test attempt');
      console.log('  GET /api/test-attempts/student - Get student attempts');
      console.log('  GET /api/test-attempts/:id - Get attempt details');
      console.log('  POST /api/test-attempts/:id/submit - Submit test for grading');
      console.log('');
      console.log('✏️ Answers:');
      console.log('  POST /api/answers/submit - Submit answer for question');
      console.log('  GET /api/answers/attempt/:id - Get all answers for attempt');
      console.log('');
      console.log('🎯 Results:');
      console.log('  GET /api/results/attempt/:id - Get results for attempt');
      console.log('  GET /api/results/exam/:id - Get all results for exam (admin)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

const PORT = 5000;
const PORT = 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server only after database connection is established
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log('📊 Endpoints available:');
      console.log('  POST /api/auth/register - User registration');
      console.log('  POST /api/auth/login - User login');
      console.log('  POST /api/exams - Create/update exam');
      console.log('  GET /api/exams - Get all exams (admin)');
      console.log('  GET /api/exams/published - Get published exams (students)');
      console.log('  GET /api/exams/:id - Get specific exam');
      console.log('  PUT /api/exams/:id - Update exam (admin)');
      console.log('  POST /api/exams/:id/publish - Publish exam');
      console.log('  DELETE /api/exams/:id - Delete exam and all questions (admin)');
      console.log('  POST /api/questions - Create question (admin)');
      console.log('  GET /api/questions/exam/:examId - Get exam questions');
      console.log('  GET /api/questions/:id - Get single question');
      console.log('  PUT /api/questions/:id - Update question (admin)');
      console.log('  DELETE /api/questions/:id - Delete question (admin)');
      console.log('  GET /api/questions/exam/:examId/type/:type - Get questions by type');
      console.log('  GET /api/health - Health check');
      console.log('  GET /api/test-db - Database test');
      console.log('');
      console.log('📝 Test Attempts:');
      console.log('  POST /api/test-attempts/start - Start new test attempt');
      console.log('  GET /api/test-attempts/student - Get student attempts');
      console.log('  GET /api/test-attempts/:id - Get attempt details');
      console.log('  POST /api/test-attempts/:id/submit - Submit test for grading');
      console.log('');
      console.log('✏️ Answers:');
      console.log('  POST /api/answers/submit - Submit answer for question');
      console.log('  GET /api/answers/attempt/:id - Get all answers for attempt');
      console.log('');
      console.log('🎯 Results:');
      console.log('  GET /api/results/attempt/:id - Get results for attempt');
      console.log('  GET /api/results/exam/:id - Get all results for exam (admin)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
