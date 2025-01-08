var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
require('dotenv').config();

router.get('/', (req, res) => {
  res.send('Web Application for Research');
});

// API: นับจำนวนผู้เข้าชม
router.get('/track', async (req, res) => {
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    // ตรวจสอบว่า IP มีอยู่ในตารางแล้วหรือไม่
    const checkQuery = 'SELECT COUNT(*) AS count FROM visitors WHERE ip_address = ?';
    const [results] = await pool.query(checkQuery, [userIP]);

    const isNewVisitor = results[0].count === 0;
    if (isNewVisitor) {
      // บันทึก IP Address ลงในตาราง
      const insertQuery = 'INSERT INTO visitors (ip_address) VALUES (?)';
      await pool.query(insertQuery, [userIP]);
      res.json({ message: 'เพิ่มผู้เยี่ยมชมใหม่', ip: userIP });
    } else {
      res.json({ message: 'ผู้เยี่ยมชมนี้มีอยู่แล้ว', ip: userIP });
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});


// API: ดูจำนวนผู้เข้าชมทั้งหมด
router.get('/stats', async (req, res) => {
  const statsQuery = 'SELECT COUNT(*) AS uniqueVisitors FROM visitors';

  try {
    // ใช้คำสั่ง query แบบ Promise
    const [results] = await pool.query(statsQuery);
    res.json({ uniqueVisitors: results[0].uniqueVisitors });
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});



module.exports = router;