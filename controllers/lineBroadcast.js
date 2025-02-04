var express = require("express");
const router = express.Router();
var cors = require("cors");
const pool = require("../config/db");
require("dotenv").config();
const fetch = require("node-fetch"); 


// router.get("/line", (req, res) => {
//   res.send("Line Broadcast");
// });

//API ส่งข้อความไปยัง LINE Broadcast
router.post("/send", async (req, res) => {
  const { message, image, link } = req.body;
  if (!message && !image && !link) {
    return res
      .status(400)
      .json({ error: "ต้องมีข้อความ รูปภาพ หรือลิงก์อย่างน้อยหนึ่งอย่าง" });
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: "ไม่พบ LINE Access Token" });
  }

  //เตรียมข้อความที่ต้องการส่ง
  const messages = [];
  if (message) {
    messages.push({ type: "text", text: message });
  }
  if (image) {
    messages.push({
      type: "image",
      originalContentUrl: image,
      previewImageUrl: image,
    });
  }
  if (link) {
    messages.push({
      type: "text",
      text: `🔗 ลิงก์ที่แนบมา: ${link}`,
    });
  }

  try {
    //ใช้ Broadcast API ส่งข้อความถึงทุกคน
    const response = await fetch(
      "https://api.line.me/v2/bot/message/broadcast",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res
        .status(500)
        .json({ error: "ส่งข้อความไม่สำเร็จ", details: result });
    }

    res.json({ success: true, message: "ส่งข้อความถึงทุกคนสำเร็จ!" });
  } catch (error) {
    console.error("LINE API Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการส่งข้อความ!" });
  }
});

module.exports = router;
