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

async function createAdminCodesTable() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');

    // Create admin_invite_codes table
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='admin_invite_codes' AND xtype='U')
      CREATE TABLE admin_invite_codes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code NVARCHAR(50) NOT NULL UNIQUE,
        is_used BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        used_at DATETIME2 NULL,
        used_by INT NULL,
        created_by INT NULL,
        FOREIGN KEY (used_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `;

    await pool.request().query(createTableQuery);
    console.log('✅ admin_invite_codes table created successfully');

    // Create an index for faster lookups
    const createIndexQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_admin_invite_codes_code')
      CREATE INDEX IX_admin_invite_codes_code ON admin_invite_codes (code);
    `;

    await pool.request().query(createIndexQuery);
    console.log('✅ Index created for admin_invite_codes.code');

    // Insert a sample admin code for testing
    const crypto = require('crypto');
    const sampleCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    const insertSampleCodeQuery = `
      INSERT INTO admin_invite_codes (code, created_by)
      VALUES (@code, NULL);
    `;

    await pool.request()
      .input('code', sql.NVarChar, sampleCode)
      .query(insertSampleCodeQuery);

    console.log(`✅ Sample admin code created: ${sampleCode}`);
    console.log('📝 Save this code - you will need it to create admin accounts!');

  } catch (error) {
    console.error('❌ Error creating admin codes table:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the script
createAdminCodesTable();
