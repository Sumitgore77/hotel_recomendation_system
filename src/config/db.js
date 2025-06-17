<<<<<<< Updated upstream
const mysql = require('mysql2');
const conn = mysql.createConnection({
=======
const mysql = require('mysql2/promise');

const conn = mysql.createPool({
>>>>>>> Stashed changes
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

<<<<<<< Updated upstream
conn.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database.');
});
=======
conn.getConnection()
  .then(() => console.log('✅ Connected to the database via pool.'))
  .catch((err) => console.error('❌ Connection failed:', err.message));
>>>>>>> Stashed changes

module.exports = conn;
