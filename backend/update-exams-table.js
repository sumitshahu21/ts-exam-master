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

async function updateExamsTable() {
  let pool;
  
  try {
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!');
    
    // Drop and recreate exams table with proper structure
    console.log('📝 Updating exams table structure...');
    
    await pool.request().query(`
      -- Drop existing exams table if it exists
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'exams')
      BEGIN
        DROP TABLE exams;
        PRINT 'Dropped existing exams table';
      END
    `);
    
    await pool.request().query(`
      -- Create new exams table with correct structure
      CREATE TABLE exams (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        description TEXT,
        duration INT NOT NULL,
        randomize_questions BIT DEFAULT 0,
        allow_multiple_attempts BIT DEFAULT 0,
        questions TEXT, -- JSON string containing all questions
        is_published BIT DEFAULT 0,
        scheduled_start_time DATETIME2,
        scheduled_end_time DATETIME2,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
      PRINT 'Created new exams table with proper structure';
    `);
    
    console.log('✅ Exams table updated successfully!');
    console.log('🎯 New table structure supports:');
    console.log('   - JSON questions storage');
    console.log('   - Publishing functionality');
    console.log('   - Scheduled start/end times');
    console.log('   - Multiple attempts setting');
    console.log('   - Question randomization');
    
  } catch (error) {
    console.error('❌ Error updating exams table:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

updateExamsTable();
