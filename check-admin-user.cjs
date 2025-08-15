/**
 * Check database for admin users and create one if needed
 */

const sql = require('mssql');

// Azure SQL Database connection
const azureConfig = {
  user: 'testappuser',
  password: 'SecurePass123!',
  server: 'testappserver2024.database.windows.net',
  database: 'testappdb',
  options: {
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function checkAndCreateAdmin() {
  try {
    console.log('🔗 Connecting to database...');
    const pool = await sql.connect(azureConfig);
    console.log('✅ Connected to database');
    
    // Check for existing admin users
    console.log('\n🔍 Checking for admin users...');
    const result = await pool.request().query(`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE role = 'admin'
    `);
    
    console.log(`📋 Found ${result.recordset.length} admin users:`);
    result.recordset.forEach(user => {
      console.log(`   ${user.email} (${user.first_name} ${user.last_name})`);
    });
    
    if (result.recordset.length === 0) {
      console.log('\n⚠️ No admin users found. Creating default admin...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.request()
        .input('email', sql.NVarChar(255), 'admin@example.com')
        .input('password', sql.NVarChar(255), hashedPassword)
        .input('firstName', sql.NVarChar(100), 'Admin')
        .input('lastName', sql.NVarChar(100), 'User')
        .input('role', sql.NVarChar(20), 'admin')
        .query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role, created_at)
          VALUES (@email, @password, @firstName, @lastName, @role, GETDATE())
        `);
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: admin123');
    }
    
    // Check for existing exams
    console.log('\n📚 Checking for existing exams...');
    const examResult = await pool.request().query(`
      SELECT id, title, subject, status, is_published, total_questions
      FROM exams
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 Found ${examResult.recordset.length} exams:`);
    examResult.recordset.forEach(exam => {
      console.log(`   [${exam.id}] ${exam.title} (${exam.subject}) - ${exam.status} - Questions: ${exam.total_questions}`);
    });
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndCreateAdmin();
