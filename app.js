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
const applyMiddlewares = require('./Middleware');
const path = require('path');

// Middleware
applyMiddlewares(app);

app.use('/public', express.static(path.join(__dirname, 'public')));



// Import controllers
const homeController = require('./controllers/home');
const loginController = require('./controllers/login');
const ebookController = require('./controllers/ebook');
const activityController = require('./controllers/activity');
const researcherController = require('./controllers/researcher');
const researchController = require('./controllers/research');

// API
app.get('/', (req, res) => { res.redirect('/home'); });
app.use('/home', homeController); 
app.use('/login', loginController); 
app.use('/ebook', ebookController);
app.use('/researcher', researcherController);
app.use('/activity', activityController);
app.use('/research', researchController);

//server
const { createServer } = require('http');
const port = 3333;
const server = createServer(app);
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/home`);
});
