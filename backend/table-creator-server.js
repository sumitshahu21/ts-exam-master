const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const app = express();

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

app.get('/create-tables', async (req, res) => {
  const logs = [];
  let pool;
  
  try {
    logs.push('🚀 Starting database setup...');
    logs.push(`Server: ${config.server}`);
    logs.push(`Database: ${config.database}`);
    
    pool = await sql.connect(config);
    logs.push('✅ Connected to Azure SQL Database!');
    
    // Create users table
    logs.push('Creating users table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
        profile_photo VARCHAR(500),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);
    logs.push('✅ Users table created');
    
    // Create exams table
    logs.push('Creating exams table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'exams')
      CREATE TABLE exams (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        description TEXT,
        instructions TEXT,
        duration INT NOT NULL,
        total_marks INT DEFAULT 0,
        passing_marks INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        scheduled_start DATETIME2,
        scheduled_end DATETIME2,
        created_by INT NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    logs.push('✅ Exams table created');
    
    // Create questions table
    logs.push('Creating questions table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'questions')
      CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('single-choice', 'multiple-choice', 'drag-drop', 'case-study', 'short-answer', 'code')),
        marks INT DEFAULT 1,
        order_index INT DEFAULT 0,
        case_study_content TEXT,
        code_template TEXT,
        metadata TEXT,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
      )
    `);
    logs.push('✅ Questions table created');
    
    // Create question_options table
    logs.push('Creating question_options table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'question_options')
      CREATE TABLE question_options (
        id INT IDENTITY(1,1) PRIMARY KEY,
        question_id INT NOT NULL,
        option_text TEXT NOT NULL,
        is_correct BIT DEFAULT 0,
        order_index INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);
    logs.push('✅ Question options table created');
    
    // Create test_attempts table
    logs.push('Creating test_attempts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_attempts')
      CREATE TABLE test_attempts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
        started_at DATETIME2 DEFAULT GETDATE(),
        completed_at DATETIME2,
        time_taken INT,
        total_score DECIMAL(5,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    logs.push('✅ Test attempts table created');
    
    // Create answers table
    logs.push('Creating answers table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'answers')
      CREATE TABLE answers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_data TEXT,
        is_correct BIT DEFAULT 0,
        marks_obtained DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);
    logs.push('✅ Answers table created');
    
    // Create results table
    logs.push('Creating results table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'results')
      CREATE TABLE results (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT UNIQUE NOT NULL,
        total_questions INT NOT NULL,
        correct_answers INT DEFAULT 0,
        wrong_answers INT DEFAULT 0,
        unanswered INT DEFAULT 0,
        total_marks DECIMAL(5,2) NOT NULL,
        obtained_marks DECIMAL(5,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        grade VARCHAR(10),
        status VARCHAR(20) DEFAULT 'fail' CHECK (status IN ('pass', 'fail')),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
      )
    `);
    logs.push('✅ Results table created');
    
    // Create admin user
    logs.push('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const userCheck = await pool.request()
      .input('email', sql.VarChar, 'admin@test.com')
      .query('SELECT COUNT(*) as count FROM users WHERE email = @email');
    
    if (userCheck.recordset[0].count === 0) {
      await pool.request()
        .input('email', sql.VarChar, 'admin@test.com')
        .input('password_hash', sql.VarChar, hashedPassword)
        .input('first_name', sql.VarChar, 'Admin')
        .input('last_name', sql.VarChar, 'User')
        .input('role', sql.VarChar, 'admin')
        .query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES (@email, @password_hash, @first_name, @last_name, @role)
        `);
      logs.push('✅ Admin user created (admin@test.com / admin123)');
    } else {
      logs.push('ℹ️  Admin user already exists');
    }
    
    // Verify tables
    const tableCheck = await pool.request().query(`
      SELECT name FROM sys.tables 
      WHERE name IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
      ORDER BY name
    `);
    
    logs.push('🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
    logs.push('Tables created:');
    tableCheck.recordset.forEach(table => {
      logs.push(`  ✓ ${table.name}`);
    });
    logs.push('Admin login: admin@test.com / admin123');
    
    res.json({
      success: true,
      message: 'Database setup completed successfully',
      logs,
      tables: tableCheck.recordset.map(t => t.name)
    });
    
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Database setup failed',
      error: error.message,
      logs
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>Database Setup Tool</h1>
    <p><a href="/create-tables">Click here to create database tables</a></p>
    <p>This will create all required tables for the exam portal.</p>
  `);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Database setup server running on http://localhost:${PORT}`);
  console.log('Visit http://localhost:3002/create-tables to create tables');
});

module.exports = app;
