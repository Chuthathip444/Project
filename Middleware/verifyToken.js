const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const secret = 'login';

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'token ไม่ถูกส่งมาพร้อมคำขอ' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, secret);
    const [user] = await pool.execute('SELECT * FROM admin WHERE email=?', [decoded.email]);
    if (user.length === 0) {
      return res.status(401).json({ status: 'error', message: 'No user found' });
    }

    // ตรวจสอบว่ามี Token ใน Database หรือไม่
    if (!user[0].token || user[0].token.trim() === "") {
      return res.status(401).json({ status: 'error', message: 'ไม่มี token in database' });
    }

    // ตรวจสอบว่า Token ตรงกับที่เก็บไว้ใน Database หรือไม่
    if (user[0].token !== token) {
      return res.status(401).json({ status: 'error', message: 'Token ไม่ตรงกับที่มี' });
    }

    req.admin = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ 
        status: 'error', 
        message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};



module.exports = verifyToken;
