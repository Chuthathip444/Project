var express = require('express');
var cors = require('cors');
const multer = require('multer');
const moment = require('moment-timezone');
const router = express.Router();
const pool = require('../Config/db');
require('dotenv').config();


// เก็บไฟล์ ภาพ
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      return cb(null, './public/news');
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}_${file.originalname}`);
    },
  });
const upload = multer({ storage });

//เพิ่มกิจกรรม ประกาศต่างๆ
router.post('/new', upload.fields([
    { name: 'images', maxCount: 10 },  // สำหรับไฟล์ภาพ
    { name: 'files', maxCount: 10 }    // สำหรับไฟล์อื่นๆ
]), async (req, res) => {
    const topic = req.body.topic;
    const detail = req.body.detail;
    const admin = req.body.admin;
    const images = req.files.images ? req.files.images.map((file) => file.filename) : [];
    const files = req.files.files ? req.files.files.map((file) => file.filename) : [];
    const currentTime = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');
    try {
        const [results] = await pool.execute(
            'INSERT INTO activity (topic, detail, image, files, admin, time) VALUES (?, ?, ?, ?, ?, ?)',
            [
                topic,
                detail,
                JSON.stringify(images), // เก็บไฟล์ภาพ
                JSON.stringify(files),   // เก็บไฟล์อื่นๆ
                admin,
                currentTime
            ]
        );
        res.json({
            status: 'ok',
            message: 'Activity added successfully',
            activityId: results.insertId,
            uploadedImages: images,
            uploadedFiles: files,
            time: currentTime,
        });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});


//ดูข้อมูลกิจกรรมทั้งหมด
router.get('/', async function (req, res, next) {
    try {
        const [results] = await pool.execute(
            'SELECT id, topic, detail, image, files, admin, time FROM activity'
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