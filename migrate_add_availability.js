require('dotenv').config();
const mysql = require('mysql2/promise');

async function addAvailabilityTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`Connected to database: ${process.env.DB_NAME}`);

    // Create official_availability table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS official_availability (
        id INT AUTO_INCREMENT PRIMARY KEY,
        official_id INT NOT NULL,
        day_of_week ENUM('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (official_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_official_day (official_id, day_of_week)
      )
    `);
    console.log('Official availability table created or already exists');

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

addAvailabilityTable();
