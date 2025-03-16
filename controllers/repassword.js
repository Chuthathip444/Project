var express = require('express');
const router = express.Router();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const sendResetEmail = require('../Middleware/email');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET;

// ส่องคำขอใส่รหัสใหม่ ผ่านอีเมล
router.post('/request', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await pool.query("SELECT * FROM admin WHERE email = ?", [email]);

        if (!users.length) 
            return res.status(400).json({ msg: "Email not found" });

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "15m" });
        await pool.query("UPDATE admin SET reset_token = ? WHERE email = ?", [token, email]);
        const [updatedUser] = await pool.query("SELECT reset_token FROM admin WHERE email = ?", [email]);
        await sendResetEmail(email, token);
        res.json({ msg: "Reset link sent to email" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});

//หน้าเปลี่ยนรหัส
router.post('/reset-password', async (req, res) => {
    const { reset_token, password } = req.body;
    try {
        const decoded = jwt.verify(reset_token, JWT_SECRET);
        const [user] = await pool.query("SELECT reset_token FROM admin WHERE email = ?", [decoded.email]);

        if (!user.length || user[0].reset_token !== reset_token) {
            return res.status(400).json({ msg: "Invalid or expired token" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("UPDATE admin SET password = ?, reset_token = NULL WHERE email = ?", 
        [hashedPassword, decoded.email]);
        res.json({ msg: "Password reset successfully" });

    } catch (err) {
        console.error("Error:", err);
        res.status(400).json({ msg: "Invalid or expired token" });
    }
});



module.exports = router;
