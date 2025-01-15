const multer = require('multer');
const moment = require('moment-timezone');
const { cloudinary } = require('./cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ตั้งค่า Cloudinary Storage สำหรับอัปโหลดข่าว
const cloudinaryStorageNews = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploadNews',  // โฟลเดอร์ที่ใช้เก็บไฟล์ข่าว
        allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx'],  
        resource_type: 'auto',  
    },
});

// ตั้งค่า Cloudinary Storage สำหรับโปรไฟล์
const cloudinaryStorageProfile = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'profile',  // โฟลเดอร์ที่ใช้เก็บไฟล์โปรไฟล์
        allowed_formats: ['jpg', 'png'],  
        resource_type: 'image',  
    },
});

// Middleware สำหรับการอัปโหลดไฟล์ข่าว
const uploadNews = multer({
    storage: cloudinaryStorageNews,
    limits: { fileSize: 10 * 1024 * 1024 }, 
});

// Middleware สำหรับการอัปโหลดไฟล์โปรไฟล์
const uploadProfile = multer({
    storage: cloudinaryStorageProfile,
    limits: { fileSize: 10 * 1024 * 1024 }, 
});

const CurrentTime = () => moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

module.exports = {
    uploadNews,
    uploadProfile,  
    CurrentTime,
};
