var express = require('express');
var cors = require('cors');
const pool = require('./config/db');
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
const bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
const secret = 'login';
const multer = require('multer');
const moment = require('moment-timezone');
require('dotenv').config();

app.use(cors());

// register ทำไว้เพื่อข้อมูล admin คนใหม่เข้าระบบ
app.post('/register', jsonParser, async function (req, res, next) {
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

// login for admin
app.post('/login', jsonParser, async function (req, res, next) {
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

// ยืนยันตัวตน admin ด้วย token
app.post('/authen', jsonParser, function (req, res, next) {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, secret);
    res.json({ status: 'ok', decoded });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// ดูข้อมูลในตาราง admin ทั้งหมด
app.get('/Alladmin', async function (req, res, next) {
  try {
    const [results] = await pool.execute('SELECT id, email, fname, lname FROM admin');
    res.json({ status: 'ok', AllAdmin: results });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Delete (Remove admin)
app.delete('/admin/:id', async function (req, res, next) {
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

// การจัดการไฟล์ภาพ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './public/image');
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// post งานวิจัยใหม่
app.post('/research', upload.array('files', 10), async (req, res) => {
  const name = req.body.name;
  const title = req.body.title;
  const images = req.files.map((file) => file.filename); // เก็บชื่อไฟล์ทั้งหมดใน array
  const currentTime = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

  try {
    const [results] = await pool.execute(
      'INSERT INTO newresearch (name, title, image, time) VALUES (?, ?, ?, ?)',
      [name, title, JSON.stringify(images), currentTime]
    );
    res.json({
      status: 'ok',
      message: 'Research added successfully',
      researchId: results.insertId,
      uploadedFiles: images,
      time: currentTime,
    });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Read all research
app.get('/Allresearch', async function (req, res, next) {
    try {
      const [results] = await pool.execute(
        'SELECT id, name, title, image, time FROM newresearch'
      );
      res.json({ status: 'ok', AllResearch: results });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  });
  
// Read (Get research by ID)
app.get('/research/:id', async function (req, res, next) {
    try {
      const [results] = await pool.execute(
        'SELECT * FROM newresearch WHERE id=?',
        [req.params.id]
      );
      if (results.length === 0) {
        res.json({ status: 'error', message: 'Research not found' });
        return;
      }
      res.json({ status: 'ok', research: results[0] });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  });
  
// Update (Edit research)
app.put('/research/:id', upload.array('files', 10), async function (req, res, next) {
    const name = req.body.name || null;
    const title = req.body.title || null;
  
    // จัดการรูปภาพ
    let images = '';
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.filename).join(','); // รวมชื่อไฟล์
    } else {
      images = req.body.image || null; // ใช้รูปภาพเดิมหรือ null ถ้าไม่มีค่า
    }
  
    // ตรวจสอบข้อมูลก่อนดำเนินการ SQL
    if (!name || !title || !req.params.id) {
      return res.status(400).json({ status: 'error', message: 'Name, title, and ID are required' });
    }
  
    try {
      await pool.execute(
        'UPDATE newresearch SET name=?, title=?, image=? WHERE id=?',
        [name, title, images, req.params.id]
      );
      res.json({ status: 'ok', message: 'Research updated successfully' });
    } catch (err) {
      console.error(err); // แสดงข้อผิดพลาดใน console
      res.status(500).json({ status: 'error', message: 'Database error' });
    }
  });
  
// Delete (Remove research)
app.delete('/research/:id', async function (req, res, next) {
    try {
      await pool.execute(
        'DELETE FROM newresearch WHERE id=?',
        [req.params.id]
      );
      res.json({ status: 'ok', message: 'Research deleted successfully' });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  });
  
const { createServer } = require('http');
const port = 3333;
const server = createServer(app); 
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});