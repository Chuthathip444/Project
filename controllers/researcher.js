var express = require('express');
const router = express.Router();
var cors = require('cors');
const pool = require('../config/db');
require('dotenv').config();
const app = express();
const { uploadProfile } = require('../Middleware/upload');
const path = require('path');
const fs = require('fs');

app.use('/public', express.static(path.join(__dirname, 'public')));

//แสดงข้อมูลตาราง researcher
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT id AS id, name AS name, name_thai AS name_thai,
       department AS department, faculty AS faculty, contact AS contact,
       phone AS phone, office AS office, image AS image
       FROM researcher`
    );

    if (results.length > 0) {
      const ImageUrl = results.map(result => ({
        ...result,
        imageUrl: `/public/profile/${result.image}` // เพิ่ม imageUrl ในแต่ละแถว
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
  const department = req.params.department ;
  try {
    const [results] = await pool.execute(
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
      WHERE r.department = ?`, [department]
    );
    if (results.length > 0) {
      const ImageUrl = results.map(result => ({
        ...result,
        imageUrl: result.image 
          ? `/public/profile/${result.image}` : null, 
      }));
      res.json({
        status: 'ok',
        data: ImageUrl, 
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'No data found for this department',
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
  let department = req.params.department;
  try {
    const [results] = await pool.execute(
      `SELECT r.id AS researcher_id, 
              r.name AS researcher_name, 
              r.department AS department,
              s.id AS scopus_id, 
              s.paper, 
              s.year, 
              s.source, 
              s.cited, 
              s.link_to_paper
       FROM researcher r
       LEFT JOIN scopus s ON r.id = s.researcher_id
       WHERE r.id = ? `, 
      [researcherId, department]
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
        message: 'Researcher add',
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
  

//อัพเดต แก้ไข โปรไฟล์นักวิจัย
router.put('/:department/:id/update', uploadProfile.single('image'), async (req, res) => {
  const department = req.params.department; 
  const researcherId = req.params.id; 
  const { name, name_thai, faculty, contact, phone, office } = req.body;
  const image = req.file ? req.file.filename : null;

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

    // รวมข้อมูลใหม่กับข้อมูลเดิม (ถ้าข้อมูลใหม่ไม่มีการส่งมา)
    const updatedData = {
      name: name || currentData.name,
      name_thai: name_thai || currentData.name_thai,
      department: department || currentData.department,
      faculty: faculty || currentData.faculty,
      contact: contact || currentData.contact,
      phone: phone || currentData.phone,
      office: office || currentData.office,
      image: image || currentData.image,
    };

    const [result] = await pool.execute(
      `UPDATE researcher 
       SET name = ?, name_thai = ?, department = ?, faculty = ?, 
           contact = ?, phone = ?, office = ?, image = ?
       WHERE id = ?`,
      [
        updatedData.name,
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
      message: 'Researcher updated successfully',
      researcherId: researcherId,
      updatedData: updatedData, // ส่งคืนข้อมูลที่อัปเดต
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});



//เพิ่ม อัพเดต แค่รูปนักวิจัย
router.put('/image/:id', uploadProfile.single('image'), async (req, res) => {
  const researcherId = req.params.id;
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
      message: 'Image update',
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


//เพิ่มงานวิจัยของนักวิจัย id นั้นๆ
router.post('/:department/:id/new', async (req, res) => {
  //console.log(req.body);
  const { department, id } = req.params;  
  const { paper, year, source, cited, link_to_paper } = req.body;  
  try {
    const [result] = await pool.execute(
      `INSERT INTO scopus (researcher_id, paper, year, source, cited, link_to_paper) 
       VALUES (?, ?, ?, ?, ?, ?)`, 
      [id, paper, year, source, cited, link_to_paper]  // ส่งข้อมูลไปที่ฐานข้อมูล
    );
    res.json({
      status: 'ok',
      message: 'Data added successfully',
      scopusId: result.insertId,  // ส่งคืน ID ของ scopus ที่เพิ่มใหม่
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,  
    });
  }
});


//อัพเดต แก้ไข งานวิจัย
router.put('/:department/:researcherId/:scopusId/edit', async (req, res) => {
  const { department, researcherId, scopusId } = req.params; 
  const { paper, year, source, cited, link_to_paper } = req.body; 
  try {
    // ดึงข้อมูลงานวิจัยปัจจุบันจากตาราง scopus
    const [existingData] = await pool.execute(
      `SELECT * FROM scopus WHERE id = ? AND researcher_id = ?`,
      [scopusId, researcherId]
    );
    if (existingData.length === 0) {
      return res.json({
        status: 'error',
        message: 'Research data not found',
      });
    }
    const currentData = existingData[0]; 
    // รวมข้อมูลใหม่กับข้อมูลเดิม (ถ้าข้อมูลใหม่ไม่มีการส่งมา)
    const updatedData = {
      paper: paper || currentData.paper,
      year: year || currentData.year,
      source: source || currentData.source,
      cited: (cited !== undefined) ? cited : currentData.cited,
      link_to_paper: link_to_paper || currentData.link_to_paper,
    };

    // อัปเดตข้อมูลในตาราง scopus
    const [result] = await pool.execute(
      `UPDATE scopus 
       SET paper = ?, year = ?, source = ?, cited = ?, link_to_paper = ?
       WHERE id = ? AND researcher_id = ?`,
      [
        updatedData.paper,
        updatedData.year,
        updatedData.source,
        updatedData.cited,
        updatedData.link_to_paper,
        scopusId,
        researcherId,
      ]
    );
    if (result.affectedRows === 0) {
      return res.json({
        status: 'error',
        message: 'No changes made to research data',
      });
    }
    res.json({
      status: 'ok',
      message: 'Research data update',
      researcherId: researcherId,
      scopusId: scopusId,
      updatedData: updatedData, // ส่งคืนข้อมูลที่อัปเดต
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
    });
  }
});


//ลบงานวิจัย
router.delete('/:department/:researcherId/:scopusId', async function (req, res, next) {
  const { department, researcherId, scopusId } = req.params; 
  try {
    // ลบข้อมูลงานวิจัยจากตาราง scopus ที่ตรงกับ researcherId และ scopusId
    const [results] = await pool.execute(
      'DELETE FROM scopus WHERE id = ? AND researcher_id = ?',
      [scopusId, researcherId]
    );
      res.json({ status: 'ok', message: 'Research delete' });
  } catch (err) {
      res.json({ status: 'error', message: err.message });
  }
});


//ลบนักวิจัย
router.delete('/:department/:id', async (req, res) => {
  const researcherId = req.params.id;
  try {
    const [researcher] = await pool.execute('SELECT image FROM researcher WHERE id = ?', [researcherId]);
    const imageFile = researcher[0].image; 
    const imagePath = imageFile ? path.join(__dirname, '../public/profile', imageFile) : null;

    // ลบไฟล์รูปภาพ ถ้ามีไฟล์อยู่ในเซิร์ฟเวอร์
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Error removing image file:', err);
        } else {
          console.log('Image file removed:', imageFile);
        }
      });
    }

    // ลบนักวิจัยออกจากฐานข้อมูล
    await pool.execute('DELETE FROM researcher WHERE id = ?', [researcherId]);

    res.json({ status: 'ok', message: 'Researcher and image deleted successfully' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});



module.exports = router;

