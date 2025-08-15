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

async function addAdminCodeColumn() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');

    // Add admin_code_used column to users table
    const addColumnQuery = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_code_used'
      )
      BEGIN
        ALTER TABLE users ADD admin_code_used NVARCHAR(50) NULL;
        PRINT 'Column admin_code_used added to users table';
      END
      ELSE
      BEGIN
        PRINT 'Column admin_code_used already exists';
      END
    `;

    await pool.request().query(addColumnQuery);
    console.log('✅ admin_code_used column added to users table (if not exists)');

  } catch (error) {
    console.error('❌ Error adding admin code column:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the script
addAdminCodeColumn();
