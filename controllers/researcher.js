var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
require('dotenv').config();

// router.get('/', (req, res) => {
//   res.send('หน้าโปรไฟล์นักวิจัย/อาจารย์ แต่ละภาควิชา');
// });

//แสดงข้อมูลตาราง researcher
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT id AS id, name AS name, name_thai AS name_thai,
       department AS department, faculty AS faculty, contact AS contact,
       phone AS phone, office AS office
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
    r.office AS office
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


module.exports = router;

