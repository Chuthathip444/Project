var express = require('express')
var cors = require('cors')
const mysql = require('mysql2');
var app = express()
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
const bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
const secret = 'login'
const multer = require('multer');
require('dotenv').config()

app.use(cors())

// เชื่อมต่อฐานข้อมูล mydb มีหลายตารางในฐานข้อมูล
const connection = mysql.createConnection(process.env.DATABASE_URL)

//const connection = mysql.createConnection({
    //host: 'localhost',
    //user: 'root',
    //database: 'mydb',
//});


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

// ฐานข้อมูล newreserch สำหรับการอัพเดตวิจัยใหม่

// Create (Add new reserch)
app.post('/reserch', upload.array('files', 10), (req, res) => {
    const name = req.body.name;
    const title = req.body.title;
    const images = req.files.map(file => file.filename); // เก็บชื่อไฟล์ทั้งหมดใน array
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' '); 
    // เวลาปัจจุบันในรูปแบบฐานข้อมูล MySQL

    connection.execute(
        'INSERT INTO newreserch (name, title, image) VALUES (?, ?, ?)',
        [name, title, JSON.stringify(images)], // เก็บ array ของชื่อไฟล์เป็น JSON string ในฐานข้อมูล
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


// Read (Get all reserch)
app.get('/Allreserch', function (req, res, next) {
    connection.query(
        'SELECT id, name, title, image, time FROM newreserch',
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            res.json({ status: 'ok', Allreserch: results });
        }
    );
});


// Read (Get reserch by ID)
app.get('/reserch/:id', function (req, res, next) {
    connection.execute(
        'SELECT * FROM newreserch WHERE id=?',
        [req.params.id],
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            if (results.length === 0) {
                res.json({ status: 'error', message: 'Reserch not found' });
                return;
            }
            res.json({ status: 'ok', reserch: results[0] });
        }
    );
});

// Update (Edit reserch)
app.put('/reserch/:id', upload.array('files', 10), function (req, res, next) {
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
        'UPDATE newreserch SET name=?, title=?, image=? WHERE id=?',
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


// Delete (Remove reserch)
app.delete('/reserch/:id', function (req, res, next) {
    connection.execute(
        'DELETE FROM newreserch WHERE id=?',
        [req.params.id],
        function (err, results, fields) {
            if (err) {
                res.json({ status: 'error', message: err });
                return;
            }
            res.json({ status: 'ok', message: 'Reserch deleted successfully' });
        }
    );
});

// run port 3333
app.listen(3333, function () {
    console.log('CORS-enabled web server listening on port 3333')
})
