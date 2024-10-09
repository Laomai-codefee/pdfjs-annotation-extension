/* eslint-disable import/no-extraneous-dependencies */
const { merge } = require('webpack-merge');

const webpackConfiguration = require('../webpack.config');
const environment = require('./environment');

module.exports = merge(webpackConfiguration, {
  mode: 'development',

  /* Manage source maps generation process */
  devtool: 'eval-source-map',

  /* File watcher options */
  watchOptions: {
    aggregateTimeout: 100,
    poll: 100,
    ignored: /node_modules/,
  },

  /* Additional plugins configuration */
  plugins: [],
});
