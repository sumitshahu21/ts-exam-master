const sql = require('mssql');

// Database configuration
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

async function cleanupSpecificDuplicate() {
  let pool;
  
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    
    // Check the specific case - attempts 77 and 78
    console.log('🔍 Checking attempts 77 and 78...');
    const checkAttempts = await pool.request().query(`
      SELECT id, user_id, exam_id, status, start_time, end_time, is_submitted, created_at
      FROM testAttempt 
      WHERE id IN (77, 78)
      ORDER BY id
    `);
    
    console.log('Found attempts:');
    checkAttempts.recordset.forEach(attempt => {
      console.log(`  - Attempt ${attempt.id}: User ${attempt.user_id}, Exam ${attempt.exam_id}, Status '${attempt.status}', Submitted: ${attempt.is_submitted}, Created: ${attempt.created_at}`);
    });
    
    // If attempt 77 is in_progress and 78 is completed, fix 77
    const attempt77 = checkAttempts.recordset.find(a => a.id === 77);
    const attempt78 = checkAttempts.recordset.find(a => a.id === 78);
    
    if (attempt77 && attempt78) {
      console.log(`\n📊 Attempt 77 status: ${attempt77.status}`);
      console.log(`📊 Attempt 78 status: ${attempt78.status}`);
      
      if (attempt77.status === 'in_progress' && attempt78.status === 'completed') {
        console.log('🔧 Fixing attempt 77 - setting to expired...');
        
        const result = await pool.request()
          .input('attemptId', sql.Int, 77)
          .query(`
            UPDATE testAttempt 
            SET status = 'expired', updated_at = GETDATE()
            WHERE id = @attemptId
          `);
        
        console.log(`✅ Updated ${result.rowsAffected[0]} record(s) - Attempt 77 set to expired`);
        
        // Verify the fix
        const verifyResult = await pool.request().query(`
          SELECT id, status, updated_at
          FROM testAttempt 
          WHERE id = 77
        `);
        
        const updated = verifyResult.recordset[0];
        console.log(`🔍 Verification - Attempt 77 now has status: '${updated.status}', updated: ${updated.updated_at}`);
      } else {
        console.log('ℹ️ No fix needed - attempts are in expected states');
      }
    } else {
      console.log('⚠️ Could not find both attempts 77 and 78');
    }
    
    // Final check for any remaining duplicates for user 2, exam 43
    console.log('\n🔍 Final check for user 2, exam 43...');
    const finalCheck = await pool.request().query(`
      SELECT 
        id, status, start_time, end_time, is_submitted, created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
      FROM testAttempt 
      WHERE user_id = 2 AND exam_id = 43
      ORDER BY created_at DESC
    `);
    
    console.log('All attempts for User 2, Exam 43:');
    finalCheck.recordset.forEach(attempt => {
      console.log(`  - Attempt ${attempt.id}: Status '${attempt.status}', Created: ${attempt.created_at} ${attempt.row_num === 1 ? '(LATEST)' : ''}`);
    });
    
    console.log('\n✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

cleanupSpecificDuplicate();
