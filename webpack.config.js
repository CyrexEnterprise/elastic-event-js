var webpack = require('webpack');

module.exports = {
  entry: __dirname + '/elastic-event.js',
  devtool: 'source-map',
  output: {
    library: 'ElasticEvent',
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
