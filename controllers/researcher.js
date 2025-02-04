var express = require('express');
const router = express.Router();
var cors = require('cors');
const pool = require('../config/db');
require('dotenv').config();
const app = express();
const { uploadProfile, deleteS3 } = require('../Middleware/upload');
const path = require('path');
const fs = require('fs');

app.use('/public', express.static(path.join(__dirname, 'public')));

//แสดงข้อมูลตาราง researcher
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT id AS id, position AS position, name AS name, position_thai AS position_thai,
       name_thai AS name_thai,department AS department, faculty AS faculty,
       contact AS contact, phone AS phone, office AS office, image AS image
       FROM researcher`
    );

    if (results.length > 0) {
      const ImageUrl = results.map(result => ({
        ...result,
      })); //imageUrl: `/public/profile/${result.image}` // เพิ่ม imageUrl 
      res.json({
        status: 'ok',
        data: ImageUrl, 
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'No data found',
      });
    }

  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});


//แสดงข้อมูลจากสองตาราง researcher และ research ทั้งหมด
router.get('/research', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT r.id AS researcher_id, r.name AS researcher_name, 
              s.id AS research_id, s.paper, s.year, s.source, s.cited, s.link_to_paper
       FROM researcher r
       LEFT JOIN research s ON r.id = s.researcher_id`
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
  const department = req.params.department ;
  try {
    const [results] = await pool.execute(
      `SELECT 
        r.id AS id,
        r.position AS position, 
        r.name AS name,
        r.position_thai AS position_thai, 
        r.name_thai AS name_thai,
        r.department AS department,
        r.faculty AS faculty,
        r.contact AS contact,
        r.phone AS phone,
        r.office AS office,
        r.image AS image
      FROM researcher r
      WHERE r.department = ?`, [department]
    );
    if (results.length > 0) {
      const ImageUrl = results.map(result => ({
        ...result, 
      }));
      res.json({
        status: 'ok',
        data: ImageUrl, 
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'No data found',
      });
    }
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});


// แสดงข้อมูลนักวิจัยแต่ละคนด้วย id ว่ามีกี่วิจัย
router.get('/:department/:id', async (req, res) => {
  const researcherId = req.params.id;
  //const department = req.params.department; 
  try {
    const [results] = await pool.execute(
      `SELECT r.id AS researcher_id,
              r.position AS position,
              r.name AS researcher_name, 
              r.department AS department,
              s.id AS research_id, 
              s.paper, 
              s.year, 
              s.source, 
              s.cited, 
              s.link_to_paper
       FROM researcher r
       LEFT JOIN research s ON r.id = s.researcher_id
       WHERE r.id = ? `, 
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


//เพิ่มนักวิจัยคนใหม่
router.post('/:department/new', uploadProfile.single('image'), async (req, res) => {
  const { position, name, position_thai, name_thai, department, faculty, contact, phone, office } = req.body;
  const image = req.file ? req.file.location : null;
    try {
      const [result] = await pool.execute(
        `INSERT INTO researcher (position, name, position_thai, name_thai
        , department, faculty, contact, phone, office, image) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [position, name, position_thai, name_thai, department, faculty, contact, phone, office, image]
      );
      res.json({
        status: 'ok',
        message: 'Researcher add successfully',
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
  

//แก้ไขโปรไฟล์นักวิจัย
router.put('/:department/:id/update', uploadProfile.single('image'), async (req, res) => {
  const department = req.params.department;
  const researcherId = req.params.id;
  const { position, name, position_thai, name_thai, faculty, contact, phone, office } = req.body;
  const image = req.file ? req.file.location : null;
  try {
    const [existingData] = await pool.execute(
      `SELECT * FROM researcher WHERE id = ?`,
      [researcherId]
    );
    if (existingData.length === 0) {
      return res.json({
        status: 'error',
        message: 'Researcher not found',
      });
    }

    const currentData = existingData[0]; 
    if (image && currentData.image) {
      await deleteS3(currentData.image);
    }

    const updatedData = {
      position: position|| currentData.position,
      name: name || currentData.name,
      position_thai: position_thai|| currentData.position_thai,
      name_thai: name_thai || currentData.name_thai,
      department: department || currentData.department,
      faculty: faculty || currentData.faculty,
      contact: contact || currentData.contact,
      phone: phone || currentData.phone,
      office: office || currentData.office,
      image: image || currentData.image,
    };

    const [result] = await pool.execute(
      `UPDATE researcher SET position = ?, name = ?, position_thai =? ,
       name_thai = ?, department = ?, faculty = ?, contact = ?,
       phone = ?, office = ?, image = ?
       WHERE id = ?`,
      [
        updatedData.position,
        updatedData.name,
        updatedData.position_thai,
        updatedData.name_thai,
        updatedData.department,
        updatedData.faculty,
        updatedData.contact,
        updatedData.phone,
        updatedData.office,
        updatedData.image,
        researcherId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.json({
        status: 'error',
        message: 'No changes made',
      });
    }

    res.json({
      status: 'ok',
      message: 'Researcher update successfully',
      researcherId: researcherId,
      updatedData: updatedData,
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});



//ลบนักวิจัย
router.delete('/:department/:id', async (req, res) => {
  const researcherId = req.params.id;
  try {
      const [researcher] = await pool.execute(
        'SELECT image FROM researcher WHERE id = ?'
        ,[researcherId]);
      if (researcher.length === 0) {
          return res.status(404).json({ status: 'error', message: 'Researcher not found' });
      }

      const imageUrl = researcher[0].image; 
      if (imageUrl) {
          await deleteS3(imageUrl);
      }
      await pool.execute('DELETE FROM researcher WHERE id = ?', [researcherId]);
      res.json({ status: 'ok', message: 'Researcher delete successfully' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: err.message });
  }
});



//เพิ่มงานวิจัยของนักวิจัย id นั้นๆ
router.post('/:department/:id/new', async (req, res) => {
  //console.log(req.body);
  const { department, id } = req.params;  
  const { paper, year, source, cited, link_to_paper } = req.body;  
  try {
    const [result] = await pool.execute(
      `INSERT INTO research (researcher_id, paper, year, source, cited, link_to_paper) 
       VALUES (?, ?, ?, ?, ?, ?)`, 
      [id, paper, year, source, cited, link_to_paper] 
    );
    res.json({
      status: 'ok',
      message: 'Data add successfully',
      researchId: result.insertId, 
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,  
    });
  }
});


//อัพเดต แก้ไข งานวิจัย
router.put('/:department/:researcherId/:researchId/edit', async (req, res) => {
  const { department, researcherId, researchId } = req.params; 
  const { paper, year, source, cited, link_to_paper } = req.body; 
  try {
    const [existingData] = await pool.execute(
      `SELECT * FROM research WHERE id = ? AND researcher_id = ?`,
      [researchId, researcherId]
    );
    if (existingData.length === 0) {
      return res.json({
        status: 'error',
        message: 'Research data not found',
      });
    }

    const currentData = existingData[0]; 
    const updatedData = {
      paper: paper || currentData.paper,
      year: year || currentData.year,
      source: source || currentData.source,
      cited: (cited !== undefined) ? cited : currentData.cited, 
      link_to_paper: link_to_paper || currentData.link_to_paper,
    };
    const [result] = await pool.execute(
      `UPDATE research 
       SET paper = ?, year = ?, source = ?, cited = ?, link_to_paper = ?
       WHERE id = ? AND researcher_id = ?`,
      [
        updatedData.paper,
        updatedData.year,
        updatedData.source,
        updatedData.cited,
        updatedData.link_to_paper,
        researchId,
        researcherId,
      ]
    );
    if (result.affectedRows === 0) {
      return res.json({
        status: 'error',
        message: 'No changes made',
      });
    }
    res.json({
      status: 'ok',
      message: 'Research update successfully',
      researcherId: researcherId,
      researchId: researchId,
      updatedData: updatedData, 
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});



//ลบงานวิจัย
router.delete('/:department/:researcherId/:researchId', async function (req, res, next) {
  const { department, researcherId, researchId } = req.params; 
  try {
    // ลบข้อมูลงานวิจัยจากตาราง research ที่ตรงกับ researcherId และ researchId
    const [results] = await pool.execute(
      'DELETE FROM research WHERE id = ? AND researcher_id = ?',
      [researchd, researcherId]
    );
      res.json({ status: 'ok', message: 'Research delete successfully' });
  } catch (err) {
      res.json({ status: 'error', message: err.message });
  }
});





module.exports = router;

