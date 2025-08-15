const sql = require('mssql');

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

async function createHybridSchema() {
  let pool;
  
  try {
    console.log('🔗 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully');

    // Create questions table with hybrid approach
    console.log('📊 Creating questions table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' and xtype='U')
      CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_type NVARCHAR(50) NOT NULL,
        question_text NVARCHAR(MAX) NOT NULL,
        points INT DEFAULT 1,
        order_index INT NOT NULL,
        explanation NVARCHAR(MAX),
        question_data NVARCHAR(MAX), -- JSON storage for type-specific data
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
      );
    `);

    // Create test_attempts table
    console.log('📊 Creating test_attempts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='test_attempts' and xtype='U')
      CREATE TABLE test_attempts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        exam_id INT NOT NULL,
        attempt_number INT NOT NULL DEFAULT 1,
        start_time DATETIME DEFAULT GETDATE(),
        end_time DATETIME,
        status NVARCHAR(20) DEFAULT 'in_progress',
        score INT DEFAULT 0,
        total_possible_points INT NOT NULL,
        is_passed BIT DEFAULT 0,
        time_taken_minutes INT,
        ip_address NVARCHAR(45),
        user_agent NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id),
        UNIQUE(user_id, exam_id, attempt_number)
      );
    `);

    // Create answers table with JSON storage
    console.log('📊 Creating answers table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answers' and xtype='U')
      CREATE TABLE answers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_data NVARCHAR(MAX), -- JSON storage for complex answers
        selected_options NVARCHAR(500), -- Comma-separated for simple queries
        text_answer NVARCHAR(MAX), -- For short answer questions
        is_correct BIT DEFAULT 0,
        points_awarded INT DEFAULT 0,
        time_spent_seconds INT DEFAULT 0,
        answered_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      );
    `);

    // Create results table for analytics
    console.log('📊 Creating results table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='results' and xtype='U')
      CREATE TABLE results (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        user_id INT NOT NULL,
        exam_id INT NOT NULL,
        total_score INT NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        grade NVARCHAR(5),
        is_passed BIT NOT NULL,
        completion_time_minutes INT,
        questions_correct INT,
        questions_total INT,
        detailed_breakdown NVARCHAR(MAX), -- JSON with analytics
        feedback NVARCHAR(MAX),
        generated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      );
    `);

    // Create indexes for performance
    console.log('📊 Creating indexes...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_questions_exam_id')
      CREATE INDEX IX_questions_exam_id ON questions(exam_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_questions_type')
      CREATE INDEX IX_questions_type ON questions(question_type);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_answers_attempt_id')
      CREATE INDEX IX_answers_attempt_id ON answers(attempt_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_test_attempts_user_exam')
      CREATE INDEX IX_test_attempts_user_exam ON test_attempts(user_id, exam_id);
    `);

    console.log('✅ Hybrid schema created successfully!');

    // Show table structure
    const tables = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME IN ('questions', 'test_attempts', 'answers', 'results')
      ORDER BY TABLE_NAME
    `);

    console.log('📋 Created tables:');
    tables.recordset.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });

  } catch (error) {
    console.error('❌ Schema creation failed:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔐 Database connection closed');
    }
  }
}

createHybridSchema();
