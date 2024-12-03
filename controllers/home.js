var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
require('dotenv').config();

router.get('/', (req, res) => {
  res.send('Web Application for Research');
});

// Read all research
router.get('/Allresearch', async function (req, res, next) {
    try {
      const [results] = await pool.execute(
        'SELECT id, name, title, image, time FROM newresearch'
      );
      res.json({ status: 'ok', AllResearch: results });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  });
  
// Read (Get research by ID)
router.get('/research/:id', async function (req, res, next) {
    try {
      const [results] = await pool.execute(
        'SELECT * FROM newresearch WHERE id=?',
        [req.params.id]
      );
      if (results.length === 0) {
        res.json({ status: 'error', message: 'Research not found' });
        return;
      }
      res.json({ status: 'ok', research: results[0] });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  });

module.exports = router;
