const applyBodyParser = require('./bodyParser');
const applyCors = require('./cors');

const applyMiddlewares = (app) => {
  applyBodyParser(app);
  applyCors(app);
};

module.exports = applyMiddlewares;
