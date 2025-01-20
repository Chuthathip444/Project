var express = require('express');
var cors = require('cors');
const router = express.Router();
const pool = require('../config/db');
const { uploadNews,deleteS3 ,CurrentTime  } = require ('../Middleware/upload'); 
require('dotenv').config();
const fs = require('fs');
const path = require('path');


// ตั้งค่า static directory สำหรับการเข้าถึงไฟล์ในโฟลเดอร์ public
router.use('/public', express.static(path.join(__dirname, '..', 'public')));



//เพิ่มกิจกรรม ประกาศต่างๆ
router.post('/new', uploadNews.fields([
    { name: 'image', maxCount: 10 },  
    { name: 'files', maxCount: 10 },  
]), async (req, res) => {
    try {
        const topic = req.body.topic;
        const detail = req.body.detail;
        const admin = req.body.admin;
        const currentTime = CurrentTime();

        // ดึง URL ของไฟล์จาก S3
        const imageUrls = req.files.image ? req.files.image.map((file) => file.location || file.url) : [];
        const fileUrls = req.files.files ? req.files.files.map((file) => file.location || file.url) : [];
  
        const [results] = await pool.execute(
            'INSERT INTO activity (topic, detail, image, files, admin) VALUES (?, ?, ?, ?, ?)',
            [
                topic,
                detail,
                JSON.stringify(imageUrls),  
                JSON.stringify(fileUrls),    
                admin,
            ]
        );
        res.json({
            status: 'ok',
            message: 'Activity add success',
            activityId: results.insertId,
            time: currentTime,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});


//ดูข้อมูลกิจกรรมทั้งหมด
router.get('/', async (req, res) => {
    try {
      const [results] = await pool.execute(
        `SELECT id, topic, detail, image, files, admin, time FROM activity`
      );
  
      if (results.length > 0) {
        const data = results.map(result => {
          let images = [];
          let files = [];
  
          try {
            images = JSON.parse(result.image || '[]');
          } catch (e) {
            images = result.image ? result.image.split(',') : [];
          }
  
          try {
            files = JSON.parse(result.files || '[]');
          } catch (e) {
            files = result.files ? result.files.split(',') : [];
          }
  
          // แปลงเป็น URL ของไฟล์ใน S3
          const imageUrl = images.map(image => `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${image.trim()}`);
          const filesUrl = files.map(file => `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.trim()}`);
          return {
            ...result,
          };
        });
        res.json({
          status: 'ok',
          data: data,
        });
      } else {
        res.status(404).json({
          status: 'error',
          message: 'No data found',
        });
      }
    } catch (err) {
      res.json({
        status: 'error',
        message: err.message,
      });
    }
});


//ดูข้อมูลกิจกรรมหนึ่งโพส ตาม id
router.get('/:id', async function (req, res, next) {
    try {
      const [results] = await pool.execute(
        `SELECT id, topic, detail, image, files, admin, time
         FROM activity
         WHERE id = ?`,
        [req.params.id]
      );
  
      if (results.length > 0) {
        const result = results[0];
        const images = JSON.parse(result.image || '[]');
        const files = JSON.parse(result.files || '[]');

        // แปลงเป็น URL ของไฟล์ใน S3
        const imageUrl = images.map(image => `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${image}`);
        const filesUrl = files.map(file => `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file}`);

        res.json({
          status: 'ok',
          data: {...result,
          },
        });
      }
    } catch (err) {
      res.json({
        status: 'error',
        message: err.message,
      });
    }
});


//ลบข้อมูลกิจกรรม id นั้น
router.delete('/:id', async (req, res) => {
  try {
    const [activity] = await pool.execute(
      'SELECT * FROM activity WHERE id = ?',
      [req.params.id]
    );
    const activityData = activity[0];

    let imageFiles = [];
    let files = [];

    // แปลงข้อมูลในคอลัมน์ image และ files เป็น JSON array
    try {
      imageFiles = JSON.parse(activityData.image);
    } catch (err) {
      //console.log("Error parsing image data:", err);
    }

    try {
      files = JSON.parse(activityData.files);
    } catch (err) {
      //console.log("Error parsing files data:", err);
    }

    // ลบไฟล์จาก S3 ทีละไฟล์
    for (const file of imageFiles) {
      await deleteS3(file);
    }

    for (const file of files) {
      await deleteS3(file);
    }

    // ลบข้อมูลกิจกรรมจากฐานข้อมูลหลังจากลบไฟล์ทั้งหมดแล้ว
    const [results] = await pool.execute(
      'DELETE FROM activity WHERE id = ?',
      [req.params.id]
    );

    res.json({ status: 'ok', message: 'Deleted success' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});



module.exports = router;