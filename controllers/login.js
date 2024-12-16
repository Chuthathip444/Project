const express = require('express'); 
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const secret = 'login';
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const saltRounds = 10; 

// router.get('/', (req, res) => {
//   res.send('หน้า Login');
// });

// Register: เพิ่มข้อมูล admin ใหม่
router.post('/register', jsonParser, async function (req, res) {
  try {
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    const [results] = await pool.execute(
      'INSERT INTO admin(email, password, fname, lname) VALUES (?, ?, ?, ?)',
      [req.body.email, hash, req.body.fname, req.body.lname]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Login: สำหรับ admin
router.post('/', jsonParser, async function (req, res) {
  try {
    const [user] = await pool.execute('SELECT * FROM admin WHERE email=?', [req.body.email]);
    if (user.length === 0) {
      res.json({ status: 'error', message: 'no user found' });
      return;
    }

    const isLogin = await bcrypt.compare(req.body.password, user[0].password);
    if (isLogin) {
      const token = jwt.sign({ email: user[0].email }, secret, { expiresIn: '1h' });
      res.json({ status: 'ok', message: 'login success', token });
    } else {
      res.json({ status: 'error', message: 'login failed' });
    }
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Authentication: ตรวจสอบ token
router.post('/authen', jsonParser, function (req, res) {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, secret);
    res.json({ status: 'ok', decoded });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Get All Admins: ดูข้อมูล admin ทั้งหมด
router.get('/Alladmin', async function (req, res) {
  try {
    const [results] = await pool.execute('SELECT id, email, fname, lname FROM admin');
    res.json({ status: 'ok', AllAdmin: results });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Read admin by ID
router.get('/admin/:id', async function (req, res, next) {
  try {
    const [results] = await pool.execute(
      'SELECT * FROM admin WHERE id=?',
      [req.params.id]
    );
    if (results.length === 0) {
      res.json({ status: 'error', message: 'Admin not found' });
      return;
    }
    res.json({ status: 'ok', research: results[0] });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Delete Admin: ลบข้อมูล admin
router.delete('/admin/:id', async function (req, res) {
  try {
    await pool.execute(
      'DELETE FROM admin WHERE id=?',
      [req.params.id]
    );
    res.json({ status: 'ok', message: 'Admin deleted successfully' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

module.exports = router;
