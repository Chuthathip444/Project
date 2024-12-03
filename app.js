var express = require('express');
var cors = require('cors');
const pool = require('./config/db');
var app = express(); 
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
const bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
const secret = 'login';
const multer = require('multer');
const moment = require('moment-timezone');
require('dotenv').config();

app.use(cors());

// Import controllers
const homeController = require('./controllers/home');
const loginController = require('./controllers/login');
const researchController = require('./controllers/newresearch');

// Use controllers API
app.use('/', homeController); 
app.use('/api', loginController); 
app.use('/api', researchController); 

const { createServer } = require('http');
const port = 3333;
const server = createServer(app);
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
