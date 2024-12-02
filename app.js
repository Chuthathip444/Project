var express = require('express')
var cors = require('cors')
//const mysql = require('mysql2');
var app = express()
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
const bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
const secret = 'login'
const multer = require('multer');
const moment = require('moment-timezone');
require('dotenv').config()
const connection = require('./config/db'); // เรียกใช้การเชื่อมต่อจากconfig/db.js

const corsConfig = {
    origin: '*',
    credential: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  };
app.options('*', cors(corsConfig));
app.use(cors(corsConfig));
//app.use(cors())

// register ทำไว้เพื่อข้อมูล admin คนใหม่เข้าระบบ
app.post('/register', jsonParser, function (req, res, next) {
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        connection.execute(
            'INSERT INTO admin(email, password, fname, lname) VALUES (?,?,?,?)',
            [req.body.email, hash, req.body.fname, req.body.lname],
            function(err, results, fields){
                if(err){
                    res.json({status:'error',message: err})
                    return
                }
                res.json({status: 'ok'})
            }
        )
    });
})

// login for admin มีข้อมูลในฐาน
app.post('/login', jsonParser, function (req, res, next) {
    connection.execute(
        'SELECT * FROM admin WHERE email=?',
        [req.body.email],
        function (err, user, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            if (user.length === 0) {
                res.json({ status: 'error', message: 'no user found' });
                return;
            }

            bcrypt.compare(req.body.password, user[0].password, function (err, isLogin) {
                if (err) {
                    res.json({ status: 'error', message: err });
                    return;
                }
                if (isLogin) {
                    var token = jwt.sign({ email: user[0].email }, secret, { expiresIn: '1h' }); 
                    res.json({ status: 'ok', message: 'login success', token });
                } else {
                    res.json({ status: 'error', message: 'login failed' });
                }
            });
        }
    );
});

// ยืนยันตัวตน admin ด้วย token
app.post('/authen', jsonParser, function (req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1]
        var decoded = jwt.verify(token, secret);
        res.json({ status: 'ok', decoded })
    } catch (err) {
        res.json({ status: 'error', message: err.message })
    }
})

// ดูข้อมูลในตาราง admin ทั้งหมด
app.get('/Alladmin', function (req, res, next) {
    connection.query(
        'SELECT id, email, fname, lname FROM admin', 
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err }); 
                return;
            }
            res.json({ status: 'ok', AllAdmin: results }); 
        }
    );
});

// ฐานข้อมูล newresearch สำหรับการอัพเดตวิจัยใหม่
// เก็บ image
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      return cb(null, "./public/image")
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}_${file.originalname}`)
    }
})
const upload = multer({storage})

// Create (Add new research)
app.post('/research', upload.array('files', 10), (req, res) => {
    const name = req.body.name;
    const title = req.body.title;
    const images = req.files.map(file => file.filename); // เก็บชื่อไฟล์ทั้งหมดใน array
    const currentTime = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

    connection.execute(
        'INSERT INTO newresearch (name, title, image, time) VALUES (?, ?, ?, ?)', 
        [name, title, JSON.stringify(images), currentTime], 
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            res.json({ 
                status: 'ok', 
                message: 'Research added successfully', 
                reserchId: results.insertId, 
                uploadedFiles: images,
                time: currentTime
            });
        }
    );
});

// Read (Get all research)
app.get('/Allresearch', function (req, res, next) {
    connection.query(
        'SELECT id, name, title, image, time FROM newresearch',
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            res.json({ status: 'ok', Allreserch: results });
        }
    );
});


// Read (Get research by ID)
app.get('/research/:id', function (req, res, next) {
    connection.execute(
        'SELECT * FROM newresearch WHERE id=?',
        [req.params.id],
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            if (results.length === 0) {
                res.json({ status: 'error', message: 'Research not found' });
                return;
            }
            res.json({ status: 'ok', reserch: results[0] });
        }
    );
});

// Update (Edit research)
app.put('/research/:id', upload.array('files', 10), function (req, res, next) {
    const name = req.body.name || null; // ใช้ค่า null ถ้าไม่มีค่า
    const title = req.body.title || null;

    // จัดการรูปภาพ
    let images = '';
    if (req.files && req.files.length > 0) {
        images = req.files.map(file => file.filename).join(','); // รวมชื่อไฟล์
    } else {
        images = req.body.image; // ใช้รูปภาพเดิมหรือ null ถ้าไม่มีค่า
    }

    // ตรวจสอบข้อมูลก่อนดำเนินการ SQL
    if (!name || !title || !req.params.id) {
        return res.status(400).json({ status: 'error', message: 'Name, title, and ID are required' });
    }

    connection.execute(
        'UPDATE newresearch SET name=?, title=?, image=? WHERE id=?',
        [name, title, images, req.params.id],
        function (err, results, fields) {
            if (err) {
                console.error(err); // แสดงข้อผิดพลาดใน console
                return res.status(500).json({ status: 'error', message: 'Database error' });
            }
            res.json({ status: 'ok', message: 'Research updated successfully' });
        }
    );
});


// Delete (Remove research)
app.delete('/research/:id', function (req, res, next) {
    connection.execute(
        'DELETE FROM newresearch WHERE id=?',
        [req.params.id],
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            res.json({ status: 'ok', message: 'Research deleted successfully' });
        }
    );
});

const { createServer } = require('http');
const port = 3333;
const server = createServer(app);  // สร้าง HTTP server จาก app
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});