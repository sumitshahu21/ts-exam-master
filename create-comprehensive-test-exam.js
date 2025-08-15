import sql from 'mssql';

// Database configuration for Azure SQL
const config = {
  user: 'admin_user',
  password: 'Pass@word123',
  server: 'mydemosqlserver112.database.windows.net',
  database: 'testingdatabase',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function createComprehensiveTestExam() {
  let pool;
  
  try {
    console.log('🔗 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Database connected successfully');

    // Create a comprehensive test exam
    console.log('📝 Creating comprehensive test exam...');
    
    const examResult = await pool.request()
      .input('title', sql.VarChar, 'Comprehensive Question Types Test')
      .input('subject', sql.VarChar, 'Mixed Subject Test')
      .input('description', sql.VarChar, 'Test exam with all question types to verify fixes')
      .input('duration', sql.Int, 30) // 30 minutes
      .input('total_marks', sql.Int, 25)
      .input('passing_score', sql.Int, 15)
      .input('is_published', sql.Bit, 1)
      .input('created_by', sql.Int, 1)
      .query(`
        INSERT INTO exams (title, subject, description, duration, total_marks, passing_score, is_published, created_by, created_at)
        OUTPUT INSERTED.id
        VALUES (@title, @subject, @description, @duration, @total_marks, @passing_score, @is_published, @created_by, GETDATE())
      `);

    const examId = examResult.recordset[0].id;
    console.log('✅ Test exam created with ID:', examId);

    // Question 1: Single Choice (Fixed format from database)
    const singleChoiceData = {
      questionText: "What is the capital of France?",
      points: 5,
      explanation: "Paris is the capital and largest city of France.",
      options: [
        { id: "opt1", text: "London", isCorrect: false },
        { id: "opt2", text: "Paris", isCorrect: true },
        { id: "opt3", text: "Berlin", isCorrect: false },
        { id: "opt4", text: "Madrid", isCorrect: false }
      ],
      correctAnswer: "opt2",
      randomizeOptions: false
    };

    await pool.request()
      .input('exam_id', sql.Int, examId)
      .input('question_type', sql.NVarChar, 'single-choice')
      .input('question_text', sql.NVarChar, 'What is the capital of France?')
      .input('question_data', sql.NVarChar, JSON.stringify(singleChoiceData))
      .input('marks', sql.Int, 5)
      .input('order_index', sql.Int, 1)
      .query(`
        INSERT INTO questions (exam_id, question_type, question_text, question_data, marks, order_index, created_at)
        VALUES (@exam_id, @question_type, @question_text, @question_data, @marks, @order_index, GETDATE())
      `);

    console.log('✅ Single choice question added');

    // Question 2: Multiple Choice
    const multipleChoiceData = {
      questionText: "Which of the following are programming languages?",
      points: 5,
      explanation: "JavaScript, Python, and Java are all programming languages.",
      options: ["JavaScript", "HTML", "Python", "Java"],
      correctAnswers: [0, 2, 3],
      randomizeOptions: false
    };

    await pool.request()
      .input('exam_id', sql.Int, examId)
      .input('question_type', sql.NVarChar, 'multiple-choice')
      .input('question_text', sql.NVarChar, 'Which of the following are programming languages?')
      .input('question_data', sql.NVarChar, JSON.stringify(multipleChoiceData))
      .input('marks', sql.Int, 5)
      .input('order_index', sql.Int, 2)
      .query(`
        INSERT INTO questions (exam_id, question_type, question_text, question_data, marks, order_index, created_at)
        VALUES (@exam_id, @question_type, @question_text, @question_data, @marks, @order_index, GETDATE())
      `);

    console.log('✅ Multiple choice question added');

    // Question 3: Drag and Drop (dragDropItems + dragDropTargets format)
    const dragDropData = {
      questionText: "Sort the fruits alphabetically",
      points: 5,
      explanation: "Alphabetical order: apple, banana, cherry, date",
      dragDropItems: [
        { id: "item-1", content: "banana" },
        { id: "item-2", content: "apple" },
        { id: "item-3", content: "date" },
        { id: "item-4", content: "cherry" }
      ],
      dragDropTargets: [
        { id: "target-1", content: "First", correctItemId: "item-2" },
        { id: "target-2", content: "Second", correctItemId: "item-1" },
        { id: "target-3", content: "Third", correctItemId: "item-4" },
        { id: "target-4", content: "Fourth", correctItemId: "item-3" }
      ]
    };

    await pool.request()
      .input('exam_id', sql.Int, examId)
      .input('question_type', sql.NVarChar, 'drag-drop')
      .input('question_text', sql.NVarChar, 'Sort the fruits alphabetically')
      .input('question_data', sql.NVarChar, JSON.stringify(dragDropData))
      .input('marks', sql.Int, 5)
      .input('order_index', sql.Int, 3)
      .query(`
        INSERT INTO questions (exam_id, question_type, question_text, question_data, marks, order_index, created_at)
        VALUES (@exam_id, @question_type, @question_text, @question_data, @marks, @order_index, GETDATE())
      `);

    console.log('✅ Drag and drop question added');

    // Question 4: Case Study
    const caseStudyData = {
      questionText: "Read the following case study and answer the questions",
      points: 5,
      explanation: "",
      caseStudyText: "Ram, Shyam, and Savita are three students in a class. Ram is male, Shyam is male, and Savita is female. They are working on a group project together.",
      subQuestions: [
        {
          questionType: "single-choice",
          questionText: "What is Ram's gender?",
          marks: 2,
          options: ["Male", "Female", "Unknown", "Not specified"],
          correctAnswers: [0]
        },
        {
          questionType: "single-choice",
          questionText: "What is Savita's gender?",
          marks: 2,
          options: ["Male", "Female", "Unknown", "Not specified"],
          correctAnswers: [1]
        },
        {
          questionType: "multiple-choice",
          questionText: "Which students are mentioned in the case study?",
          marks: 1,
          options: ["Ram", "Shyam", "Savita", "Priya"],
          correctAnswers: [0, 1, 2]
        }
      ]
    };

    await pool.request()
      .input('exam_id', sql.Int, examId)
      .input('question_type', sql.NVarChar, 'case-study')
      .input('question_text', sql.NVarChar, 'Read the following case study and answer the questions')
      .input('question_data', sql.NVarChar, JSON.stringify(caseStudyData))
      .input('marks', sql.Int, 5)
      .input('order_index', sql.Int, 4)
      .query(`
        INSERT INTO questions (exam_id, question_type, question_text, question_data, marks, order_index, created_at)
        VALUES (@exam_id, @question_type, @question_text, @question_data, @marks, @order_index, GETDATE())
      `);

    console.log('✅ Case study question added');

    // Question 5: Short Answer
    const shortAnswerData = {
      questionText: "Explain the importance of data structures in programming",
      points: 5,
      explanation: "Students should discuss efficiency, organization, and problem-solving aspects",
      expectedLength: 100,
      gradingRubric: "Full marks for comprehensive explanation covering efficiency and practical applications"
    };

    await pool.request()
      .input('exam_id', sql.Int, examId)
      .input('question_type', sql.NVarChar, 'short-answer')
      .input('question_text', sql.NVarChar, 'Explain the importance of data structures in programming')
      .input('question_data', sql.NVarChar, JSON.stringify(shortAnswerData))
      .input('marks', sql.Int, 5)
      .input('order_index', sql.Int, 5)
      .query(`
        INSERT INTO questions (exam_id, question_type, question_text, question_data, marks, order_index, created_at)
        VALUES (@exam_id, @question_type, @question_text, @question_data, @marks, @order_index, GETDATE())
      `);

    console.log('✅ Short answer question added');

    console.log('\n🎉 Comprehensive test exam created successfully!');
    console.log(`📋 Exam ID: ${examId}`);
    console.log(`🌐 Access URL: http://localhost:5173/student/exam/${examId}`);
    console.log('\n📝 Test Cases:');
    console.log('1. ✅ Single Choice: Standard radio button selection');
    console.log('2. ✅ Multiple Choice: Checkbox selection for multiple answers');
    console.log('3. ✅ Drag & Drop: Item block → Target block with reverse drag');
    console.log('4. ✅ Case Study: Background text + multiple sub-questions');
    console.log('5. ✅ Short Answer: Text area with word count');
    
    console.log('\n🔐 Login Credentials:');
    console.log('   📧 Email: student@test.com');
    console.log('   🔑 Password: password123');

  } catch (error) {
    console.error('❌ Error creating test exam:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔚 Database connection closed');
    }
  }
}

// Run the function
createComprehensiveTestExam().catch(console.error);
