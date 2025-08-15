const sql = require('mssql');
const bcrypt = require('bcryptjs');

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

async function createTestUsers() {
  let pool;
  
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Check if users table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'users'
    `);

    if (tableCheck.recordset[0].count === 0) {
      console.log('❌ Users table does not exist');
      return;
    }

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin', 10);
    const studentPassword = await bcrypt.hash('student', 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    try {
      await pool.request()
        .input('email', sql.VarChar, 'admin@demo.com')
        .input('password_hash', sql.VarChar, adminPassword)
        .input('first_name', sql.VarChar, 'Demo')
        .input('last_name', sql.VarChar, 'Admin')
        .input('role', sql.VarChar, 'admin')
        .query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at)
          VALUES (@email, @password_hash, @first_name, @last_name, @role, 1, GETDATE())
        `);
      console.log('✅ Admin user created');
    } catch (error) {
      if (error.message.includes('duplicate')) {
        console.log('ℹ️ Admin user already exists');
      } else {
        console.error('❌ Error creating admin user:', error.message);
      }
    }

    // Create student user
    console.log('👤 Creating student user...');
    try {
      await pool.request()
        .input('email', sql.VarChar, 'student@demo.com')
        .input('password_hash', sql.VarChar, studentPassword)
        .input('first_name', sql.VarChar, 'Demo')
        .input('last_name', sql.VarChar, 'Student')
        .input('role', sql.VarChar, 'student')
        .query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at)
          VALUES (@email, @password_hash, @first_name, @last_name, @role, 1, GETDATE())
        `);
      console.log('✅ Student user created');
    } catch (error) {
      if (error.message.includes('duplicate')) {
        console.log('ℹ️ Student user already exists');
      } else {
        console.error('❌ Error creating student user:', error.message);
      }
    }

    // List all users
    console.log('\n📋 Current users in database:');
    const users = await pool.request().query('SELECT id, email, first_name, last_name, role, is_active FROM users');
    console.table(users.recordset);

    console.log('\n🎯 Test Credentials:');
    console.log('Admin: admin@demo.com / admin');
    console.log('Student: student@demo.com / student');

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

createTestUsers();
