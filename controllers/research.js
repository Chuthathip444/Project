var express = require('express');
const router = express.Router();
var cors = require('cors');
const pool = require('../config/db');
require('dotenv').config();


router.get('/scopus', async (req, res) => {
    try {
      const [results] = await pool.execute(
        `SELECT id, researcher_id, paper, year, source, cited, link_to_paper
         FROM scopus`
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