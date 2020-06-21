/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:14
 * @LastEditTime: 2020-06-11 14:37:51
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\extension.js
 */ 
const vscode = require('vscode');
const weblogHelp = require('../src/weblogHelp');
const util = require('../src/util');
const SendProxy = require('../src/WebTool/SendProxy');



const code_dir = __dirname + '\\';//代码路径
const path = code_dir + 'WebTool\\lastRequests.json';
const options = {
	// 是否预览，默认true，预览的意思是下次再打开文件是否会替换当前文件
	preview: false,
	viewColumn: vscode.ViewColumn.Beside,//显示在旁边第二组
};

//vscode.window.showTextDocument(vscode.Uri.file(path), options);



// weblogHelp.search({}, (err,data)=>{
//     data=data
//     // SendProxy.ReSendByRow(data.rows.filter(r => r.Headers)[0], (str) =>{
//     //     debugger
//     //     util.showInfo(str)
//     // })
// });
/**
 * 插件被激活时触发，所有代码总入口
 * @param {*} context 插件上下文
 */
exports.activate = function(context) {
    console.log('恭喜，您的扩展“vscode-plugin-demo”已被激活！');
    console.log(vscode);
    // require('./helloword')(context); // helloworld
    // require('./test-command-params')(context); // 测试命令参数
    require('./test-menu-when')(context); // 测试菜单when命令
    // require('./jump-to-definition')(context); // 跳转到定义
    // require('./completion')(context); // 自动补全
    // require('./hover')(context); // 悬停提示
    // require('./WebJS/webview')(context); // Webview
    require('./WebJS/welcome')(context); // 欢迎提示
    require('./WebJS/showJson')(context); // 显示json的界面
    //require('./other')(context); // 其它杂七杂八演示代码

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