import express from 'express';
import cors from 'cors';
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';

const app = express();
app.use(cors());
app.use(express.json());

const config: sql.config = {
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

app.get('/setup-database', async (req, res) => {
  const logs: string[] = [];
  let pool: sql.ConnectionPool | undefined;
  
  try {
    logs.push('🚀 Starting Azure SQL Database Setup');
    logs.push(`📍 Server: ${config.server}`);
    logs.push(`📍 Database: ${config.database}`);
    logs.push(`📍 User: ${config.user}`);
    
    logs.push('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    logs.push('✅ Successfully connected to Azure SQL Database!');
    
    // Test basic connectivity
    const versionResult = await pool.request().query('SELECT @@VERSION as version, GETDATE() as current_time');
    logs.push('📊 Database connection verified');
    logs.push(`📊 Current Time: ${versionResult.recordset[0].current_time}`);
    
    // Check existing tables
    const existingTablesResult = await pool.request().query(`
      SELECT name FROM sys.tables 
      WHERE name IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
    `);
    const existingTables = existingTablesResult.recordset.map(t => t.name);
    logs.push(`📋 Existing tables: ${existingTables.join(', ') || 'None'}`);
    
    // Create tables
    const tablesToCreate = [
      {
        name: 'users',
        sql: `CREATE TABLE users (
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
        )`
      },
      {
        name: 'exams',
        sql: `CREATE TABLE exams (
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
        )`
      },
      {
        name: 'questions',
        sql: `CREATE TABLE questions (
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
        )`
      },
      {
        name: 'question_options',
        sql: `CREATE TABLE question_options (
          id INT IDENTITY(1,1) PRIMARY KEY,
          question_id INT NOT NULL,
          option_text TEXT NOT NULL,
          is_correct BIT DEFAULT 0,
          order_index INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        )`
      },
      {
        name: 'test_attempts',
        sql: `CREATE TABLE test_attempts (
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
        )`
      },
      {
        name: 'answers',
        sql: `CREATE TABLE answers (
          id INT IDENTITY(1,1) PRIMARY KEY,
          attempt_id INT NOT NULL,
          question_id INT NOT NULL,
          answer_data TEXT,
          is_correct BIT DEFAULT 0,
          marks_obtained DECIMAL(5,2) DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(id)
        )`
      },
      {
        name: 'results',
        sql: `CREATE TABLE results (
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
        )`
      }
    ];
    
    for (const table of tablesToCreate) {
      if (!existingTables.includes(table.name)) {
        logs.push(`📝 Creating ${table.name} table...`);
        await pool.request().query(table.sql);
        logs.push(`✅ ${table.name} table created successfully`);
      } else {
        logs.push(`ℹ️ ${table.name} table already exists`);
      }
    }
    
    // Create test admin user
    logs.push('👤 Creating/verifying test admin user...');
    const userCheckResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM users WHERE email = 'admin@test.com'
    `);
    
    if (userCheckResult.recordset[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.request().query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ('admin@test.com', '${hashedPassword}', 'Test', 'Admin', 'admin')
      `);
      logs.push('✅ Test admin user created (admin@test.com / admin123)');
    } else {
      logs.push('ℹ️ Test admin user already exists');
    }
    
    // Final verification
    const finalTablesResult = await pool.request().query(`
      SELECT 
        t.name as table_name,
        COUNT(c.column_id) as column_count,
        t.create_date
      FROM sys.tables t
      LEFT JOIN sys.columns c ON t.object_id = c.object_id
      WHERE t.name IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
      GROUP BY t.name, t.create_date
      ORDER BY t.name
    `);
    
    logs.push('🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
    logs.push('===============================================');
    finalTablesResult.recordset.forEach(table => {
      logs.push(`📋 ${table.table_name.padEnd(20)} | ${table.column_count} columns`);
    });
    logs.push('🔑 Test Admin Credentials: admin@test.com / admin123');
    
    res.json({
      success: true,
      message: 'Database setup completed successfully',
      logs,
      tables: finalTablesResult.recordset
    });
    
  } catch (error: any) {
    logs.push(`❌ Error occurred: ${error.message}`);
    if (error.code) logs.push(`Error Code: ${error.code}`);
    if (error.number) logs.push(`SQL Error Number: ${error.number}`);
    
    res.status(500).json({
      success: false,
      message: 'Database setup failed',
      error: error.message,
      logs
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
        logs.push('🔌 Database connection closed');
      } catch (closeError) {
        logs.push(`Error closing connection: ${closeError}`);
      }
    }
  }
});

app.get('/test-connection', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT @@VERSION as version, GETDATE() as current_time');
    await pool.close();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.recordset[0]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Database setup server running on http://localhost:${PORT}`);
  console.log('Visit http://localhost:3001/setup-database to create tables');
  console.log('Visit http://localhost:3001/test-connection to test connection');
});

export default app;
