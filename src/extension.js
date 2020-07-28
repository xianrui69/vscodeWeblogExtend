/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:14
 * @LastEditTime: 2020-06-23 15:36:10
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\extension.js
 */ 
const vscode = require('vscode');

// const weblogHelp = require('../src/weblogHelp');
// weblogHelp.search({}, (err,data)=>{
//     data=data
//     debugger
// });
/**
 * 插件被激活时触发，所有代码总入口
 * @param {*} context 插件上下文
 */
exports.activate = function(context) {
    console.log('恭喜，您的扩展“vscode-plugin-demo”已被激活！');
    console.log(vscode);
    // require('./helloword')(context); // helloworld
    //require('./test-command-params')(context); // 测试命令参数
    require('../src/showWebLog')(context); // 菜单when命令 显示weblog
    require('../src/apiControllerJump')(context); // 跳转到api控制器的方法
    // require('./jump-to-definition')(context); // 跳转到定义
    // require('./completion')(context); // 自动补全
    require('../src/hover')(context); // 悬停提示
    // require('./WebJS/webview')(context); // Webview
    require('../src/WebJS/welcome')(context); // 欢迎提示
    require('../src/WebJS/showJson')(context); // 显示json的界面
    require('./other')(context); // 其它杂七杂八演示代码

    // const testFn = require('./test-require-function');
    // console.log(testFn); // vscode的日志输出不可靠，这里竟然会打印null？！ 对线类型不同吧？
    // testFn(1, 2);
    // 自动提示演示，在dependencies后面输入.会自动带出依赖
    // this.dependencies.
};

/**
 * 插件被释放时触发
 */
exports.deactivate = function() {
    console.log('您的扩展“vscode-plugin-demo”已被释放！')
};