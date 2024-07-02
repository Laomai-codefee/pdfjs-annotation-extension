const path = require('path');
const { output } = require('../webpack.config');

module.exports = {
  paths: {
    /* Path to source files directory */
    source: path.resolve(__dirname, '../src/'),
    /* Path to built files directory */
    output: path.resolve(__dirname, '../examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension'),
  }
};
