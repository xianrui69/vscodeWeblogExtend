/*
 * @Author: your name
 * @Date: 2020-05-22 14:38:51
 * @LastEditTime: 2020-07-01 15:17:28
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\test-menu-when.js
 */ 
const vscode = require('vscode');
const util = require('./util');

module.exports = function(context) {
    let oldApiUrl = '/api/';
    // 编辑器命令 
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.apiControllerJump', (textEditor, edit) => {
        const lineText = textEditor.document.lineAt(textEditor.selection.start.line).text
        //语言判断
        let curLanguageId = edit['_document'].languageId.toLowerCase();
        if (['aspnetcorerazor', 'javascript'].indexOf(curLanguageId) == -1){
            util.showInfo(`当前是${curLanguageId}语言调用的apiControllerJump`);
        }
        let curStr = util.String.findNearStr(lineText, textEditor.selection.start.character, ['"', "'", '`'], false) || '';
        let match = '\\/api\\/(.+?)\\/(.+?)';
        let _match = curStr.match(eval(`/^${match}$/i`));
        if (_match) {
            util.showBarMessage(`已匹配到api字符串${curStr}`, 5000)
        }else{
            _match = lineText.match(eval(`/[\'\"](${match})[\'\"]/i`))
            if (_match) {
                curStr = _match[1];
                util.showBarMessage(`已匹配到api字符串${curStr}`, 5000)
            }else{
                util.showInfo(`test当前行没有格式为 "/api/xxx/xx" 的字符串`);
                vscode.window.showInputBox({// 这个对象中所有参数都是可选参数
                    password:false, // 输入内容是否是密码
                    ignoreFocusOut:false, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
                    placeHolder:'需要跳转请输入api字符串', // 在输入框内的提示信息
                    prompt:'例如:/api/apply/get', // 在输入框下方的提示信息
                    value: oldApiUrl,
                    valueSelection: [0, oldApiUrl.length],
                    validateInput:function(text){// 对输入内容进行验证并返回
                        _match = text.match(eval(`/^${match}$/i`));
                        if (!_match){
                            return '请输入例如 /api/apply/get 格式的字符串'
                        }
                        return undefined;
                    }
                }).then(function(msg){
                    if(msg) {
                        oldApiUrl = msg;
                        util.Jump.ApiUrl(msg);
                    }
                });
                return;
            }
        }
        util.Jump.ApiUrl(curStr);
    }));
};