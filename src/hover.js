/*
 * @Author: your name
 * @Date: 2020-05-22 14:38:51
 * @LastEditTime: 2020-06-24 09:58:29
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode\src\hover.js
 */ 
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
                    if (word != _match[1]) return;
                    url += _match[1]
                }
                setTimeout(() => {
                    let hosts = {
                        '本地': 'http://localhost:9076',
                        '内网-hz': 'http://192.168.30.9:9076',
                        '内网-kh': 'http://192.168.40.2:9076',
                        '外网-hz': 'http://hannao.gicp.net:9076',
                        '外网-kh': 'http://36.26.51.30:9076',
                    };
                    let heads = [];
                    let rows = {
                        '[网址]({0}{1})': [],
                        '[日志]({0}/weblog/WebLogIndxe?uri={1})': [],
                    };
                    for (const key in hosts) {
                        heads.push(key)
                        const _url = hosts[key];
                        for (const fmt in rows) {
                            let str = fmt.replace('{0}', _url).replace('{1}', url);
                            rows[fmt].push(str);
                        }
                    }
                    //得到第一、二排
                    let tabTxtArr = [
                        heads.map(h => `| ${h} `).join(''),
                        heads.map(h => `| - `).join('')
                    ];
                    for (const fmt in rows)//得到每个row
                        tabTxtArr.push(rows[fmt].map(h => `| ${h} `).join(''));
                    let tabTxt = tabTxtArr.join(`|
`);
                    resolve(new vscode.Hover(
`**${url}** 

${tabTxt}`));//支持动图  ![一个测试动图](https://image.zhangxinxu.com/image/blog/201912/flex-demo-s.gif)
                    /* 他使用的markdown解析语法 */
                }, 100);//模拟一下异步
            });
        }
    };
    // 注册鼠标悬停提示 C#
    context.subscriptions.push(vscode.languages.registerHoverProvider(
        [{ 
            scheme: 'file', language: 'csharp',
            //文件位置匹配 位于这个目录下的子目录（子子目录也行） 不忽略大小写
            pattern: '**/ApiControllers/**'
        }]
        , b));
};