import sql from 'mssql';

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
  requestTimeout: 30000
};

async function addStandardizedAnswerFields() {
  try {
    console.log('🔧 Adding standardized answer fields to questions...');
    const pool = await sql.connect(config);
    
    // Get all questions
    const result = await pool.request()
      .query(`
        SELECT id, question_type, question_data
        FROM questions
        WHERE is_active = 1
      `);
    
    console.log('📚 Questions to update:', result.recordset.length);
    
    let updatedCount = 0;
    
    for (const question of result.recordset) {
      try {
        const questionData = JSON.parse(question.question_data);
        let needsUpdate = false;
        
        console.log(`\n🔍 Processing Question ${question.id} (${question.question_type})`);
        
        if (question.question_type === 'single-choice') {
          // Add correctAnswer field if missing
          if (!questionData.correctAnswer && questionData.options) {
            const correctOption = questionData.options.find(opt => opt.isCorrect);
            if (correctOption) {
              questionData.correctAnswer = correctOption.id;
              needsUpdate = true;
              console.log(`  ✅ Added correctAnswer: ${correctOption.id}`);
            }
          }
        } else if (question.question_type === 'multiple-choice') {
          // Add correctAnswers field if missing
          if (!questionData.correctAnswers && questionData.options) {
            const correctOptions = questionData.options.filter(opt => opt.isCorrect);
            if (correctOptions.length > 0) {
              questionData.correctAnswers = correctOptions.map(opt => opt.id);
              needsUpdate = true;
              console.log(`  ✅ Added correctAnswers: [${questionData.correctAnswers.join(', ')}]`);
            }
          }
        } else if (question.question_type === 'case-study') {
          // Add correctAnswer/correctAnswers to sub-questions
          if (questionData.subQuestions) {
            questionData.subQuestions.forEach((subQ, index) => {
              if (subQ.questionType === 'single-choice' && !subQ.correctAnswer && subQ.options) {
                const correctOption = subQ.options.find(opt => opt.isCorrect);
                if (correctOption) {
                  subQ.correctAnswer = correctOption.id;
                  needsUpdate = true;
                  console.log(`  ✅ Added correctAnswer to sub-question ${index}: ${correctOption.id}`);
                }
              } else if (subQ.questionType === 'multiple-choice' && !subQ.correctAnswers && subQ.options) {
                const correctOptions = subQ.options.filter(opt => opt.isCorrect);
                if (correctOptions.length > 0) {
                  subQ.correctAnswers = correctOptions.map(opt => opt.id);
                  needsUpdate = true;
                  console.log(`  ✅ Added correctAnswers to sub-question ${index}: [${subQ.correctAnswers.join(', ')}]`);
                }
              }
            });
          }
        } else if (question.question_type === 'drag-drop') {
          // Add correctMappings field if missing
          if (!questionData.correctMappings && questionData.dragDropTargets) {
            const correctMappings = {};
            questionData.dragDropTargets.forEach(target => {
              if (target.correctItemId) {
                correctMappings[target.correctItemId] = target.id;
              }
            });
            if (Object.keys(correctMappings).length > 0) {
              questionData.correctMappings = correctMappings;
              needsUpdate = true;
              console.log(`  ✅ Added correctMappings:`, correctMappings);
            }
          }
        }
        
        if (needsUpdate) {
          // Update the database
          const updatedData = JSON.stringify(questionData);
          
          await pool.request()
            .input('questionId', sql.Int, question.id)
            .input('questionData', sql.NVarChar(sql.MAX), updatedData)
            .query(`
              UPDATE questions 
              SET question_data = @questionData
              WHERE id = @questionId
            `);
          
          console.log(`  💾 Updated Question ${question.id}`);
          updatedCount++;
        } else {
          console.log(`  ✓ Question ${question.id} already has standardized fields`);
        }
        
      } catch (parseError) {
        console.log(`❌ Error processing Question ${question.id}:`, parseError.message);
      }
    }
    
    console.log(`\n🎯 Updated ${updatedCount} questions with standardized answer fields`);
    
    await pool.close();
    console.log('✅ Database update completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addStandardizedAnswerFields();
