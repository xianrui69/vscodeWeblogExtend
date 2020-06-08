const vscode = require('vscode');
module.exports = function(context) {
    // 注册HelloWord命令
    context.subscriptions.push(vscode.commands.registerCommand('extension.sayHello', () => {
        vscode.window.setStatusBarMessage('Hello World！状态栏', 5000);//支持多少秒后释放
        vscode.window.showInformationMessage('Hello World！弹窗！')//不支持
    }));
};