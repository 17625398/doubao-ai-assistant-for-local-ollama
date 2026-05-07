const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      background: './src/background/index.ts',
      'content-script': './src/content-script/index.ts',
      'content-extractor': './src/content-extractor.content.ts',
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
          exclude: [
            /node_modules/,
            /playwright/,
            /chromium/,
          ],
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
        'node-fetch': false,
        'fetch-blob': false,
      },
      fallback: {
        'node:buffer': false,
        'node:fs': false,
        'node:https': false,
        'node:http': false,
        'node:net': false,
        'node:path': false,
        'node:process': false,
        'node:stream': false,
        'node:stream/web': false,
        'node:url': false,
        'node:util': false,
        'node:zlib': false,
        fs: false,
        path: false,
        child_process: false,
        os: false,
        util: false,
        stream: false,
        buffer: false,
        crypto: false,
        async_hooks: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
        dns: false,
        tty: false,
        url: false,
        assert: false,
        constants: false,
        process: false,
        http2: false,
        readline: false,
        inspector: false,
        electron: false,
      },
    },
    plugins: [
      // Ignore playwright-related modules (they only work in Node.js)
      new webpack.IgnorePlugin({
        resourceRegExp: /^playwright$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^playwright-core$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^chromium-bidi$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /playwright/,
      }),
      // Ignore node-fetch and fetch-blob in browser environment
      new webpack.IgnorePlugin({
        resourceRegExp: /^node-fetch$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^fetch-blob$/,
      }),
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
