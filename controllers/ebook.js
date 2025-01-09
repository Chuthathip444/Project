var express = require('express');
const router = express.Router();
var cors = require('cors');
const moment = require('moment-timezone');
const pool = require('../config/db');
const { uploadEbook } = require('../Middleware/upload');
require('dotenv').config();


//ดู link Ebook
router.get('/', async (req, res) => {
  try {
      const [result] = await pool.query('SELECT * FROM ebook');
      res.status(200).json({ data: result });
  } catch (err) {
      console.error('Error fetching links:', err.message);
      res.status(500).json({ error: 'Failed links' });
  }
});


//เพิ่ม link
router.post('/new', async (req, res) => {
  const { link_to_ebook }  = req.body;
  if (!link_to_ebook ) {
    return res.status(400).json({ error: 'Link is required' });
  }
  try {
      const [result] = await pool.query('INSERT INTO ebook (link_to_ebook ) VALUES (?)', [link_to_ebook ]);
      res.json({
        message: 'Link success',
        id: result.insertId,
      });
    } catch (err) {
      res.json({
        status: 'error',
        message: err.message,
      });
    }
  });


// แก้ไขลิงก์โดยใช้ ID
router.put('/edit/:id', async (req, res) => {
  const { id } = req.params;  
  const { link_to_ebook  } = req.body;  
  if (!link_to_ebook ) {
    return res.status(400).json({ error: 'Link is required' });
  }

  try {
    const [result] = await pool.query('UPDATE ebook SET link_to_ebook  = ? WHERE id = ?',[link_to_ebook, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.json({
      message: 'Link update',
      id: id,
      link_to_ebook: link_to_ebook,
    });

  } catch (err) {
    console.error('Error updating link:', err.message);
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});


// ลบลิงก์ตาม ID
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;  

  try {
    const [result] = await pool.query('DELETE FROM ebook WHERE id = ?', [id]);
    res.json({
      message: 'Delete success',
      id: id,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});


module.exports = router;