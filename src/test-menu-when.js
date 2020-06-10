/*
 * @Author: your name
 * @Date: 2020-05-22 14:38:51
 * @LastEditTime: 2020-06-10 11:57:47
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\test-menu-when.js
 */ 
const vscode = require('vscode');
const util = require('./util');
const weblogHelp = require('./weblogHelp');
const SendProxy = require('./WebTool/SendProxy');
module.exports = function(context) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.demo.testMenuShow', () => {
        util.showInfo(`你点我干啥，我长得很帅吗？`);
    }));
    let webLogOutChannel = vscode.window.createOutputChannel('最近一次调用');
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
                        select == '是' && SendProxy.ReSendByRow(firstData, (str) =>{
                            util.showInfo(str)//请求的重发
                        })
                    });
                    let _str = JSON.stringify(firstData, null, 2)
                    webLogOutChannel.clear()
                    webLogOutChannel.show(true)
                    webLogOutChannel.appendLine(_str)
                    webLogOutChannel.appendLine(url)
                    //可以添加请求的重发
                } catch (error) {
                    
                }
                
            }
        });
    }));
};