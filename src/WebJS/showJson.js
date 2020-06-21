/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:15
 * @LastEditTime: 2020-06-12 10:43:56
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\welcome.js
 */ 
const vscode = require('vscode');
const util = require('../util');
const fs = require('fs');
const path = require('path');

/**
 * 存放所有消息回调函数，根据 message.cmd 来决定调用哪个方法
 */
const messageHandler = {
    /**
     * 执行回调函数
     * @param {*} panel 
     * @param {*} message 
     * @param {*} resp 
     */
    data: null,
    invokeCallback(panel, message, resp) {
        console.log('回调消息：', resp);
        // 错误码在400-600之间的，默认弹出错误提示
        if (typeof resp == 'object' && resp.code && resp.code >= 400 && resp.code < 600) {
            util.showError(resp.message || '发生未知错误！');
        }
        panel.webview.postMessage({cmd: 'vscodeCallback', cbid: message.cbid, data: resp});
    },
    alert(global, message) {
        util.showInfo(message.msg);
    },
    dataChange(global, message) {
        if (message['data']) this.data = message['data']
    },
    getData(global, message) {
        this.invokeCallback(global.panel, message, this.data);
    },
};
module.exports = function(context) {
    function createPanel() {
        let panel = vscode.window.createWebviewPanel(
            'showJson', // viewType
            "JSON展示", // 视图标题
            vscode.ViewColumn.One, // 显示在编辑器的哪个部位
            {
                enableScripts: true, // 启用JS，默认禁用
            }
        );
        let global = { panel};
        
        panel.webview.html = util.Web.getWebViewContent(context, 'src/view/showJson/showJson.html');
        panel.webview.onDidReceiveMessage(message => {
            if (messageHandler[message.cmd]) {
                messageHandler[message.cmd](global, message);
            } else {
                util.showError(`未找到名为 ${message.cmd} 回调方法!`);
            }
        }, undefined, context.subscriptions);
        return panel
    }
    let panel
    context.subscriptions.push(vscode.commands.registerCommand('extension.demo.showJson', function () {
        if (!panel){//不存在时则创建
            panel = createPanel()
            panel.onDidDispose(() =>{
                panel = null
            })
        }
        let _arguments = arguments;
        if (_arguments.length > 0)//发消息给页面
            {
                if (false && messageHandler.data == null){
                    messageHandler.data = messageHandler.data || {};
                    messageHandler.data[_arguments[0]['title']] = _arguments[0]['data'] || {};
                }
                setTimeout(() => {
                    panel.webview.postMessage(_arguments);
                }, 300);
            }
    }));
    
    // 编辑器命令 
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.weblog', (textEditor, edit) => {
        vscode.window.createWebviewPanel(
            'weblog', // viewType
            "weblog", // 视图标题
            vscode.ViewColumn.One, // 显示在编辑器的哪个部位
            {
                enableScripts: true, // 启用JS，默认禁用
            }
        );
        panel.webview.html = util.Web.getWebViewContent(context, 'src/view/showJson/showJson.html');
        panel.webview.onDidReceiveMessage(message => {
            if (messageHandler[message.cmd]) {
                messageHandler[message.cmd](global, message);
            } else {
                util.showError(`未找到名为 ${message.cmd} 回调方法!`);
            }
        }, undefined, context.subscriptions);
    }));
};
