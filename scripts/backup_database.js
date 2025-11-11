require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  let connection;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`Connected to database: ${process.env.DB_NAME}`);
    console.log('Creating backup...');

    let sqlDump = `-- Database Backup\n-- Date: ${new Date().toISOString()}\n-- Database: ${process.env.DB_NAME}\n\n`;

    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    for (const tableName of tableNames) {
      console.log(`  Backing up table: ${tableName}`);
      
      // Get CREATE TABLE statement
      const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
      sqlDump += `\n-- Table: ${tableName}\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += createTable[0]['Create Table'] + ';\n\n';

      // Get table data
      const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
      
      if (rows.length > 0) {
        sqlDump += `-- Data for table: ${tableName}\n`;
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return val;
          });
          sqlDump += `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += '\n';
      }
    }

    // Write to file
    fs.writeFileSync(backupFile, sqlDump);
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup file: ${backupFile}`);
    console.log(`📊 Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

backupDatabase();
