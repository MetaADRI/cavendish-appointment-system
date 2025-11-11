require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
  let initialConnection;
  let connection;
  
  try {
    // First connection - without database
    initialConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Database ${process.env.DB_NAME} created or already exists`);

    // Close initial connection
    await initialConnection.end();

    // Create new connection with the database specified
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`Connected to database: ${process.env.DB_NAME}`);

    // Create users table with student_number field
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        student_number VARCHAR(50) UNIQUE,
        title VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student','admin','official') NOT NULL,
        status ENUM('pending','active','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_number (student_number)
      )
    `);
    console.log('Users table created or already exists');

    // Create appointments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_code VARCHAR(50) UNIQUE NOT NULL,
        student_id INT NOT NULL,
        official_id INT NOT NULL,
        purpose TEXT NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        mode ENUM('Virtual','Physical') NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (official_id) REFERENCES users(id)
      )
    `);
    console.log('Appointments table created or already exists');

    // Seed admin user
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    await connection.execute(
      'INSERT IGNORE INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['System Admin', 'admin@cavendish.edu.zm', adminPasswordHash, 'admin', 'active']
    );
    console.log('Admin user seeded');

    // Seed official user with title
    const officialPasswordHash = await bcrypt.hash('Dean123!', 10);
    await connection.execute(
      'INSERT IGNORE INTO users (full_name, email, title, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['Precious Mate', 'dean@cavendish.edu.zm', 'Dean of Students', officialPasswordHash, 'official', 'active']
    );
    console.log('Official user seeded');

    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();