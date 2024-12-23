const bodyParserLibrary = require('body-parser');

const applyBodyParser = (app) => {
  app.use(bodyParserLibrary.json());
  app.use(bodyParserLibrary.urlencoded({ extended: true }));
};

module.exports = applyBodyParser;
