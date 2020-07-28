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
const weblogHelp = require('./weblogHelp');
const SendProxy = require('./WebTool/SendProxy');

let token = '';
util.Web.loadToken((_token) => {
    token = _token
});

module.exports = function(context) {
    let webLogOutChannel = vscode.window.createOutputChannel('最后一次调用');
    let reSendOutChannel = vscode.window.createOutputChannel('重发');
    /**
     * 根据url 匹配path 然后显示最后的log
     * @param {*} url url地址 模糊匹配
     * @param {*} PageSize 显示几条 默认一条
     */
    const byUrlShowLog = (url, PageSize = 1) =>{
        /**
         * 序列化所有的子对象
         */
        const getData = (data) =>{
            let _data = {}
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    try {
                        _data[key] = JSON.parse(data[key])
                    } catch (error) {
                        _data[key] = data[key]
                    }
                }
            }
            return _data;
        }
        weblogHelp.search({Path: url, PageSize: PageSize}, (err,data)=>{
            //data.total 数量 .rows 所有的行
            if (data.total == 0){
                util.showInfo(`方法 ${url}：调用次数为0`);
                return
            }else{//弹出最近一次调用
                try {
                    let firstData = data.rows[0];
                    vscode.window.showInformationMessage("是否照这个log请求一次",'是','否')
                    .then(function(select){
                        if (select == '是'){
                            if (token){
                                firstData.Headers = JSON.parse(firstData.Headers)
                                if (Array.isArray(firstData.Headers['Cookie']) && firstData.Headers['Cookie'].length > 0) {
                                    let regs = [/ck_token=(.+?)$/, /ck_token=(.+?);/]
                                    regs.forEach(_reg =>{
                                        let _match = firstData.Headers['Cookie'][0].match(_reg);
                                        if (_match && _match.length > 1){
                                            let str = _match[0].replace(_match[1], token)
                                            //把匹配到的token字符串 替换里面的token
                                            firstData.Headers['Cookie'][0] = firstData.Headers['Cookie'][0].replace(_match[0], str);
                                        }
                                    })
                                }
                                firstData.Headers = JSON.stringify(firstData.Headers)
                            }
                            SendProxy.ReSendByRow(firstData, (str) =>{
                                //reSendOutChannel.clear()
                                //reSendOutChannel.show(true)
                                try {
                                    let _data = JSON.parse(str)
                                    if (_data['message'] == '身份验证错误') util.Web.loadToken((_token) =>{
                                        token = _token;
                                    }, true);//重载token
                                    util.Web.showJson(getData(_data), url + '的重发结果');
                                    reSendOutChannel.appendLine(JSON.stringify(_data, null, 2))//请求的重发
                                } catch (error) {
                                    reSendOutChannel.appendLine(str)//请求的重发
                                }
                                reSendOutChannel.appendLine(url)
                            })
                        }
                    });
                    util.Web.showJson(getData(firstData), url + '的最后一次调用');
                    let _str = JSON.stringify(firstData, null, 2)
                    //webLogOutChannel.clear()
                    //webLogOutChannel.show(true)
                    webLogOutChannel.appendLine(_str)
                    webLogOutChannel.appendLine(url)
                    //可以添加请求的重发
                } catch (error) {
                    
                }
                
            }
        });
    }
    // 编辑器命令 
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.showLastWebLog', function(textEditor, edit, ...args) {
        console.log(util.Document['hoverPosition']);
        if (util.Document['hoverPosition']){
            let ivs = (new Date() - util.Document['hoverPosition']['date']) / 1000;
            console.log(ivs);
        }
            
        let url = '/api/';
        //可以缓存这个路径不是一个控制器 更新时间
        let ControllerName = util.Document.isController(textEditor.document);
        if (ControllerName){
            url += ControllerName + '/';
        }
        if (!ControllerName){
            util.showInfo(`当前不在api控制器内！`);
            return
        }
        const selStr = textEditor.document.getText(textEditor.selection);
        const lineText = textEditor.document.lineAt(textEditor.selection.start.line).text
        let curStr = util.String.findNearStr(lineText, textEditor.selection.start.character)
        if (curStr.length > 1){
            if (curStr[0] != ' ' || curStr[curStr.length - 1] != '('){
                util.showInfo(`${curStr}不是一个方法名`);
                return
            }
            curStr = curStr.substring(1, curStr.length - 1);
        } else{
            util.showBarMessage('向当前行之上寻找方法', 5000);
            (() =>{
                let _lineIdx = textEditor.selection.start.line
                while (_lineIdx >= 0) {
                    let _text = textEditor.document.lineAt(_lineIdx).text
                    let _match = _text.match(/^\s+public.+\s+?(.+?)\((.+?)?\)/)
                    if (!_match) _lineIdx--
                    else{
                        curStr = _match[1]
                        util.showBarMessage(`已匹配到方法${curStr}`, 5000)
                        break
                    }
                }
            })();//匹配方法名
        }
        if (!curStr) return
        url += curStr
        byUrlShowLog(url);
    }));
    
    // 编辑器命令 hover的方式触发
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.showLastWebLog_hover', function(textEditor, edit, ...args) {
        if (!util.Document['hoverPosition']) return;
        let url = '/api/';
        //可以缓存这个路径不是一个控制器 更新时间
        let ControllerName = util.Document.isController(textEditor.document);
        if (ControllerName){
            url += ControllerName + '/';
        }
        if (!ControllerName) {
            util.showInfo(`当前不在api控制器内！`);
            return
        }
        console.log(util.Document['hoverPosition'])
        let curStr = util.Document['hoverPosition']['word'];
        if (!curStr) {
            util.showInfo(`hover异常 请检查！`);
            return
        }
        url += curStr
        byUrlShowLog(url);
    }));
};