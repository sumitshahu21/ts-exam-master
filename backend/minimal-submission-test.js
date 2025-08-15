// Minimal test to identify exact submission issue
const sql = require('mssql');

const config = {
  user: 'studentportal',
  password: 'SecurePassword123!',
  server: 'ntms-sql-server.database.windows.net',
  database: 'StudentPortalDB',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  }
};

async function minimalSubmissionTest() {
  const pool = await sql.connect(config);
  console.log('Connected to database');
  
  try {
    // Check what columns exist in testAttempt table
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'testAttempt'
    `);
    
    const columnNames = columns.recordset.map(c => c.COLUMN_NAME);
    console.log('testAttempt columns:', columnNames);
    
    // Check for required columns
    const requiredColumns = ['total_score', 'percentage', 'time_taken', 'is_submitted'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      console.log('🔧 These columns need to be added for submission to work');
      
      // Try to add missing columns
      for (const col of missingColumns) {
        try {
          let columnType;
          switch(col) {
            case 'total_score': 
            case 'percentage': 
              columnType = 'DECIMAL(5,2) DEFAULT 0';
              break;
            case 'time_taken': 
              columnType = 'INT DEFAULT 0';
              break;
            case 'is_submitted': 
              columnType = 'BIT DEFAULT 0';
              break;
          }
          
          console.log(`🔧 Adding column ${col}...`);
          await pool.request().query(`ALTER TABLE testAttempt ADD ${col} ${columnType}`);
          console.log(`✅ Added column ${col}`);
        } catch (error) {
          console.log(`⚠️ Column ${col} might already exist or error:`, error.message);
        }
      }
    } else {
      console.log('✅ All required columns exist');
    }
    
    // Now test a minimal update
    const attempts = await pool.request().query(`
      SELECT TOP 1 id FROM testAttempt WHERE status = 'in_progress'
    `);
    
    if (attempts.recordset.length > 0) {
      const attemptId = attempts.recordset[0].id;
      console.log(`\n🧪 Testing minimal update on attempt ${attemptId}...`);
      
      // Test minimal update that should definitely work
      const result = await pool.request()
        .input('attemptId', sql.Int, attemptId)
        .query(`
          UPDATE testAttempt 
          SET status = 'completed', updated_at = GETDATE()
          WHERE id = @attemptId AND status = 'in_progress'
        `);
        
      console.log('Update result:', result.rowsAffected);
      
      if (result.rowsAffected[0] > 0) {
        console.log('✅ Basic update works!');
        
        // Revert
        await pool.request()
          .input('attemptId', sql.Int, attemptId)
          .query(`
            UPDATE testAttempt 
            SET status = 'in_progress', updated_at = GETDATE()
            WHERE id = @attemptId
          `);
        console.log('🔄 Reverted to in_progress');
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

minimalSubmissionTest();
