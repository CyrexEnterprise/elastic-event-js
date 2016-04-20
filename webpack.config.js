var webpack = require('webpack');

module.exports = {
  entry: __dirname + '/elastic-event.js',
  output: {
    library: 'elasticevent',
    libraryTarget: 'umd',
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
