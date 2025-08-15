-- Create Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
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
    PRINT 'Users table created successfully';
END
ELSE
BEGIN
    PRINT 'Users table already exists';
END

-- Create Exams Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='exams' AND xtype='U')
BEGIN
    CREATE TABLE exams (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        description TEXT,
        instructions TEXT,
        duration INT NOT NULL, -- in minutes
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
    PRINT 'Exams table created successfully';
END
ELSE
BEGIN
    PRINT 'Exams table already exists';
END

-- Create Questions Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
BEGIN
    CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('single-choice', 'multiple-choice', 'drag-drop', 'case-study', 'short-answer', 'code')),
        marks INT DEFAULT 1,
        order_index INT DEFAULT 0,
        case_study_content TEXT, -- for case study questions
        code_template TEXT, -- for code questions
        metadata TEXT, -- JSON string for additional question data
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
    PRINT 'Questions table created successfully';
END
ELSE
BEGIN
    PRINT 'Questions table already exists';
END

-- Create Question Options Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='question_options' AND xtype='U')
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
    PRINT 'Question options table created successfully';
END
ELSE
BEGIN
    PRINT 'Question options table already exists';
END

-- Create Test Attempts Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='test_attempts' AND xtype='U')
BEGIN
    CREATE TABLE test_attempts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
        started_at DATETIME2 DEFAULT GETDATE(),
        completed_at DATETIME2,
        time_taken INT, -- in seconds
        total_score DECIMAL(5,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    PRINT 'Test attempts table created successfully';
END
ELSE
BEGIN
    PRINT 'Test attempts table already exists';
END

-- Create Answers Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
BEGIN
    CREATE TABLE answers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_data TEXT, -- JSON string containing the answer
        is_correct BIT DEFAULT 0,
        marks_obtained DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
    );
    PRINT 'Answers table created successfully';
END
ELSE
BEGIN
    PRINT 'Answers table already exists';
END

-- Create Results Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='results' AND xtype='U')
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
    PRINT 'Results table created successfully';
END
ELSE
BEGIN
    PRINT 'Results table already exists';
END

PRINT 'Database schema initialization completed!';

-- Verify all tables were created
SELECT 
    name as table_name,
    create_date
FROM sys.tables 
WHERE name IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
ORDER BY name;
