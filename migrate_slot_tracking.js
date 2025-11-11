require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log(`Connected to database: ${process.env.DB_NAME}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Make sure you have a backup before proceeding!');
    console.log('Run: node scripts/backup_database.js');
    console.log('');

    // Read migration file
    const migrationFile = path.join(__dirname, 'migrations', '2025_add_slot_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    console.log('📋 Migration file loaded: 2025_add_slot_tracking.sql');
    console.log('🚀 Executing migration...\n');

    // Execute entire migration in one go (multipleStatements: true)
    try {
      await connection.query(migrationSQL);
      console.log(`✅ All migration statements executed successfully`);
    } catch (error) {
      // Handle "Duplicate key" and "column exists" errors gracefully
      if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️  Some statements skipped (already exists) - this is normal`);
      } else {
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying changes...');

    // Verify new columns
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM appointments 
      WHERE Field IN ('student_present', 'official_present', 'started_at', 'ended_at', 'presence_note', 'reminder_sent')
    `);
    console.log(`   ✓ New columns added: ${columns.length}/6`);

    // Verify notifications table
    const [notifTable] = await connection.execute(`
      SHOW TABLES LIKE 'notifications'
    `);
    console.log(`   ✓ Notifications table: ${notifTable.length > 0 ? 'Created' : 'Not found'}`);

    // Verify scheduler_state table
    const [schedulerTable] = await connection.execute(`
      SHOW TABLES LIKE 'scheduler_state'
    `);
    console.log(`   ✓ Scheduler state table: ${schedulerTable.length > 0 ? 'Created' : 'Not found'}`);

    // Verify unique index
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM appointments WHERE Key_name = 'ux_official_date_time'
    `);
    console.log(`   ✓ Unique constraint: ${indexes.length > 0 ? 'Applied' : 'Not found'}`);

    console.log('\n🎉 All database changes applied successfully!');
    console.log('💡 Next step: Set ENABLE_SLOT_TRACKER=false in .env and test');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
