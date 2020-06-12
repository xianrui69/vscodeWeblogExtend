/*
 * @Author: your name
 * @Date: 2020-05-22 14:38:51
 * @LastEditTime: 2020-06-12 11:37:29
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\test-menu-when.js
 */ 
const vscode = require('vscode');
const util = require('./util');
const weblogHelp = require('./weblogHelp');
const SendProxy = require('./WebTool/SendProxy');
let token = '';
function loadToken(){
    let myName = 'vscodePluginDemo';//插件名
    let configs = vscode.workspace.getConfiguration()[myName];
    SendProxy.Send({
        Url: configs['autoUrl'] + '/api/App/CheckLogin4App',
        Method: 'GET',
        Query: `?credential=${configs['autoUserNo']}&password=${configs['autoPWD']}`,
    }, (data) => {
        data = JSON.parse(data)
        token = data.data.token
    });
};
loadToken();
module.exports = function(context) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.demo.testMenuShow', () => {
        util.showInfo(`你点我干啥，我长得很帅吗？`);
    }));
    let webLogOutChannel = vscode.window.createOutputChannel('最后一次调用');
    let reSendOutChannel = vscode.window.createOutputChannel('重发');
    // 编辑器命令 
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.showLastWebLog', (textEditor, edit) => {
        let url = '/api/'
        //可以缓存这个路径不是一个控制器 更新时间
        //判断api控制器
        let _lineIdx = 0, isFind = false
        while (_lineIdx < textEditor.document.lineCount && !isFind) {
            let _match = textEditor.document.lineAt(_lineIdx).text.match(/^\s+public\s+class\s+(\w+?)Controller/)
            if (_match){
                isFind = true
                url += _match[1] + '/'
                break
            }
            _lineIdx+=1
        }
        if (!isFind){
            util.showInfo(`当前不在api控制器内！`);
            return
        }
        const selStr = textEditor.document.getText(textEditor.selection)
        const lineText = textEditor.document.lineAt(textEditor.selection.start.line).text
        let charts = []
        let leftIdx = textEditor.selection.start.character
        let rightIdx = leftIdx
        const getChar = (idx) => 
            idx < lineText.length && idx >= 0? lineText[idx]: '';
        const isEnd = (_char) => [' ', '('].indexOf(_char) !== -1;
        const isError = (_char) => ['', '.', '<', '>', ')'].indexOf(_char) !== -1;
        while (leftIdx != -1 || rightIdx != -1) {
            let _char = ''
            if (leftIdx != -1){
                //左边寻找
                _char = getChar(leftIdx)
                if(isEnd(_char)) {
                    charts[leftIdx] = _char
                    leftIdx = -1//直接终止
                }
                else if(isError(_char)) {//不应该出现的字符出现了
                    charts = []
                    //util.showInfo(`请选择一个方法名，而不是其他内容`);
                    break
                }
                else {
                    charts[leftIdx] = _char
                    leftIdx -= 1
                }
            }
            if (rightIdx != -1){
                //右边寻找
                _char = getChar(rightIdx)
                if(isEnd(_char)) {
                    charts[rightIdx] = _char
                    rightIdx = -1//直接终止
                }
                else if(isError(_char)) {//不应该出现的字符出现了
                    //vscode.window.showInformationMessage(`请选择一个方法名，而不是其他内容`);
                    charts = []
                    break
                }
                else {
                    charts[rightIdx] = _char
                    rightIdx += 1
                }
            }
        }
        let curStr = ''
        
        if (charts.filter(c => c).length > 1){
            curStr = charts.filter(c => c).join('')
            if (curStr[0] != ' ' || curStr[curStr.length - 1] != '('){
                vscode.window.showInformationMessage(`${curStr}不是一个方法名`);
                return
            }
            curStr = curStr.substring(1, curStr.length - 1);
        } else{
            //^\s+public.+?\s+?(.+?)\(.+?\)
            util.showBarMessage('向当前行之上寻找方法', 5000)
            _lineIdx = textEditor.selection.start.line
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
        }
        if (!curStr) return
        url += curStr
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
        weblogHelp.search({Path: url, PageSize: 1}, (err,data)=>{
            //data.total 数量 .rows 所有的行
            if (data.total == 0){
                util.showInfo(`方法 ${url}：调用次数为0`);
                return
            }else{//弹出最近一次调用
                try {
                    let firstData = data.rows[0]
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
    }));
};