const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const verifyToken = require('../Middleware/verifyToken');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const saltRounds = 10;
const secret = 'login';

// Register พร้อมสร้าง Token และเก็บในฐานข้อมูล
router.post('/register',verifyToken, jsonParser, async function (req, res) {
  try {
    const [userExists] = await pool.execute('SELECT * FROM admin WHERE email=?', [req.body.email]);
    if (userExists.length > 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Email ซ้ำ' });
    }
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    const token = jwt.sign({ email: req.body.email }, secret);
    await pool.execute(
      'INSERT INTO admin(email, password, fname, lname, token) VALUES (?, ?, ?, ?, ?)',
      [req.body.email, hash, req.body.fname, req.body.lname, token]
    );
    res.json({ status: 'ok', message: 'Admin register successfully', token });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// Login ใช้ Token เดิมที่สร้างไว้ตอน Register
router.post('/login', async function (req, res) {
  try {
    const [user] = await pool.execute('SELECT * FROM admin WHERE email=?', [req.body.email]);
    if (user.length === 0) {
      return res.status(401).json({ status: 'error', message: 'No user found' });
    }

    const isLogin = await bcrypt.compare(req.body.password, user[0].password);
    if (!isLogin) {
      return res.status(401).json({ status: 'error', message: 'Login failed' });
    }

    // ตรวจสอบว่า Token ไม่เป็น NULL หรือ ""
    if (!user[0].token || user[0].token.trim() === "") {
      return res.status(401).json({ 
        status: 'error', 
        message: 'ไม่มี token เป็น NULL หรือ "", please register again' });
    }
    res.json({ 
      status: 'ok', 
      message: 'Login success', 
      token: user[0].token,
      fname: user[0].fname,
      lname: user[0].lname });
      //admin: {fname: user[0].fname ,lname: user[0].lname}
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ตรวจสอบ Token ก่อนเข้าถึง API อื่นๆ
router.post('/authen',verifyToken, jsonParser, function (req, res) {
  res.json({ status: 'ok', decoded: req.admin });
});

// ข้อมูลแอดมินทั้งหมด 
router.get('/Alladmin',verifyToken, async function (req, res) {
  try {
    const [results] = await pool.execute('SELECT id, email, fname, lname FROM admin');
    res.json({ status: 'ok', AllAdmin: results });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงข้อมูลแอดมินตาม ID 
router.get('/:id',verifyToken, async function (req, res) {
  try {
    const [results] = await pool.execute('SELECT id, email, fname, lname FROM admin WHERE id=?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Admin not found' });
    }
    res.json({ status: 'ok', admin: results[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


//ลบข้อมูล admin
router.delete('/delete/:id',verifyToken, async function (req, res) {
  try {
    await pool.execute('DELETE FROM admin WHERE id=?', [req.params.id]);
    res.json({ status: 'ok', message: 'Admin delete successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});




// router.delete('/delete/:id', async function (req, res) {
//   try {
//     await pool.execute(
//       'DELETE FROM admin WHERE id=?',
//       [req.params.id]
//     );
//     res.json({ status: 'ok', message: 'Admin delete successfully' });
//   } catch (err) {
//     res.json({ status: 'error', message: err.message });
//   }
// });



module.exports = router;
