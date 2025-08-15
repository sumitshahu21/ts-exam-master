import * as sql from 'mssql';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

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

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync('database-setup.log', logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

async function createTables(): Promise<void> {
  let pool: sql.ConnectionPool | undefined;
  
  try {
    log('🚀 Starting Azure SQL Database Setup (TypeScript)');
    log(`📍 Server: ${config.server}`);
    log(`📍 Database: ${config.database}`);
    log(`📍 User: ${config.user}`);
    
    log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    log('✅ Successfully connected to Azure SQL Database!');
    
    // Test basic connectivity
    const versionResult = await pool.request().query('SELECT @@VERSION as version, GETDATE() as current_time');
    log(`📊 Database connected successfully`);
    log(`📊 Current Time: ${versionResult.recordset[0].current_time}`);
    
    // Check existing tables
    const existingTablesResult = await pool.request().query(`
      SELECT name FROM sys.tables 
      WHERE name IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
    `);
    const existingTables = existingTablesResult.recordset.map(t => t.name);
    log(`📋 Existing tables: ${existingTables.join(', ') || 'None'}`);
    
    // Create users table
    if (!existingTables.includes('users')) {
      log('📝 Creating users table...');
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
      log('✅ Users table created successfully');
    } else {
      log('ℹ️ Users table already exists');
    }
    
    // Create exams table
    if (!existingTables.includes('exams')) {
      log('📝 Creating exams table...');
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
      log('✅ Exams table created successfully');
    } else {
      log('ℹ️ Exams table already exists');
    }
    
    // Create questions table
    if (!existingTables.includes('questions')) {
      log('📝 Creating questions table...');
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
      log('✅ Questions table created successfully');
    } else {
      log('ℹ️ Questions table already exists');
    }
    
    // Create question_options table
    if (!existingTables.includes('question_options')) {
      log('📝 Creating question_options table...');
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
      log('✅ Question options table created successfully');
    } else {
      log('ℹ️ Question options table already exists');
    }
    
    // Create test_attempts table
    if (!existingTables.includes('test_attempts')) {
      log('📝 Creating test_attempts table...');
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
      log('✅ Test attempts table created successfully');
    } else {
      log('ℹ️ Test attempts table already exists');
    }
    
    // Create answers table
    if (!existingTables.includes('answers')) {
      log('📝 Creating answers table...');
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
      log('✅ Answers table created successfully');
    } else {
      log('ℹ️ Answers table already exists');
    }
    
    // Create results table
    if (!existingTables.includes('results')) {
      log('📝 Creating results table...');
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
      log('✅ Results table created successfully');
    } else {
      log('ℹ️ Results table already exists');
    }
    
    // Create test admin user
    log('👤 Creating/verifying test admin user...');
    const userCheckResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM users WHERE email = 'admin@test.com'
    `);
    
    if (userCheckResult.recordset[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.request().query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ('admin@test.com', '${hashedPassword}', 'Test', 'Admin', 'admin')
      `);
      log('✅ Test admin user created (admin@test.com / admin123)');
    } else {
      log('ℹ️ Test admin user already exists');
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
    
    log('\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
    log('===============================================');
    finalTablesResult.recordset.forEach(table => {
      log(`📋 ${table.table_name.padEnd(20)} | ${table.column_count} columns | Created: ${table.create_date}`);
    });
    log('\n🔑 Test Admin Credentials: admin@test.com / admin123');
    log('💡 You can now start your backend server and test registration!');
    
  } catch (error: any) {
    log(`❌ Error occurred: ${error.message}`);
    if (error.code) log(`Error Code: ${error.code}`);
    if (error.number) log(`SQL Error Number: ${error.number}`);
    if (error.state) log(`SQL State: ${error.state}`);
    if (error.class) log(`SQL Class: ${error.class}`);
    log(`Full error details: ${JSON.stringify(error, null, 2)}`);
  } finally {
    if (pool) {
      try {
        await pool.close();
        log('🔌 Database connection closed');
      } catch (closeError) {
        log(`Error closing connection: ${closeError}`);
      }
    }
  }
}

// Clear previous log
try {
  if (fs.existsSync('database-setup.log')) {
    fs.unlinkSync('database-setup.log');
  }
} catch (err) {
  console.error('Could not clear previous log:', err);
}

log('🚀 Starting database setup process...');
createTables().then(() => {
  log('✅ Setup process completed');
}).catch((error) => {
  log(`❌ Setup process failed: ${error.message}`);
});
