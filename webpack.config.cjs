const path = require('path');

module.exports = {
  entry: './demo/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'demo/dist'),
  },
};