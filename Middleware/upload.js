const multer = require('multer');
const moment = require('moment-timezone');

// โฟลเดอร์ profile
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/profile'); 
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); 
    },
});

// โฟลเดอร์ news ข่าว
const newsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/news'); 
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); 
    },
});

// โฟลเดอร์ files
const filesStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/files'); 
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); 
    },
});


// Middleware สำหรับจัดการอัปโหลด
const uploadProfile = multer({ storage: profileStorage });
const uploadNews = multer({ storage: newsStorage });
const uploadFiles = multer({ storage: filesStorage});

// เวลาปัจจุบันใน timezone ของกรุงเทพ
const CurrentTime = () => moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

module.exports = {
    uploadProfile,
    uploadNews,
    uploadFiles,
    CurrentTime,
};
