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
  { name: 'image' },{ name: 'files' }, 
]), async (req, res) => {
    try {
        const topic = req.body.topic;
        const detail = req.body.detail;
        const link = req.body.link;
        const admin = req.body.admin;
        const currentTime = CurrentTime();
        // ดึง URL ของไฟล์จาก S3
        const imageUrls = req.files.image ? req.files.image.map((file) => file.location || file.url) : [];
        const fileUrls = req.files.files ? req.files.files.map((file) => file.location || file.url) : [];
  
        const [results] = await pool.execute(
            'INSERT INTO activity (topic, detail, image, files, link, admin) VALUES (?, ?, ?, ?, ?, ?)',
            [
                topic,
                detail,
                JSON.stringify(imageUrls),  
                JSON.stringify(fileUrls),
                link, 
                admin,
            ]
        );
        res.json({
            status: 'ok',
            message: 'Activity add successfully',
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
        `SELECT id, topic, detail, image, files, link, admin, time FROM activity`
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
          return {...result,};
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
        `SELECT id, topic, detail, image, files, link, admin, time
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


// แก้ไขข้อมูลข่าวกิจกรรม
router.put('/:id/edit', uploadNews.fields([
  { name: 'image' },{ name: 'files' },
]), async (req, res) => {
  const activityId = req.params.id; 
  const { topic, detail, link, admin } = req.body; 
  const newImages = req.files.image ? req.files.image.map(file => file.location || file.url) : null;
  const newFiles = req.files.files ? req.files.files.map(file => file.location || file.url) : null;

  try {
    const [existingData] = await pool.execute(
      `SELECT * FROM activity WHERE id = ?`,
      [activityId]
    );
    if (existingData.length === 0) {
      return res.json({
        status: 'error',
        message: 'Activity not found',
      });
    }

    const currentData = existingData[0]; 
    // ลบไฟล์เก่าออกจาก S3 หากมีไฟล์ใหม่ถูกอัปโหลด
    if (newImages) {
      const oldImages = JSON.parse(currentData.image || '[]');
      for (const file of oldImages) {
        if (!newImages.includes(file)) {
          await deleteS3(file); 
        }
      }
    }

    if (newFiles) {
      const oldFiles = JSON.parse(currentData.files || '[]');
      for (const file of oldFiles) {
        if (!newFiles.includes(file)) {
          await deleteS3(file); 
        }
      }
    }

    const updatedData = {
      topic: topic || currentData.topic,
      detail: detail || currentData.detail,
      image: newImages ? JSON.stringify(newImages) : currentData.image,
      files: newFiles ? JSON.stringify(newFiles) : currentData.files,
      link: link || currentData.link,
      admin: admin || currentData.admin,
    };
    const [result] = await pool.execute(
      `UPDATE activity 
       SET topic = ?, detail = ?, image = ?, files = ?, link = ?, admin = ? 
       WHERE id = ?`,
      [
        updatedData.topic,
        updatedData.detail,
        updatedData.image,
        updatedData.files,
        updatedData.link,
        updatedData.admin,
        activityId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.json({
        status: 'error',
        message: 'No changes made',
      });
    }

    res.json({
      status: 'ok',
      message: 'Activity update',
      activityId: activityId,
      updatedData: updatedData,
    });
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
    res.json({ status: 'ok', message: 'Delete successfully' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});



module.exports = router;