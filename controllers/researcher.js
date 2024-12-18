var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
require('dotenv').config();
const multer = require('multer');

// router.get('/', (req, res) => {
//   res.send('หน้าโปรไฟล์นักวิจัย/อาจารย์ แต่ละภาควิชา');
// });

//แสดงข้อมูลตาราง researcher
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT id AS id, name AS name, name_thai AS name_thai,
       department AS department, faculty AS faculty, contact AS contact,
       phone AS phone, office AS office ,image AS image
       FROM researcher`
    );
    res.json({
      status: 'ok',
      data: results,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});

//แสดงข้อมูลจากสองตาราง researcher และ scopus_2019_2023 ทั้งหมด
router.get('/scopus', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT r.id AS researcher_id, r.name AS researcher_name, 
              s.id AS scopus_id, s.paper, s.year, s.source, s.cited, s.link_to_paper
       FROM researcher r
       LEFT JOIN scopus s ON r.id = s.researcher_id`
    );
    res.json({
      status: 'ok',
      data: results,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});

//แยกภาควิชา มี4ภาค 
router.get('/:department', async (req, res) => {
  const department = req.params.department; // รับ department จาก URL
  try {
    const [data] = await pool.execute(
      `SELECT 
    r.id AS id, 
    r.name AS name, 
    r.name_thai AS name_thai,
    r.department AS department,
    r.faculty AS faculty,
    r.contact AS contact,
    r.phone AS phone,
    r.office AS office,
    r.image AS image
    FROM researcher r
    WHERE r.department = ?`, // ค้นหาจาก department
      [department]
    );
    res.json({
      status: 'ok',
      data: data,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});

//แสดงข้อมูลนักวิจัยแต่ละคนด้วย id ว่ามีกี่วิจัย
router.get('/:department/:id', async (req, res) => {
  const researcherId = req.params.id; 
  try {
    const [results] = await pool.execute(
      `SELECT r.id AS researcher_id, r.name AS researcher_name, 
              s.id AS scopus_id, s.paper, s.year, s.source, s.cited, s.link_to_paper
       FROM researcher r
       LEFT JOIN scopus s ON r.id = s.researcher_id
       WHERE r.id = ?`, // Filter by researcher id
      [researcherId]     
    );
    res.json({
      status: 'ok',
      data: results,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});

//เก็บรูปนักวิจัย
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      return cb(null, './public/profile');
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}_${file.originalname}`);
    },
  });

const upload = multer({ storage });

//เพิ่มนักวิจัยคนใหม่
router.post('/new', upload.single('image'), async (req, res) => {
const { name, name_thai, department, faculty, contact, phone, office } = req.body;
const image = req.file ? req.file.filename : null; 
  try {
    const [result] = await pool.execute(
      `INSERT INTO researcher (name, name_thai, department, faculty, contact, phone, office, image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, name_thai, department, faculty, contact, phone, office, image]
    );
    res.json({
      status: 'ok',
      message: 'Researcher added successfully',
      researcherId: result.insertId,
      image: image,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});

//เพิ่ม อัพเดต แค่รูปนักวิจัย
router.put('/update/:id', upload.single('image'), async (req, res) => {
  const researcherId = req.params.id; // รับค่า id จาก URL
  const image = req.file ? req.file.filename : null;
  try {
    const [result] = await pool.execute(
      `UPDATE researcher 
       SET image = ? 
       WHERE id = ?`,
      [image, researcherId]
    );
    res.json({
      status: 'ok',
      message: 'Image updated successfully',
      researcherId: researcherId, 
      image: image,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});


//ลบนักวิจัย
router.delete('/:id', async function (req, res, next) {
  try {
      const [results] = await pool.execute(
          'DELETE FROM researcher WHERE id = ?',
          [req.params.id]
      );
      res.json({ status: 'ok', message: 'Researcher deleted successfully' });
  } catch (err) {
      res.json({ status: 'error', message: err.message });
  }
});



module.exports = router;

