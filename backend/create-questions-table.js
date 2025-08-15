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

async function createQuestionsTable() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully');

    console.log('Creating questions table...');
    
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' and xtype='U')
      CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_type NVARCHAR(50) NOT NULL,
        question_text NVARCHAR(MAX) NOT NULL,
        points INT NOT NULL DEFAULT 1,
        explanation NVARCHAR(MAX),
        question_data NVARCHAR(MAX) NOT NULL,
        order_index INT NOT NULL DEFAULT 1,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      );
    `;
    
    await pool.request().query(createTableQuery);
    console.log('Questions table created successfully');
    
    // Check if table exists
    const checkResult = await pool.request().query("SELECT name FROM sysobjects WHERE name='questions' and xtype='U'");
    console.log('Table exists:', checkResult.recordset.length > 0 ? 'Yes' : 'No');
    
    await pool.close();
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (pool) {
      await pool.close();
    }
  }
}

createQuestionsTable();
