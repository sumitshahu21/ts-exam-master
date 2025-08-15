import sql from 'mssql';

// Database configuration for Azure SQL
const config = {
  user: 'admin_user',
  password: 'Pass@word123',
  server: 'mydemosqlserver112.database.windows.net',
  database: 'testingdatabase',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function createSubmissionTables() {
  let pool;
  
  try {
    console.log('🔗 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Database connected successfully');

    // Create test_attempt table
    console.log('📝 Creating test_attempt table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='test_attempt' AND xtype='U')
      CREATE TABLE test_attempt (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(20) NULL DEFAULT 'in-progress',
        started_at DATETIME2(7) NULL,
        completed_at DATETIME2(7) NULL,
        time_taken INT NULL,
        total_score DECIMAL(5,2) NULL,
        percentage DECIMAL(5,2) NULL,
        created_at DATETIME2(7) NULL DEFAULT GETDATE(),
        is_submitted BIT NOT NULL DEFAULT 0,
        FOREIGN KEY (exam_id) REFERENCES exams(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ test_attempt table created/verified');

    // Create answer table
    console.log('📝 Creating answer table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answer' AND xtype='U')
      CREATE TABLE answer (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        is_correct BIT NULL,
        student_answer NVARCHAR(MAX) NOT NULL,
        points_earned DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at DATETIME2(7) NULL DEFAULT GETDATE(),
        updated_at DATETIME2(7) NULL DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempt(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);
    console.log('✅ answer table created/verified');

    // Create indexes for better performance
    console.log('📝 Creating indexes...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_test_attempt_exam_user')
      CREATE INDEX IX_test_attempt_exam_user ON test_attempt(exam_id, user_id)
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_answer_attempt_question')
      CREATE INDEX IX_answer_attempt_question ON answer(attempt_id, question_id)
    `);

    console.log('✅ Indexes created successfully');

    // Test the tables by inserting sample data
    console.log('🧪 Testing table structure...');
    
    // Check if we have test users
    const userCheck = await pool.request().query(`
      SELECT TOP 1 id FROM users WHERE email = 'student@test.com'
    `);
    
    if (userCheck.recordset.length === 0) {
      console.log('⚠️ Warning: No test user found. Creating test user...');
      await pool.request().query(`
        INSERT INTO users (username, email, password, role, created_at, updated_at)
        VALUES ('student_test', 'student@test.com', 'hashed_password', 'student', GETDATE(), GETDATE())
      `);
      console.log('✅ Test user created');
    }

    console.log('\n🎉 Database tables created successfully!');
    console.log('\n📋 Tables Created:');
    console.log('✅ test_attempt - Stores exam attempt details');
    console.log('✅ answer - Stores individual question answers');
    console.log('✅ Indexes created for performance optimization');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔚 Database connection closed');
    }
  }
}

// Run the function
createSubmissionTables().catch(console.error);
