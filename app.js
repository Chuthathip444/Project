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


//middleware
app.use(cors());
app.use(bodyParser.json());  
app.use(bodyParser.urlencoded({ extended: true }));  


// Import controllers
const homeController = require('./controllers/home');
const loginController = require('./controllers/login');
const ebookController = require('./controllers/ebook');
const researcherController = require('./controllers/researcher');
const activityController = require('./controllers/activity');


// API
app.use('/', homeController); 
app.use('/login', loginController); 
app.use('/ebook', ebookController);
app.use('/researcher', researcherController);
app.use('/activity', activityController);


//server
const { createServer } = require('http');
const port = 3333;
const server = createServer(app);
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
