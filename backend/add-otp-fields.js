const sql = require('mssql');

// Database configuration - using the same config as working-server.js
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

async function addOTPFields() {
  let pool;
  
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');

    // Check if OTP fields already exist
    console.log('\n🔍 Checking current users table structure...');
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('otp_code', 'otp_expires_at', 'is_email_verified', 'email_verified_at')
    `);

    const existingColumns = columnsResult.recordset.map(row => row.COLUMN_NAME);
    console.log('📋 Existing OTP-related columns:', existingColumns);

    // Add OTP fields if they don't exist
    const fieldsToAdd = [
      {
        name: 'otp_code',
        definition: 'VARCHAR(6) NULL',
        description: 'Stores 6-digit OTP code'
      },
      {
        name: 'otp_expires_at',
        definition: 'DATETIME2 NULL',
        description: 'OTP expiration timestamp'
      },
      {
        name: 'is_email_verified',
        definition: 'BIT DEFAULT 0',
        description: 'Email verification status'
      },
      {
        name: 'email_verified_at',
        definition: 'DATETIME2 NULL',
        description: 'Email verification timestamp'
      }
    ];

    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        console.log(`\n➕ Adding ${field.name} column...`);
        await pool.request().query(`
          ALTER TABLE users 
          ADD ${field.name} ${field.definition}
        `);
        console.log(`✅ Added ${field.name}: ${field.description}`);
      } else {
        console.log(`⚠️ Column ${field.name} already exists, skipping`);
      }
    }

    // Create OTP verification attempts table for rate limiting
    console.log('\n📝 Creating OTP verification attempts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'otp_attempts')
      BEGIN
        CREATE TABLE otp_attempts (
          id INT IDENTITY(1,1) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          attempt_count INT DEFAULT 1,
          last_attempt_at DATETIME2 DEFAULT GETDATE(),
          blocked_until DATETIME2 NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          INDEX idx_email_attempts (email, last_attempt_at)
        );
        PRINT 'OTP attempts table created';
      END
      ELSE
      BEGIN
        PRINT 'OTP attempts table already exists';
      END
    `);

    console.log('\n🔍 Checking final table structure...');
    const finalStructure = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📊 Final users table structure:');
    finalStructure.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_DEFAULT || ''}`);
    });

    console.log('\n✅ Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  addOTPFields()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addOTPFields };
