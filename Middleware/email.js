const nodemailer = require('nodemailer');
require('dotenv').config();

const sendResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Your Password",
        html: `<p>คุณได้ขอ Reset password ของ Email ${email} สำหรับเข้าเว็บแอปพลิเคชัน Research Unit, Naresuan University โปรดดำเนินการภายใน 15 นาที</p>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });
};

module.exports = sendResetEmail; 
