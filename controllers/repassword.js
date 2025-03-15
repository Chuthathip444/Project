var express = require('express');
const router = express.Router();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const sendResetEmail = require('../Middleware/email');

const JWT_SECRET = process.env.JWT_SECRET;

// ส่องคำขอใส่รหัสใหม่ ผ่านอีเมล
router.post('/request', async (req, res) => {
    const { email } = req.body;

    try {
        const [user] = await pool.query("SELECT * FROM admin WHERE email = ?", [email]);

        if (!user.length) return res.status(400).json({ msg: "Email not found" });

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "15m" });

        await pool.query("UPDATE admin SET reset_token = ? WHERE email = ?", [token, email]);

        await sendResetEmail(email, token);

        res.json({ msg: "Reset link sent to email" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});


router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query("UPDATE users SET password = ?, reset_token = NULL WHERE email = ?", 
        [hashedPassword, decoded.email]);
        
        res.json({ msg: "Password reset successfully" });

    } catch (err) {
        res.status(400).json({ msg: "Invalid or expired token" });
    }
});

module.exports = router;
