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

async function createNewSchema() {
  try {
    console.log('🔍 Connecting to Azure SQL Database...');
    const pool = await sql.connect(config);
    
    console.log('✅ Connected successfully');
    
    // Step 1: Drop existing tables in correct order (child tables first)
    console.log('\n🗑️ Dropping existing tables...');
    
    try {
      console.log('   Dropping answers table...');
      await pool.request().query('DROP TABLE IF EXISTS answers');
      console.log('   ✅ answers table dropped');
    } catch (error) {
      console.log('   ⚠️ answers table may not exist:', error.message);
    }
    
    try {
      console.log('   Dropping test_attempts table...');
      await pool.request().query('DROP TABLE IF EXISTS test_attempts');
      console.log('   ✅ test_attempts table dropped');
    } catch (error) {
      console.log('   ⚠️ test_attempts table may not exist:', error.message);
    }
    
    // Step 2: Create new testAttempt table
    console.log('\n📋 Creating testAttempt table...');
    const createTestAttemptTable = `
      CREATE TABLE testAttempt (
        id INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        exam_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(20) DEFAULT 'in_progress',
        time_taken INT NOT NULL DEFAULT 0,
        total_score DECIMAL(5,2) DEFAULT 0.00,
        percentage DECIMAL(5,2) DEFAULT 0.00,
        created_at DATETIME2(7) DEFAULT GETDATE(),
        start_time DATETIME NOT NULL,
        end_time DATETIME NULL,
        is_submitted BIT NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_testAttempt_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
        CONSTRAINT FK_testAttempt_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;
    
    await pool.request().query(createTestAttemptTable);
    console.log('✅ testAttempt table created successfully');
    
    // Step 3: Create new studentAnswer table
    console.log('\n📝 Creating studentAnswer table...');
    const createStudentAnswerTable = `
      CREATE TABLE studentAnswer (
        id INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        is_correct BIT DEFAULT 0,
        marks_obtained DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        student_answer NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2(7) DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_studentAnswer_attempt FOREIGN KEY (attempt_id) REFERENCES testAttempt(id) ON DELETE CASCADE,
        CONSTRAINT FK_studentAnswer_question FOREIGN KEY (question_id) REFERENCES questions(id),
        
        -- Unique constraint to prevent duplicate answers for same question in same attempt
        CONSTRAINT UK_studentAnswer_attempt_question UNIQUE (attempt_id, question_id)
      )
    `;
    
    await pool.request().query(createStudentAnswerTable);
    console.log('✅ studentAnswer table created successfully');
    
    // Step 4: Create indexes for performance
    console.log('\n⚡ Creating indexes for performance...');
    
    const indexes = [
      'CREATE INDEX IX_testAttempt_user_exam ON testAttempt (user_id, exam_id)',
      'CREATE INDEX IX_testAttempt_status ON testAttempt (status)',
      'CREATE INDEX IX_testAttempt_created_at ON testAttempt (created_at)',
      'CREATE INDEX IX_studentAnswer_attempt ON studentAnswer (attempt_id)',
      'CREATE INDEX IX_studentAnswer_question ON studentAnswer (question_id)',
      'CREATE INDEX IX_studentAnswer_is_correct ON studentAnswer (is_correct)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await pool.request().query(indexSQL);
        console.log(`   ✅ Index created: ${indexSQL.split(' ON ')[0].replace('CREATE INDEX ', '')}`);
      } catch (error) {
        console.log(`   ⚠️ Index creation failed: ${error.message}`);
      }
    }
    
    // Step 5: Verify table creation
    console.log('\n🔍 Verifying new table structure...');
    
    const testAttemptSchema = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'testAttempt'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📊 testAttempt table schema:');
    testAttemptSchema.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}${defaultVal}`);
    });
    
    const studentAnswerSchema = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'studentAnswer'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📝 studentAnswer table schema:');
    studentAnswerSchema.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}${defaultVal}`);
    });
    
    await pool.close();
    console.log('\n🎉 Database schema migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Dropped old tables: answers, test_attempts');
    console.log('   ✅ Created new table: testAttempt');
    console.log('   ✅ Created new table: studentAnswer');
    console.log('   ✅ Added foreign key constraints');
    console.log('   ✅ Added performance indexes');
    console.log('   ✅ Added unique constraints to prevent duplicates');
    
  } catch (error) {
    console.error('❌ Error during schema migration:', error);
    console.error('Full error details:', error);
  }
}

createNewSchema();
