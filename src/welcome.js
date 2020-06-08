/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:15
 * @LastEditTime: 2020-05-22 10:35:01
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\welcome.js
 */ 
const vscode = require('vscode');
const util = require('./util');
const fs = require('fs');
const path = require('path');

const myName = 'vscodePluginDemo';//插件名

/**
 * 从某个HTML文件读取能被Webview加载的HTML内容
 * @param {*} context 上下文
 * @param {*} templatePath 相对于插件根目录的html文件相对路径
 */
function getWebViewContent(context, templatePath) {
    const resourcePath = util.getExtensionFileAbsolutePath(context, templatePath);
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, 'utf-8');
    // vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
        return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
    });
    return html;
}

/**
 * 执行回调函数
 * @param {*} panel 
 * @param {*} message 
 * @param {*} resp 
 */
function invokeCallback(panel, message, resp) {
    console.log('回调消息：', resp);
    // 错误码在400-600之间的，默认弹出错误提示
    if (typeof resp == 'object' && resp.code && resp.code >= 400 && resp.code < 600) {
        util.showError(resp.message || '发生未知错误！');
    }
    panel.webview.postMessage({cmd: 'vscodeCallback', cbid: message.cbid, data: resp});
}

/**
 * 存放所有消息回调函数，根据 message.cmd 来决定调用哪个方法
 */
const messageHandler = {
    config: null,
    alert(global, message) {
        util.showInfo(message.msg);
    },
    getAllConfig(global, message) {
        let test = vscode.workspace.getConfiguration()[myName];
        let obj = {}
        for (const key in test) {
            obj[//myName+'.'+
                key] = test[key]
        }
        if (obj.hasOwnProperty('_key'))
            util.showInfo('请勿使用配置名‘_key’，已经自动覆盖它了！');
        obj['_key'] = myName;
        this.config = obj
        invokeCallback(global.panel, message, obj);
    },
    getConfig(global, message) {
        const result = vscode.workspace.getConfiguration().get(myName+'.'+message.key);
        invokeCallback(global.panel, message, result);
    },
    setConfig(global, message) {
        if (this.config && !this.config.hasOwnProperty(message.key)){
            return//没有这个属性
        }
        // 写入配置文件，注意，默认写入工作区配置，而不是用户配置，最后一个true表示写入全局用户配置
        vscode.workspace.getConfiguration().update(myName+'.'+message.key, message.value, true);
        util.showInfo(`修改配置${message.key}成功！${new Date().format('hh:mm:ss')}`);
    }
};
Date.prototype.format = function(fmt) { 
    var o = { 
       "M+" : this.getMonth()+1,                 //月份 
       "d+" : this.getDate(),                    //日 
       "h+" : this.getHours(),                   //小时 
       "m+" : this.getMinutes(),                 //分 
       "s+" : this.getSeconds(),                 //秒 
       "q+" : Math.floor((this.getMonth()+3)/3), //季度 
       "S"  : this.getMilliseconds()             //毫秒 
   }; 
   if(/(y+)/.test(fmt)) {
           fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
   }
    for(var k in o) {
       if(new RegExp("("+ k +")").test(fmt)){
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
        }
    }
   return fmt; 
}
module.exports = function(context) {

    context.subscriptions.push(vscode.commands.registerCommand('extension.demo.showWelcome', function (uri) {
        const panel = vscode.window.createWebviewPanel(
            'testWelcome', // viewType
            "自定义欢迎页", // 视图标题
            vscode.ViewColumn.One, // 显示在编辑器的哪个部位
            {
                enableScripts: true, // 启用JS，默认禁用
            }
        );
        let global = { panel};
        panel.webview.html = getWebViewContent(context, 'src/view/custom-welcome.html');
        panel.webview.onDidReceiveMessage(message => {
            if (messageHandler[message.cmd]) {
                messageHandler[message.cmd](global, message);
            } else {
                util.showError(`未找到名为 ${message.cmd} 回调方法!`);
            }
        }, undefined, context.subscriptions);
    }));

    const key = 'vscodePluginDemo.showTip';
    // 如果设置里面开启了欢迎页显示，启动欢迎页
    if (vscode.workspace.getConfiguration().get(key)) {
        vscode.commands.executeCommand('extension.demo.showWelcome');
    }
};
