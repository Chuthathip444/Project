var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
require('dotenv').config();

router.get('/', (req, res) => {
  res.send('Web Application for Research');
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




module.exports = router;
