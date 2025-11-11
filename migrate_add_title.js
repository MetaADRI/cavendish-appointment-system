require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateAddTitle() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database');

    // Check if title column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'title'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('Title column already exists - no migration needed');
    } else {
      // Add title column after student_number
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN title VARCHAR(255) AFTER student_number
      `);
      console.log('✓ Added title column to users table');

      // Update existing official with title
      await connection.execute(`
        UPDATE users 
        SET title = 'Dean of Students' 
        WHERE email = 'dean@cavendish.edu.zm' AND role = 'official'
      `);
      console.log('✓ Updated existing official with title');
    }

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateAddTitle();
