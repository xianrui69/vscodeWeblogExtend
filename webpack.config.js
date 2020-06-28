//@ts-check

'use strict';

const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');   //  引入html-webpack-plugin插件
// const fs = require('fs');
// var nodeModules = {vscode: 'commonjs vscode'};
// fs.readdirSync('node_modules')
//   .filter(function(x) {
//     return ['.bin'].indexOf(x) === -1;
//   })
//   .forEach(function(mod) {
//     nodeModules[mod] = 'commonjs ' + mod;
//   });
/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  node: {
    __dirname: false,
    __filename: false,
  },
  entry: './src/extension.js', // 入口 the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  cache: false,
  externals: {
    vscode: 'commonjs vscode',
    //sqlite3: 'sqlite3'
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    modules: [path.resolve('node_modules')], // 第三方模块我们只找当前目录的node_modules
  },
  module: {
    //noParse: /sqlite3/,  // 不去解析sqlite3中的依赖关系，
      rules: [{
        test: /\.css$/,  // 正则表达式，表示打包.css后缀的文件
        use: ['style-loader','css-loader']   // 针对css文件使用的loader，注意有先后顺序，数组项越靠后越先执行
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  // plugins: [   // 打包需要的各种插件
  //   new htmlWebpackPlugin({   // 打包HTML
  //   })
  // ],
};
module.exports = config;