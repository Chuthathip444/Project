const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Web Application for Research');
});

module.exports = router;
