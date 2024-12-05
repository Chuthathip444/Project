var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
require('dotenv').config();

router.get('/', (req, res) => {
  res.send('หน้าโปรไฟล์นักวิจัย/อาจารย์ แต่ละภาควิชา');
});

module.exports = router;