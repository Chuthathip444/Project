const { S3 } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const dotenv = require('dotenv');
const multer = require('multer');
const moment = require('moment-timezone');
dotenv.config();

const s3 = new S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
});

// กำหนดขนาด
const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB


// ฟังก์ชันตรวจสอบประเภทไฟล์และขนาด
const validateFile = (file) => {
    const mimeType = file.mimetype;
    const fileSize = file.size;
    const allowedImages = ["image/jpeg", "image/png", "image/webp"];
    const allowedFiles = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/csv"
    ];

    if (allowedImages.includes(mimeType)) {
        if (fileSize > MAX_IMAGE_SIZE) {
            throw new Error("Image เกิน 25MB limit");
        }
        return mimeType;
    }

    if (allowedFiles.includes(mimeType)) {
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error("Files เกิน 50MB limit");
        }
        return mimeType;
    }
    throw new Error("Unsupported file type");
};


// ตั้งค่า S3 Storage สำหรับการอัปโหลดข่าว
const s3StorageNews = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: (req, file, cb) => {
        try {
            const contentType = validateFile(file); 
            cb(null, contentType);
        } catch (err) {
            cb(err, null);
        }
    },
    metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
        const fileName = `uploadNews/${Date.now()}_${file.originalname}`;
        cb(null, fileName);
    },
});


// ตั้งค่า S3 Storage สำหรับการอัปโหลดโปรไฟล์
const s3StorageProfile = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: (req, file, cb) => {
        try {
            const contentType = validateFile(file); 
            cb(null, contentType);
        } catch (err) {
            cb(err, null);
        }
    },
    metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
        const fileName = `uploadProfile/${Date.now()}_${file.originalname}`;
        cb(null, fileName);
    },
});


// ฟังก์ชันสำหรับลบไฟล์ใน S3
const deleteS3 = (fileUrl) => {
    const baseUrl = "https://research-app-file.s3.ap-southeast-1.amazonaws.com/";
    try {
        if (!fileUrl.startsWith(baseUrl)) {
            throw new Error("URL does not match the base URL of the S3 bucket.");
        }
        const fileKey = fileUrl.replace(baseUrl, "");
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
        };

        // ใช้ deleteObject แบบ callback
        s3.deleteObject(params, (err, data) => {
            if (err) {
                console.error(`Error deleting file: ${fileUrl}`, err.message);
            } else {
                console.log(`Success delete: ${fileKey}`);
            }
        });
    } catch (err) {
        console.error(`Error deleting file: ${fileUrl}`, err.message);
    }
};

const uploadNews = multer({
    storage: s3StorageNews,
    limits: { fileSize: MAX_FILE_SIZE },
});
const uploadProfile = multer({
    storage: s3StorageProfile, 
    limits: { fileSize: MAX_IMAGE_SIZE },
});

// ฟังก์ชันเพื่อดึงเวลาปัจจุบันในเขตเวลาของกรุงเทพฯ
const CurrentTime = () => moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

module.exports = {
    uploadNews,
    uploadProfile,
    deleteS3,
    CurrentTime,
};
