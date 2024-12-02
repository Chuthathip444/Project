const mysql = require('mysql2');
require('dotenv').config(); 

const connection = mysql.createConnection(process.env.DATABASE_URL);

// ตรวจสอบการเชื่อมต่อ
connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

module.exports = connection;
