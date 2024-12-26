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
router.post('/new', uploadNews.fields([
    { name: 'image', maxCount: 10 },  // สำหรับไฟล์ภาพ
    { name: 'files', maxCount: 10 }    // สำหรับไฟล์อื่นๆ
]), async (req, res) => {
    const topic = req.body.topic;
    const detail = req.body.detail;
    const admin = req.body.admin;
    const image = req.files.image ? req.files.image.map((file) => file.filename) : [];
    const files = req.files.files ? req.files.files.map((file) => file.filename) : [];
    const currentTime = CurrentTime() ;
    try {
        const [results] = await pool.execute(
            'INSERT INTO activity (topic, detail, image, files, admin, time) VALUES (?, ?, ?, ?, ?, ?)',
            [
                topic,
                detail,
                JSON.stringify(image), // เก็บไฟล์ภาพ
                JSON.stringify(files),   // เก็บไฟล์อื่นๆ
                admin,
                currentTime
            ]
        );
        res.json({
            status: 'ok',
            message: 'Activity added successfully',
            activityId: results.insertId,
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
            `SELECT a.id, a.topic, a.detail, ai.image_path AS image, a.files, a.admin, a.time
            FROM activity a
            LEFT JOIN activity_images ai ON a.id = ai.activity_id`
        );
        if (results.length > 0) {
            const ImageUrl = results.map(result => ({
              ...result,
              imageUrl: `/public/news/${result.image}` // เพิ่ม imageUrl ในแต่ละแถว
            }));
      
            res.json({
              status: 'ok',
              data: ImageUrl, 
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
            `SELECT a.id, a.topic, a.detail, ai.image_path AS image, a.files, a.admin, a.time
            FROM activity a
            LEFT JOIN activity_images ai ON a.id = ai.activity_id
            WHERE a.id = ?`,  
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
            console.log("Error parsing image data:", err);
        }

        try {
            files = JSON.parse(activityData.files); 
        } catch (err) {
            console.log("Error parsing files data:", err);
        }

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
        res.json({ status: 'ok', message: 'Activity and files deleted successfully' });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});



module.exports = router;