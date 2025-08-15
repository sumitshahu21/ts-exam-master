// Truncate all exam-related tables for a clean start
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'ntms-sql-server.database.windows.net',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'exam_db',
  user: process.env.DB_USER || 'ntms',
  password: process.env.DB_PASSWORD || 'Dev@2024Test!',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || true,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || false,
    enableArithAbort: true
  },
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  requestTimeout: 30000
};

async function truncateTables() {
  try {
    console.log('🗑️ Starting table truncation...');
    
    const pool = await sql.connect(config);
    
    // Use DELETE instead of TRUNCATE to handle foreign key constraints
    // Clear tables in correct order based on foreign key dependencies
    
    console.log('📊 Deleting all data from studentAnswer table...');
    await pool.request().query('DELETE FROM studentAnswer');
    
    console.log('📝 Deleting all data from testAttempt table...');  
    await pool.request().query('DELETE FROM testAttempt');
    
    console.log('📊 Deleting all data from test_attempts table...');
    await pool.request().query('DELETE FROM test_attempts');
    
    console.log('📝 Deleting all data from answers table...');
    await pool.request().query('DELETE FROM answers'); 
    
    console.log('📝 Deleting all data from results table...');
    await pool.request().query('DELETE FROM results');
    
    console.log('❓ Deleting all data from questions table...');
    await pool.request().query('DELETE FROM questions');
    
    console.log('📋 Deleting all data from exams table...');
    await pool.request().query('DELETE FROM exams');
    
    // Reset identity columns if they exist
    console.log('🔄 Resetting identity columns...');
    try {
      await pool.request().query('DBCC CHECKIDENT (\'exams\', RESEED, 0)');
      await pool.request().query('DBCC CHECKIDENT (\'questions\', RESEED, 0)');
      await pool.request().query('DBCC CHECKIDENT (\'testAttempt\', RESEED, 0)');
      await pool.request().query('DBCC CHECKIDENT (\'test_attempts\', RESEED, 0)');
      await pool.request().query('DBCC CHECKIDENT (\'studentAnswer\', RESEED, 0)');
      await pool.request().query('DBCC CHECKIDENT (\'answers\', RESEED, 0)');
      await pool.request().query('DBCC CHECKIDENT (\'results\', RESEED, 0)');
    } catch (identityError) {
      console.log('⚠️ Note: Some identity columns may not exist or already at zero');
    }
    
    console.log('✅ All exam-related data deleted successfully!');
    console.log('🎯 Database is now clean and ready for new exam creation.');
    console.log('📋 Cleared tables: exams, questions, testAttempt, test_attempts, studentAnswer, answers, results');
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  truncateTables();
}

module.exports = { truncateTables };
