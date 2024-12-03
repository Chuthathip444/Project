var express = require('express');
var cors = require('cors');
const multer = require('multer');
const moment = require('moment-timezone');
const router = express.Router();
const pool = require('../config/db');
require('dotenv').config();

router.get('/', (req, res) => {
    res.send('หน้าโพสข้อมูลใหม่');
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
router.post('/research', upload.array('files', 10), async (req, res) => {
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
router.get('/Allresearch', async function (req, res, next) {
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
router.get('/research/:id', async function (req, res, next) {
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
router.put('/research/:id', upload.array('files', 10), async function (req, res, next) {
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
router.delete('/research/:id', async function (req, res, next) {
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

module.exports = router;