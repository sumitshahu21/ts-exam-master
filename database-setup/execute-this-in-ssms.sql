-- =====================================================
-- Web App Test Portal - Database Schema Setup
-- Execute this script in SQL Server Management Studio
-- =====================================================

USE exam_db;
GO

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        role NVARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
        profile_photo NVARCHAR(500),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ Users table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Users table already exists';
END
GO

-- =====================================================
-- 2. CREATE EXAMS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'exams')
BEGIN
    CREATE TABLE exams (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        subject NVARCHAR(100) NOT NULL,
        description NTEXT,
        instructions NTEXT,
        duration INT NOT NULL,
        total_marks INT DEFAULT 0,
        passing_marks INT DEFAULT 0,
        status NVARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        scheduled_start DATETIME2,
        scheduled_end DATETIME2,
        created_by INT NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (created_by) REFERENCES users(id)
    );
    PRINT '✅ Exams table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Exams table already exists';
END
GO

-- =====================================================
-- 3. CREATE QUESTIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'questions')
BEGIN
    CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_text NTEXT NOT NULL,
        question_type NVARCHAR(20) NOT NULL CHECK (question_type IN ('single-choice', 'multiple-choice', 'drag-drop', 'case-study', 'short-answer', 'code')),
        marks INT DEFAULT 1,
        order_index INT DEFAULT 0,
        case_study_content NTEXT,
        code_template NTEXT,
        metadata NTEXT,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
    PRINT '✅ Questions table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Questions table already exists';
END
GO

-- =====================================================
-- 4. CREATE QUESTION_OPTIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'question_options')
BEGIN
    CREATE TABLE question_options (
        id INT IDENTITY(1,1) PRIMARY KEY,
        question_id INT NOT NULL,
        option_text NTEXT NOT NULL,
        is_correct BIT DEFAULT 0,
        order_index INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    PRINT '✅ Question options table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Question options table already exists';
END
GO

-- =====================================================
-- 5. CREATE TEST_ATTEMPTS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'test_attempts')
BEGIN
    CREATE TABLE test_attempts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        user_id INT NOT NULL,
        status NVARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
        started_at DATETIME2 DEFAULT GETDATE(),
        completed_at DATETIME2,
        time_taken INT,
        total_score DECIMAL(5,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    PRINT '✅ Test attempts table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Test attempts table already exists';
END
GO

-- =====================================================
-- 6. CREATE ANSWERS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'answers')
BEGIN
    CREATE TABLE answers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_data NTEXT,
        is_correct BIT DEFAULT 0,
        marks_obtained DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
    );
    PRINT '✅ Answers table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Answers table already exists';
END
GO

-- =====================================================
-- 7. CREATE RESULTS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'results')
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
        grade NVARCHAR(10),
        status NVARCHAR(20) DEFAULT 'fail' CHECK (status IN ('pass', 'fail')),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
    );
    PRINT '✅ Results table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️  Results table already exists';
END
GO

-- =====================================================
-- 8. CREATE TEST ADMIN USER
-- =====================================================
-- Note: Password hash for 'admin123' using bcrypt
IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@test.com')
BEGIN
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (
        'admin@test.com', 
        '$2b$10$rQUGnW5y7dH6aKwN.YwXXO5kJ5L9yRH1jF2Vx8P2wQ9vD8gH4mK6S', 
        'Admin', 
        'User', 
        'admin'
    );
    PRINT '✅ Test admin user created: admin@test.com / admin123';
END
ELSE
BEGIN
    PRINT 'ℹ️  Test admin user already exists';
END
GO

-- =====================================================
-- 9. VERIFY TABLES CREATED
-- =====================================================
SELECT 
    TABLE_NAME as 'Table Name',
    TABLE_TYPE as 'Type',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as 'Columns'
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_NAME IN ('users', 'exams', 'questions', 'question_options', 'test_attempts', 'answers', 'results')
ORDER BY TABLE_NAME;

PRINT '🎉 Database setup completed successfully!';
PRINT '📊 All tables have been created for the Web App Test Portal';
PRINT '👤 Test admin account: admin@test.com / admin123';
GO
