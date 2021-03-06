/*
 * @Author: your name
 * @Date: 2020-06-11 11:37:47
 * @LastEditTime: 2020-06-12 09:21:39
 * @LastEditors: Please set LastEditors
 * @Description: 消息监听转发器：把对api方法的调用 转发到钩子里面
 * @FilePath: \vscode-plugin-demo-master\src\view\MessageForwarding.js
 */
const vscode = acquireVsCodeApi();
console.log(vscode)
const callbacks = {};

/**
 * 调用vscode原生api
 * @param data 可以是类似 {cmd: 'xxx', param1: 'xxx'}，也可以直接是 cmd 字符串
 * @param cb 可选的回调函数
 */
function callVscode(data, cb) {
    if (typeof data === 'string') {
        data = { cmd: data };
    }
    if (cb) {
        // 时间戳加上5位随机数
        const cbid = Date.now() + '' + Math.round(Math.random() * 100000);
        callbacks[cbid] = cb;
        data.cbid = cbid;
    }
    vscode.postMessage(data);
}
window.addEventListener('message', event => {
    let message = event.data;
    if (message['0'])
        message = message['0']
    switch (message.cmd) {
        case 'vscodeCallback':
            console.log(message.data);
            (callbacks[message.cbid] || function () { })(message.data);
            delete callbacks[message.cbid];
            return
            break;
        default: break;
    }
    if (typeof(window['messageListener']) == 'function'){
        window['messageListener'](message)//如果存在另外的消息监听函数
    }
});