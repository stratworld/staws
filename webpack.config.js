const webpack = require('webpack');
const path = require('path');

module.exports = {
  target: 'node',
  entry: {
    httpConnection: './src/SubstrateImpl/httpConnectionSrc.js'
  },
  output: {
    path: path.resolve('./src/SubstrateImpl'),
    filename: './[name].js',
    library: 'strat-aws',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.IgnorePlugin(/^strat$/g)
  ],
};
