var express = require('express');
var cors = require('cors');
const multer = require('multer');
const moment = require('moment-timezone');
const router = express.Router();
const pool = require('../config/db');
require('dotenv').config();

router.get('/', (req, res) => {
    res.send('หน้าโพสกิจกรรม ประกาศต่างๆ');
  });

// เก็บไฟล์ภาพ
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      return cb(null, './public/image');
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}_${file.originalname}`);
    },
  });
const upload = multer({ storage });

//เพิ่มกิจกรรม ประกาศต่างๆ
router.post('/new', upload.array('files', 10), async (req, res) => {
    const topic = req.body.topic;
    const detail = req.body.detail;
    const admin = req.body.admin;
    const images = req.files.map((file) => file.filename); // เก็บชื่อไฟล์ทั้งหมดใน array
    const currentTime = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss'); 

    try {
        const [results] = await pool.execute(
            'INSERT INTO activity (topic, detail, image, admin, time) VALUES (?, ?, ?, ?, ?)',
            [topic, detail, JSON.stringify(images), admin, currentTime]
        );
        res.json({
            status: 'ok',
            message: 'Activity added successfully',
            activityId: results.insertId,
            uploadedFiles: images,
            time: currentTime,
        });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});

//ดูข้อมูลกิจกรรมทั้งหมด
router.get('/all', async function (req, res, next) {
    try {
        const [results] = await pool.execute(
            'SELECT id, topic, detail, image, admin, time FROM activity'
        );
        res.json({ status: 'ok', allActivities: results });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});

//ดูข้อมูลกิจกรรมหนึ่งโพส ตาม id
router.get('/:id', async function (req, res, next) {
    try {
        const [results] = await pool.execute(
            'SELECT * FROM activity WHERE id = ?',
            [req.params.id]
        );
        if (results.length === 0) {
            res.json({ status: 'error', message: 'Activity not found' });
            return;
        }
        res.json({ status: 'ok', activity: results[0] });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});

//ลบข้อมูลกิจกรรม id นั้น
router.delete('/:id', async function (req, res, next) {
    try {
        const [results] = await pool.execute(
            'DELETE FROM activity WHERE id = ?',
            [req.params.id]
        );
        res.json({ status: 'ok', message: 'Activity deleted successfully' });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});


module.exports = router;