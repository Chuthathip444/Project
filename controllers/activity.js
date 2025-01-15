var express = require('express');
var cors = require('cors');
const router = express.Router();
const pool = require('../config/db');
const { uploadNews, CurrentTime  } = require ('../Middleware/upload'); 
require('dotenv').config();
const fs = require('fs');
const path = require('path');


// ตั้งค่า static directory สำหรับการเข้าถึงไฟล์ในโฟลเดอร์ public
router.use('/public', express.static(path.join(__dirname, '..', 'public')));


router.get('/:activityId/:imageId', async (req, res) => {
    try {
        const { activityId, imageId } = req.params; 
        const [results] = await pool.execute(
            `SELECT a.id, a.topic, a.detail, ai.image_path AS image, a.files, a.admin, a.time
            FROM activity a
            LEFT JOIN activity_images ai ON a.id = ai.activity_id
            WHERE a.id = ? AND ai.id = ?`, [activityId, imageId]
        );

        if (results.length > 0) {
            // เพิ่ม URL ของรูปภาพเพื่อให้สามารถแสดงในหน้าเว็บ
            const imageUrl = `/public/news/${results[0].image}`;  
            res.json({
                status: 'ok',
                data: { ...results[0], imageUrl }, 
            });
        } else {
            res.status(404).json({ 
                status: 'error', 
                message: 'Image not found' });
        }
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message,
        });
    }
});


router.post('/:activityId/image', uploadNews.array('image_path', 10), async (req, res) => {
    const { activityId } = req.params;
    const imagePaths = req.files ? req.files.map((file) => file.filename) : [];
    try {
        await Promise.all(imagePaths.map((path) =>pool.execute(
        `INSERT INTO activity_images (activity_id, image_path) VALUES (?, ?)`,
        [
            activity_id,
            JSON.stringify(image)
        ]
        [activityId, path] 
    )));
        res.json({
            status: 'ok',
            message: 'Images uploaded successfully',
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});


//เพิ่มกิจกรรม ประกาศต่างๆ
router.post('/new',uploadNews.fields([
        { name: 'image', maxCount: 10 }, 
        { name: 'files', maxCount: 10 },]),
    async (req, res) => {
        try {
            console.log('Uploaded Files:', req.files);
            const topic = req.body.topic;
            const detail = req.body.detail;
            const admin = req.body.admin;
            const imageUrls = req.files.image ? req.files.image.map((file) => file.path) : [];
            const fileUrls = req.files.files ? req.files.files.map((file) => file.path) : [];
            const currentTime = CurrentTime();

            const [results] = await pool.execute(
                'INSERT INTO activity (topic, detail, image, files, admin, time) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    topic,
                    detail,
                    JSON.stringify(imageUrls),
                    JSON.stringify(fileUrls),
                    admin,
                    currentTime,
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
    }
);


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
  
        try {images = JSON.parse(result.image || '[]');
        } catch (e) {images = result.image ? result.image.split(',') : [];}

        try {files = JSON.parse(result.files || '[]');
        } catch (e) {files = result.files ? result.files.split(',') : [];}
  
        const imageUrl = images.map(image => `/public/news/${image.trim()}`);
        const filesUrl = files.map(file => `/public/news/${file.trim()}`);
  
        return {
        ...result,
        imageUrl,
        filesUrl,
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
        const imageUrl = images.map(image => `/public/news/${image}`);
        const filesUrl = files.map(file => `/public/news/${file}`);

        res.json({
          status: 'ok',
          data: {...result,
            imageUrl,
            filesUrl,
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
router.delete('/:id', async function (req, res, next) {
    try {
        const [activity] = await pool.execute(
            'SELECT * FROM activity WHERE id = ?',
            [req.params.id]
        );
        const activityData = activity[0];
        let imageFiles = [];
        let files = [];
        // แปลงข้อมูลในคอลัมน์ image และ files เป็น JSON array
        try {imageFiles = JSON.parse(activityData.image); 
        } catch (err) {console.log("Error parsing image data:", err);}

        try {files = JSON.parse(activityData.files); 
        } catch (err) {console.log("Error parsing files data:", err);}

        // ลบไฟล์ภาพ (คอลัมน์ image)
        if (imageFiles && imageFiles.length > 0) {
            imageFiles.forEach((file) => {
                const filePath = path.join(__dirname, '../public/news', file);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.log('Error remove:', err);
                    } else {
                        console.log('Image file removed:', file);
                    }
                });
            });
        }

        // ลบไฟล์อื่นๆ (คอลัมน์ files)
        if (files && files.length > 0) {
            files.forEach((file) => {
                const filePath = path.join(__dirname, '../public/news', file);
                console.log("Attempting to remove file at:", filePath); 
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.log('Error remove:', err);
                    } else {
                        console.log('File removed:', file);
                    }
                });
            });
        }

        // ลบข้อมูลกิจกรรมออกจากฐานข้อมูล
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