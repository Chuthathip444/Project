const corsLibrary = require('cors');

const applyCors = (app) => {
  app.use(corsLibrary());
};

module.exports = applyCors;
