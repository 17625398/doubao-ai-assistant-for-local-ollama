const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      background: './src/background/index.ts',
      'content-script': './src/content-script/index.ts',
      preinject: './src/preinject/index.ts',
      'side-panel': './src/side-panel/index.ts',
      popup: './src/popup/index.ts',
      options: './src/options/index.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@core': path.resolve(__dirname, '../core/src'),
      },
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'public/manifest.json', to: 'manifest.json' },
          { from: 'public/icons', to: 'icons' },
          { from: 'public/_locales', to: '_locales' },
        ],
      }),
      new HtmlPlugin({
        template: './src/side-panel/index.html',
        filename: 'side-panel.html',
        chunks: ['side-panel'],
      }),
      new HtmlPlugin({
        template: './src/popup/index.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),
      new HtmlPlugin({
        template: './src/options/index.html',
        filename: 'options.html',
        chunks: ['options'],
      }),
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: 'css/[name].css',
            }),
          ]
        : []),
    ],
    devtool: isProduction ? false : 'source-map',
  };
};
