import * as sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
  requestTimeout: 30000,
};

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    console.log('User:', config.user);
    
    const pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database successfully!');
    
    // Test if users table exists
    const result = await pool.request().query(`
      SELECT name FROM sysobjects WHERE name='users' AND xtype='U'
    `);
    
    if (result.recordset.length === 0) {
      console.log('❌ Users table does not exist. Creating tables...');
      await createTables(pool);
    } else {
      console.log('✅ Users table already exists');
    }
    
    await pool.close();
    console.log('Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function createTables(pool: sql.ConnectionPool) {
  try {
    console.log('Creating users table...');
    await pool.request().query(`
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
    console.log('✅ Users table created successfully!');
    
    console.log('Creating exams table...');
    await pool.request().query(`
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
    console.log('✅ Exams table created successfully!');
    
    console.log('Creating questions table...');
    await pool.request().query(`
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
    console.log('✅ Questions table created successfully!');
    
    console.log('Creating question_options table...');
    await pool.request().query(`
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
    console.log('✅ Question options table created successfully!');
    
    console.log('Creating test_attempts table...');
    await pool.request().query(`
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
    console.log('✅ Test attempts table created successfully!');
    
    console.log('Creating answers table...');
    await pool.request().query(`
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
    console.log('✅ Answers table created successfully!');
    
    console.log('Creating results table...');
    await pool.request().query(`
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
    console.log('✅ Results table created successfully!');
    
    console.log('🎉 All tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

testConnection();
