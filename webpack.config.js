var webpack = require('webpack');

module.exports = {
  entry: __dirname + '/elastic-event.js',
  output: {
    path: __dirname + '/dist',
    filename: 'elastic-event.min.js'
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        warnings: false
      }
    })
  ]
};
