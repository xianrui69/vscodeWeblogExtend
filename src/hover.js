const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const util = require('./util');

module.exports = function(context) {
    let b = {
        /**
         * 鼠标悬停提示，当鼠标停在package.json的dependencies或者devDependencies时，
         * 自动显示对应包的名称、版本号和许可协议
         * @param {*} document 
         * @param {*} position 
         * @param {*} token 
         */
        provideHover(document, position, token) {
            return new Promise(resolve => {
                const fileName    = document.fileName;
                const workDir     = path.dirname(fileName);
                const word        = document.getText(document.getWordRangeAtPosition(position));

                let url = '/api/'
                //可以缓存这个路径不是一个控制器 更新时间
                let ControllerName = util.Document.isController(document);
                if (ControllerName){
                    url += ControllerName + '/';
                } else return;
                let _text = document.lineAt(position.line).text
                let _match = _text.match(/^\s+public.+\s+?(.+?)\((.+?)?\)/)
                if (!_match) {
                    return;
                }
                else{
                    url += _match[1]
                }
                setTimeout(() => {
                    resolve(new vscode.Hover(`* **名称**：${url}\n* **版本**：${1}\n* **许可协议**：${1}`));
                }, 100);//模拟一下异步
            });
        }
    };
    // 注册鼠标悬停提示 C#
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'csharp' }, b));
};