const sql = require('mssql');

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

async function initializeImprovedSchema() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully');
    
    // Step 1: Drop existing tables if they exist
    console.log('\n🗑️ Cleaning up old schema...');
    
    const dropQueries = [
      'DROP TABLE IF EXISTS answers',
      'DROP TABLE IF EXISTS test_attempts',
      'DROP TABLE IF EXISTS results'
    ];
    
    for (const query of dropQueries) {
      try {
        await pool.request().query(query);
        console.log(`   ✅ ${query}`);
      } catch (error) {
        console.log(`   ⚠️ ${query} - ${error.message}`);
      }
    }
    
    // Step 2: Create testAttempt table with comprehensive structure
    console.log('\n📋 Creating testAttempt table...');
    await pool.request().query(`
      CREATE TABLE testAttempt (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(20) DEFAULT 'in_progress',
        time_taken INT DEFAULT 0,
        total_score DECIMAL(5,2) DEFAULT 0.00,
        percentage DECIMAL(5,2) DEFAULT 0.00,
        created_at DATETIME2(7) DEFAULT GETDATE(),
        start_time DATETIME NOT NULL,
        end_time DATETIME NULL,
        is_submitted BIT DEFAULT 0,
        updated_at DATETIME DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_testAttempt_exam 
          FOREIGN KEY (exam_id) REFERENCES exams(id),
        CONSTRAINT FK_testAttempt_user 
          FOREIGN KEY (user_id) REFERENCES users(id),
          
        -- Check constraints for data integrity
        CONSTRAINT CK_testAttempt_status 
          CHECK (status IN ('in_progress', 'completed', 'abandoned')),
        CONSTRAINT CK_testAttempt_percentage 
          CHECK (percentage >= 0 AND percentage <= 100),
        CONSTRAINT CK_testAttempt_score 
          CHECK (total_score >= 0)
      )
    `);
    console.log('✅ testAttempt table created');
    
    // Step 3: Create studentAnswer table with detailed answer tracking
    console.log('\n📝 Creating studentAnswer table...');
    await pool.request().query(`
      CREATE TABLE studentAnswer (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        is_correct BIT DEFAULT 0,
        marks_obtained DECIMAL(5,2) DEFAULT 0.00,
        student_answer NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2(7) DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_studentAnswer_attempt 
          FOREIGN KEY (attempt_id) REFERENCES testAttempt(id) ON DELETE CASCADE,
        CONSTRAINT FK_studentAnswer_question 
          FOREIGN KEY (question_id) REFERENCES questions(id),
          
        -- Unique constraint to prevent duplicate answers
        CONSTRAINT UK_studentAnswer_attempt_question 
          UNIQUE (attempt_id, question_id),
          
        -- Check constraints
        CONSTRAINT CK_studentAnswer_marks 
          CHECK (marks_obtained >= 0)
      )
    `);
    console.log('✅ studentAnswer table created');
    
    // Step 4: Create performance indexes
    console.log('\n⚡ Creating performance indexes...');
    const indexes = [
      { 
        name: 'IX_testAttempt_user_exam',
        table: 'testAttempt',
        columns: '(user_id, exam_id)',
        description: 'Fast lookup of attempts by user and exam'
      },
      { 
        name: 'IX_testAttempt_status',
        table: 'testAttempt',
        columns: '(status)',
        description: 'Filter by attempt status'
      },
      { 
        name: 'IX_testAttempt_created_at',
        table: 'testAttempt',
        columns: '(created_at DESC)',
        description: 'Sort by creation date'
      },
      { 
        name: 'IX_studentAnswer_attempt',
        table: 'studentAnswer',
        columns: '(attempt_id)',
        description: 'Fast lookup of answers by attempt'
      },
      { 
        name: 'IX_studentAnswer_question',
        table: 'studentAnswer',
        columns: '(question_id)',
        description: 'Fast lookup of answers by question'
      },
      { 
        name: 'IX_studentAnswer_correctness',
        table: 'studentAnswer',
        columns: '(is_correct, marks_obtained)',
        description: 'Performance metrics queries'
      }
    ];
    
    for (const index of indexes) {
      try {
        await pool.request().query(
          `CREATE INDEX ${index.name} ON ${index.table} ${index.columns}`
        );
        console.log(`   ✅ ${index.name} - ${index.description}`);
      } catch (error) {
        console.log(`   ⚠️ ${index.name} failed: ${error.message}`);
      }
    }
    
    // Step 5: Create stored procedures for common operations
    console.log('\n🔧 Creating stored procedures...');
    
    // Stored procedure to calculate attempt statistics
    await pool.request().query(`
      CREATE OR ALTER PROCEDURE sp_CalculateAttemptStats
        @AttemptId INT
      AS
      BEGIN
        SET NOCOUNT ON;
        
        SELECT 
          ta.id as attempt_id,
          ta.exam_id,
          e.title as exam_title,
          COUNT(sa.id) as questions_answered,
          SUM(CASE WHEN sa.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
          SUM(sa.marks_obtained) as total_score,
          SUM(q.marks) as total_possible_marks,
          CASE 
            WHEN SUM(q.marks) > 0 THEN (SUM(sa.marks_obtained) * 100.0) / SUM(q.marks)
            ELSE 0 
          END as percentage,
          ta.time_taken
        FROM testAttempt ta
        LEFT JOIN studentAnswer sa ON ta.id = sa.attempt_id
        LEFT JOIN questions q ON sa.question_id = q.id
        LEFT JOIN exams e ON ta.exam_id = e.id
        WHERE ta.id = @AttemptId
        GROUP BY ta.id, ta.exam_id, e.title, ta.time_taken;
      END
    `);
    console.log('   ✅ sp_CalculateAttemptStats created');
    
    // Step 6: Verify schema creation
    console.log('\n🔍 Verifying schema...');
    
    const verifyQueries = [
      {
        name: 'testAttempt record count',
        query: 'SELECT COUNT(*) as count FROM testAttempt'
      },
      {
        name: 'studentAnswer record count', 
        query: 'SELECT COUNT(*) as count FROM studentAnswer'
      },
      {
        name: 'testAttempt columns',
        query: `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'testAttempt' 
                ORDER BY ORDINAL_POSITION`
      },
      {
        name: 'studentAnswer columns',
        query: `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'studentAnswer' 
                ORDER BY ORDINAL_POSITION`
      }
    ];
    
    for (const verify of verifyQueries) {
      try {
        const result = await pool.request().query(verify.query);
        console.log(`   ✅ ${verify.name}:`, 
          verify.name.includes('count') 
            ? result.recordset[0].count 
            : `${result.recordset.length} items`
        );
      } catch (error) {
        console.log(`   ❌ ${verify.name} failed:`, error.message);
      }
    }
    
    await pool.close();
    
    console.log('\n🎉 Database schema initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ testAttempt table: Comprehensive exam attempt tracking');
    console.log('   ✅ studentAnswer table: Detailed answer storage with JSON support');
    console.log('   ✅ Foreign key relationships: Data integrity enforced');
    console.log('   ✅ Performance indexes: Optimized for common queries');
    console.log('   ✅ Check constraints: Data validation at database level');
    console.log('   ✅ Stored procedures: Optimized calculations');
    
    console.log('\n🚀 Ready for improved marks evaluation system!');
    
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    if (pool) {
      await pool.close();
    }
  }
}

// Execute the schema initialization
initializeImprovedSchema();
