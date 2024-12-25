var express = require('express');
var cors = require('cors');
const router = express.Router();
const pool = require('../config/db');
const { uploadNews, CurrentTime  } = require ('../Middleware/upload'); 
require('dotenv').config();
const fs = require('fs');
const path = require('path');



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


//error 
//แก้ไขข่าว 
router.put('/:id/edit', uploadNews.fields([
    { name: 'image', maxCount: 10 }, // สำหรับไฟล์ภาพ
    { name: 'files', maxCount: 10 }   // สำหรับไฟล์อื่นๆ
]), async (req, res) => {
    const activityId = req.params.id;  
    const { topic, detail, admin } = req.body;
    const image = req.files.image && req.files.image.length > 0 ? req.files.image.map((file) => file.filename) : null;
    const files = req.files.files && req.files.files.length > 0 ? req.files.files.map((file) => file.filename) : null;
    const currentTime = CurrentTime();

    try {
        const [existingData] = await pool.execute(
            'SELECT * FROM activity WHERE id = ?',
            [activityId]
        );

        if (existingData.length === 0) {
            return res.json({
                status: 'error',
                message: 'Activity not found',
            });
        }
        const currentData = existingData[0];

        // รวมข้อมูลใหม่กับข้อมูลปัจจุบัน
        const updatedData = {
            topic: topic || currentData.topic,  
            detail: detail || currentData.detail,  
            admin: admin || currentData.admin, 
            image: image ? JSON.stringify(image) : currentData.image,  // เก็บข้อมูลที่เป็น JSON string
            files: files ? JSON.stringify(files) : currentData.files,  // เก็บไฟล์อื่นๆ ในรูปแบบ JSON string
            time: currentTime,  
        };

        const [result] = await pool.execute(
            `UPDATE activity 
             SET topic = ?, detail = ?, image = ?, files = ?, admin = ?, time = ? 
             WHERE id = ?`,
            [
                updatedData.topic,
                updatedData.detail,
                updatedData.image,  
                updatedData.files,  
                updatedData.admin,
                updatedData.time,
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
            message: 'Activity updated successfully',
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