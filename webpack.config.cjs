const path = require('path');

module.exports = {
  entry: './test/manual/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'test/manual/dist'),
  },
};