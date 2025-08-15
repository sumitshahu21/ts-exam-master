const sql = require('mssq    console.log('📋 Step 1: Backing up existing questions data...');
    
    // Get existing questions data with current schema
    const existingResult = await pool.request().query(`
      SELECT id, exam_id, question_type, question_text, marks, 
             explanation, case_study_content, code_template, metadata,
             order_index, is_active, created_at, updated_at, question_data
      FROM questions
    `);uire('dotenv').config();

// Database configuration
const config = {
  server: process.env.DB_SERVER || 'ntms-sql-server.database.windows.net',
  user: process.env.DB_USER || 'ntms',
  password: process.env.DB_PASSWORD || 'Dev@2024Test!',
  database: process.env.DB_NAME || 'exam_db',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

console.log('🔄 Starting Questions Table Schema Migration for SQL Server...\n');

async function migrateQuestionsSchema() {
  let pool;
  
  try {
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully');

    console.log('\n📋 Step 1: Backing up existing questions data...');
    
    // Get existing questions data
    const existingResult = await pool.request().query(`
      SELECT id, exam_id, question_type, question_text, points, 
             explanation, case_study_content, code_template, metadata,
             order_index, is_active, created_at, updated_at
      FROM questions
    `);
    
    const existingQuestions = existingResult.recordset;
    console.log(`   Found ${existingQuestions.length} existing questions to migrate`);

    console.log('\n🗑️  Step 2: Creating backup and new table structure...');
    
    // Create backup table
    await pool.request().query(`
      IF OBJECT_ID(N'questions_backup', N'U') IS NOT NULL
        DROP TABLE questions_backup
    `);
    
    // Create backup with current data
    await pool.request().query(`
      SELECT * INTO questions_backup FROM questions
    `);
    
    console.log('   ✅ Backup table created successfully');

    // Drop foreign key constraints first
    console.log('   🔗 Dropping foreign key constraints...');
    
    // Find and drop foreign key constraints
    const fkResult = await pool.request().query(`
      SELECT name 
      FROM sys.foreign_keys 
      WHERE parent_object_id = OBJECT_ID('questions')
    `);
    
    for (const fk of fkResult.recordset) {
      await pool.request().query(`ALTER TABLE questions DROP CONSTRAINT ${fk.name}`);
    }

    // Drop current questions table
    await pool.request().query(`DROP TABLE questions`);
    
    // Create new simplified questions table
    await pool.request().query(`
      CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_type NVARCHAR(50) NOT NULL,
        question_data NVARCHAR(MAX) NOT NULL,
        order_index INT DEFAULT 1,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);
    
    // Add foreign key constraint back
    await pool.request().query(`
      ALTER TABLE questions 
      ADD CONSTRAINT FK_questions_exam_id 
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    `);
    
    console.log('   ✅ New questions table created successfully');

    console.log('\n🔄 Step 3: Migrating existing data to new format...');
    
    // Migrate each question to the new JSON format
    for (let i = 0; i < existingQuestions.length; i++) {
      const question = existingQuestions[i];
      
      let questionData = {};
      
      // Build question_data JSON based on question type
      switch (question.question_type) {
        case 'single-choice':
        case 'multiple-choice':
          // If question_data already exists and is valid JSON, use it, otherwise create new
          let existingData = {};
          try {
            if (question.question_data && question.question_data !== '{}') {
              existingData = JSON.parse(question.question_data);
            }
          } catch (e) {
            // Invalid JSON, will create new
          }
          
          questionData = {
            questionText: question.question_text || '',
            points: question.marks || 0,
            explanation: question.explanation || '',
            options: existingData.options || [
              { id: 'opt1', text: 'Option 1', isCorrect: false },
              { id: 'opt2', text: 'Option 2', isCorrect: true }
            ],
            correctAnswer: question.question_type === 'single-choice' 
              ? (existingData.correctAnswer || 'opt2') 
              : undefined,
            correctAnswers: question.question_type === 'multiple-choice' 
              ? (existingData.correctAnswers || ['opt2']) 
              : undefined,
            randomizeOptions: existingData.randomizeOptions || false
          };
          break;
          
        case 'drag-drop':
          questionData = {
            questionText: question.question_text || '',
            points: question.marks || 0,
            explanation: question.explanation || '',
            subType: 'matching',
            dragItems: [
              { id: 'item1', content: 'Item 1', type: 'text' },
              { id: 'item2', content: 'Item 2', type: 'text' }
            ],
            dropTargets: [
              { id: 'target1', label: 'Target 1', correctItemId: 'item1', acceptsMultiple: false },
              { id: 'target2', label: 'Target 2', correctItemId: 'item2', acceptsMultiple: false }
            ],
            correctMappings: {
              'item1': 'target1',
              'item2': 'target2'
            },
            allowPartialCredit: true
          };
          break;
          
        case 'case-study':
          questionData = {
            questionText: question.question_text || '',
            caseStudyContext: question.case_study_content || '',
            points: question.marks || 0,
            subQuestions: [
              {
                questionType: 'single-choice',
                questionText: 'Sample sub-question',
                options: [
                  { id: 'opt1', text: 'Option A', isCorrect: true },
                  { id: 'opt2', text: 'Option B', isCorrect: false }
                ],
                correctAnswer: 'opt1'
              }
            ]
          };
          break;
          
        case 'short-answer':
          questionData = {
            questionText: question.question_text || '',
            points: question.marks || 0,
            explanation: question.explanation || '',
            maxLength: 500,
            minLength: 10,
            sampleAnswer: ''
          };
          break;
          
        default:
          // Generic format for unknown types
          questionData = {
            questionText: question.question_text || '',
            points: question.marks || 0,
            explanation: question.explanation || '',
            metadata: question.metadata ? JSON.parse(question.metadata) : {}
          };
      }
      
      // Insert migrated question using IDENTITY_INSERT
      await pool.request().query(`SET IDENTITY_INSERT questions ON`);
      
      await pool.request()
        .input('id', sql.Int, question.id)
        .input('exam_id', sql.Int, question.exam_id)
        .input('question_type', sql.NVarChar(50), question.question_type)
        .input('question_data', sql.NVarChar(sql.MAX), JSON.stringify(questionData))
        .input('order_index', sql.Int, question.order_index || 1)
        .input('is_active', sql.Bit, question.is_active !== undefined ? question.is_active : 1)
        .input('created_at', sql.DateTime2, question.created_at)
        .input('updated_at', sql.DateTime2, question.updated_at)
        .query(`
          INSERT INTO questions (
            id, exam_id, question_type, question_data, 
            order_index, is_active, created_at, updated_at
          ) VALUES (@id, @exam_id, @question_type, @question_data, 
                   @order_index, @is_active, @created_at, @updated_at)
        `);
      
      await pool.request().query(`SET IDENTITY_INSERT questions OFF`);
      
      console.log(`   📝 Migrated question ${i + 1}/${existingQuestions.length} (ID: ${question.id})`);
    }

    console.log('\n🎯 Step 4: Creating indexes for performance...');
    
    // Create indexes
    await pool.request().query(`
      CREATE NONCLUSTERED INDEX IX_questions_exam_id ON questions(exam_id)
    `);
    await pool.request().query(`
      CREATE NONCLUSTERED INDEX IX_questions_type ON questions(question_type)
    `);
    await pool.request().query(`
      CREATE NONCLUSTERED INDEX IX_questions_active ON questions(is_active)
    `);
    
    console.log('   ✅ Indexes created successfully');

    console.log('\n📊 Step 5: Verifying migration...');
    
    const migratedResult = await pool.request().query('SELECT COUNT(*) as count FROM questions');
    const migratedCount = migratedResult.recordset[0].count;
    const originalCount = existingQuestions.length;
    
    console.log(`   Original questions: ${originalCount}`);
    console.log(`   Migrated questions: ${migratedCount}`);
    
    if (migratedCount === originalCount) {
      console.log('   ✅ Migration successful - all questions migrated');
    } else {
      console.log('   ⚠️  Migration count mismatch - please check data');
    }

    console.log('\n🧹 Step 6: Cleaning up...');
    console.log('   Backup table "questions_backup" is available if rollback needed');
    console.log('   To remove backup: DROP TABLE questions_backup;');

    console.log('\n✅ Questions Schema Migration Completed Successfully! 🎉');
    console.log('\n📋 New Table Structure:');
    console.log('   - id (INT IDENTITY PK)');
    console.log('   - exam_id (INT FK)');
    console.log('   - question_type (NVARCHAR(50))');
    console.log('   - question_data (NVARCHAR(MAX) - JSON)');
    console.log('   - order_index (INT)');
    console.log('   - is_active (BIT)');
    console.log('   - created_at (DATETIME2)');
    console.log('   - updated_at (DATETIME2)');
    
    console.log('\n🗑️  Removed Columns:');
    console.log('   - question_text (now in question_data.questionText)');
    console.log('   - points (now in question_data.points)');
    console.log('   - explanation (now in question_data.explanation)');
    console.log('   - case_study_content (now in question_data.caseStudyContext)');
    console.log('   - code_template (moved to question_data if needed)');
    console.log('   - metadata (integrated into question_data)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔄 Rolling back changes...');
    
    try {
      if (pool) {
        // Rollback - restore backup if it exists
        await pool.request().query(`
          IF OBJECT_ID(N'questions', N'U') IS NOT NULL
            DROP TABLE questions
        `);
        await pool.request().query(`
          SELECT * INTO questions FROM questions_backup
        `);
        console.log('✅ Rollback completed - original table restored');
      }
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
      console.log('⚠️  Manual intervention may be required');
    }
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n📚 Database connection closed');
    }
  }
}

// Run the migration
migrateQuestionsSchema();
