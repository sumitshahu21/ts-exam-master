const sql = require('mssql');

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

async function executeCommand(pool, description, command) {
  try {
    console.log(`🔧 ${description}...`);
    const result = await pool.request().query(command);
    console.log(`✅ ${description} completed successfully`);
    return result;
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.message}`);
    return null;
  }
}

async function fixConstraint() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to database\n');
    
    // Step 1: Check current constraints
    const checkResult = await executeCommand(pool, 'Checking current constraints', `
      SELECT fk.name AS constraint_name, OBJECT_NAME(fk.referenced_object_id) AS referenced_table
      FROM sys.foreign_keys fk
      WHERE OBJECT_NAME(fk.parent_object_id) = 'results'
    `);
    
    if (checkResult && checkResult.recordset.length > 0) {
      console.log('Current constraints:');
      checkResult.recordset.forEach(row => {
        console.log(`  - ${row.constraint_name} -> ${row.referenced_table}`);
      });
    } else {
      console.log('No constraints found on results table');
    }
    console.log('');
    
    // Step 2: Drop bad constraints
    const badConstraints = checkResult?.recordset.filter(row => 
      row.referenced_table === 'test_attempts' || 
      row.constraint_name.includes('634EBE90')
    ) || [];
    
    for (const constraint of badConstraints) {
      await executeCommand(pool, `Dropping constraint ${constraint.constraint_name}`, 
        `ALTER TABLE results DROP CONSTRAINT [${constraint.constraint_name}]`
      );
    }
    
    // Step 3: Clean orphaned records
    await executeCommand(pool, 'Cleaning orphaned records', 
      `DELETE FROM results WHERE attempt_id NOT IN (SELECT id FROM testAttempt)`
    );
    
    // Step 4: Create new constraint
    await executeCommand(pool, 'Creating new foreign key constraint', 
      `ALTER TABLE results ADD CONSTRAINT FK_results_testAttempt FOREIGN KEY (attempt_id) REFERENCES testAttempt(id)`
    );
    
    // Step 5: Verify
    const verifyResult = await executeCommand(pool, 'Verifying new constraint', `
      SELECT fk.name AS constraint_name, OBJECT_NAME(fk.referenced_object_id) AS referenced_table
      FROM sys.foreign_keys fk
      WHERE OBJECT_NAME(fk.parent_object_id) = 'results'
    `);
    
    if (verifyResult && verifyResult.recordset.length > 0) {
      console.log('\n✅ Final constraints:');
      verifyResult.recordset.forEach(row => {
        console.log(`  - ${row.constraint_name} -> ${row.referenced_table}`);
      });
    }
    
    console.log('\n🎉 Foreign key constraint fix completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

fixConstraint();
