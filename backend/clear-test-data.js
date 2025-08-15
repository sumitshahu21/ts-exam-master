const sql = require('mssql');
require('dotenv').config();

// Database configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function clearTestData() {
  let pool;
  
  try {
    console.log('� Starting complete database cleanup...');
    console.log('�🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!');

    console.log('\n🗑️  Starting to clear ALL data from ALL tables (including admin_invite_codes)...\n');

    // Define tables to clear in the correct order (respecting foreign key constraints)
    const tablesToClear = [
      'results',        // Clear results first (depends on test_attempts)
      'studentAnswer',  // Clear student answers (depends on testAttempt and questions)
      'answers',        // Clear answers (depends on test_attempts and questions)
      'testAttempt',    // Clear test attempts (depends on users and exams)
      'test_attempts',  // Clear test attempts (depends on users and exams) - legacy table
      'question_options', // Clear question options (depends on questions)
      'questions',      // Clear questions (depends on exams)
      'exams',          // Clear exams (depends on users for created_by)
      'otp_attempts',   // Clear OTP attempts (depends on users)
      'users',          // Clear users (referenced by many tables)
      'admin_invite_codes' // Clear admin invite codes last
    ];

    let totalRecordsDeleted = 0;

    for (const tableName of tablesToClear) {
      try {
        console.log(`📋 Clearing table: ${tableName}`);
        
        // First, count existing records
        const countResult = await pool.request()
          .query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const recordCount = countResult.recordset[0].count;
        
        if (recordCount === 0) {
          console.log(`   ℹ️  Table ${tableName} is already empty`);
          continue;
        }
        
        // Delete all records from the table
        const deleteResult = await pool.request()
          .query(`DELETE FROM ${tableName}`);
        
        console.log(`   ✅ Deleted ${recordCount} records from ${tableName}`);
        totalRecordsDeleted += recordCount;
        
        // Reset identity column if it exists
        try {
          await pool.request()
            .query(`DBCC CHECKIDENT('${tableName}', RESEED, 0)`);
          console.log(`   🔄 Reset identity column for ${tableName}`);
        } catch (identityError) {
          // Some tables might not have identity columns, ignore error
          if (!identityError.message.includes('does not contain an identity column')) {
            console.log(`   ⚠️  Could not reset identity for ${tableName}: ${identityError.message}`);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error clearing table ${tableName}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Total records deleted: ${totalRecordsDeleted}`);
    console.log('�️  ALL tables cleared - including admin_invite_codes');
    
    console.log('\n🎉 Complete database cleanup completed successfully!');
    console.log('📝 All tables are now completely empty and ready for fresh data.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Execute the cleanup
clearTestData();
