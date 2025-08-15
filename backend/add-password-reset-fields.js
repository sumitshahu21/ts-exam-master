const sql = require('mssql');

const config = {
  server: 'ntms-sql-server.database.windows.net',
  port:1433,
  database:'exam_db',
  user: 'ntms',
  password: 'Dev@2024Test!',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function addPasswordResetFields() {
  try {
    console.log('🔄 Adding password reset fields to users table...');
    
    const pool = await sql.connect(config);
    
    // Add password reset fields to users table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_password_otp')
      BEGIN
        ALTER TABLE users ADD reset_password_otp VARCHAR(6);
      END
    `);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_password_expires')
      BEGIN
        ALTER TABLE users ADD reset_password_expires DATETIME2;
      END
    `);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_attempts')
      BEGIN
        ALTER TABLE users ADD password_reset_attempts INT DEFAULT 0;
      END
    `);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'last_password_reset_attempt')
      BEGIN
        ALTER TABLE users ADD last_password_reset_attempt DATETIME2;
      END
    `);

    console.log('✅ Password reset fields added successfully');
    
    await pool.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding password reset fields:', error);
    process.exit(1);
  }
}

addPasswordResetFields();
