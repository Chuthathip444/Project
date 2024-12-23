var express = require('express');
var cors = require('cors');
const pool = require('./Config/db');
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
const applyMiddlewares = require('./Middleware');

applyMiddlewares(app);

// Import controllers
const homeController = require('./Controllers/home');
const loginController = require('./Controllers/login');
const ebookController = require('./Controllers/ebook');
const researcherController = require('./Controllers/researcher');
const activityController = require('./Controllers/activity');


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
