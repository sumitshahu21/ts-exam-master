const sql = require('mssql');

// ODBC-style connection configuration
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function createTables() {
  let pool;
  
  try {
    console.log('🔌 Connecting to Azure SQL Database...');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    console.log('User:', config.user);
    
    pool = await sql.connect(config);
    console.log('✅ Successfully connected to Azure SQL Database!');
    
    // Test basic connectivity
    const testResult = await pool.request().query('SELECT @@VERSION as version, GETDATE() as current_time');
    console.log('📊 Database Info:', testResult.recordset[0]);
    
    // Create users table
    console.log('\n📝 Creating users table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      BEGIN
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
        );
        PRINT 'Users table created';
      END
      ELSE
      BEGIN
        PRINT 'Users table already exists';
      END
    `);
    
    // Create exams table
    console.log('📝 Creating exams table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'exams')
      BEGIN
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
        );
        PRINT 'Exams table created';
      END
    `);
    
    // Create questions table
    console.log('📝 Creating questions table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'questions')
      BEGIN
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
        );
        PRINT 'Questions table created';
      END
    `);
    
    // Create question_options table
    console.log('📝 Creating question_options table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'question_options')
      BEGIN
        CREATE TABLE question_options (
          id INT IDENTITY(1,1) PRIMARY KEY,
          question_id INT NOT NULL,
          option_text TEXT NOT NULL,
          is_correct BIT DEFAULT 0,
          order_index INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        );
        PRINT 'Question options table created';
      END
    `);
    
    // Create test_attempts table
    console.log('📝 Creating test_attempts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_attempts')
      BEGIN
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
        );
        PRINT 'Test attempts table created';
      END
    `);
    
    // Create answers table
    console.log('📝 Creating answers table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'answers')
      BEGIN
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
        );
        PRINT 'Answers table created';
      END
    `);
    
    // Create results table
    console.log('📝 Creating results table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'results')
      BEGIN
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
        );
        PRINT 'Results table created';
      END
    `);
    
    // Insert a test admin user
    console.log('👤 Creating test admin user...');
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@test.com')
      BEGIN
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ('admin@test.com', '${hashedPassword}', 'Test', 'Admin', 'admin');
        PRINT 'Test admin user created (admin@test.com / admin123)';
      END
      ELSE
      BEGIN
        PRINT 'Test admin user already exists';
      END
    `);
    
    // Verify tables
    console.log('\n🔍 Verifying created tables...');
    const tablesResult = await pool.request().query(`
      SELECT 
        t.name as table_name,
        t.create_date,
        COUNT(c.column_id) as column_count
      FROM sys.tables t
      LEFT JOIN sys.columns c ON t.object_id = c.object_id
      WHERE t.name IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
      GROUP BY t.name, t.create_date
      ORDER BY t.name
    `);
    
    console.log('\n✅ Database Tables Created Successfully:');
    console.log('================================================');
    tablesResult.recordset.forEach(table => {
      console.log(`📋 ${table.table_name.padEnd(20)} | ${table.column_count} columns | Created: ${table.create_date}`);
    });
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('🔑 Test Admin Login: admin@test.com / admin123');
    
  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    if (error.number) console.error('SQL Error Number:', error.number);
    if (error.state) console.error('SQL State:', error.state);
    if (error.class) console.error('SQL Class:', error.class);
    console.error('\nFull Error Details:', error);
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('\n🔌 Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}

console.log('🚀 Starting Azure SQL Database Setup...');
console.log('📍 Using ODBC-style connection parameters');
createTables();
