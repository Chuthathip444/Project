const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

(async () => {
  try {
    pool = mysql.createPool({
      host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', 
      user: 'jthBBZwkYtCL4RN.root', 
      password: 'MJPgExL9zgd1mfsL',
      database: 'mydb', 
      port: 4000, 
      ssl: {
        rejectUnauthorized: true, 
      },
    });

    console.log('✅Connected database');
  } catch (error) {
    console.error('❌Failed ', error.message);
    process.exit(1); 
  }
})();

module.exports = pool;