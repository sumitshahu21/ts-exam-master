const sql = require('mssql');
const crypto = require('crypto');

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

// Generate a secure admin invite code
function generateAdminCode() {
  // Generate 16-character code with mixed case, numbers, and symbols
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  let code = '';
  
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

async function createAdminCode(createdById = null) {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');

    // Generate new admin code
    const code = generateAdminCode();
    
    const insertQuery = `
      INSERT INTO admin_invite_codes (code, created_by)
      VALUES (@code, @createdBy);
    `;

    await pool.request()
      .input('code', sql.NVarChar, code)
      .input('createdBy', sql.Int, createdById)
      .query(insertQuery);

    console.log('✅ New admin invite code created successfully!');
    console.log('🔑 Admin Code:', code);
    console.log('📝 Save this code securely - it can only be used once!');
    
    return code;

  } catch (error) {
    console.error('❌ Error creating admin code:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔐 Database connection closed');
    }
  }
}

// Function to list all admin codes
async function listAdminCodes() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');

    const query = `
      SELECT 
        ac.id,
        ac.code,
        ac.is_used,
        ac.created_at,
        ac.used_at,
        u.email as used_by_email,
        creator.email as created_by_email
      FROM admin_invite_codes ac
      LEFT JOIN users u ON ac.used_by = u.id
      LEFT JOIN users creator ON ac.created_by = creator.id
      ORDER BY ac.created_at DESC;
    `;

    const result = await pool.request().query(query);
    
    console.log('\n📋 Admin Invite Codes:');
    console.log('==========================================');
    
    if (result.recordset.length === 0) {
      console.log('No admin codes found.');
    } else {
      result.recordset.forEach((code, index) => {
        console.log(`${index + 1}. Code: ${code.code}`);
        console.log(`   Status: ${code.is_used ? '❌ Used' : '✅ Available'}`);
        console.log(`   Created: ${code.created_at}`);
        if (code.is_used) {
          console.log(`   Used by: ${code.used_by_email || 'Unknown'}`);
          console.log(`   Used at: ${code.used_at}`);
        }
        console.log(`   Created by: ${code.created_by_email || 'System'}`);
        console.log('------------------------------------------');
      });
    }

  } catch (error) {
    console.error('❌ Error listing admin codes:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔐 Database connection closed');
    }
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'create':
    createAdminCode();
    break;
  case 'list':
    listAdminCodes();
    break;
  default:
    console.log('Usage:');
    console.log('  node generate-admin-code.js create  - Create a new admin invite code');
    console.log('  node generate-admin-code.js list    - List all admin invite codes');
    break;
}

module.exports = { createAdminCode, listAdminCodes, generateAdminCode };
