/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:14
 * @LastEditTime: 2020-05-22 10:37:39
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\view\custom-welcome.js
 */ 
const vscode = acquireVsCodeApi();
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
    const message = event.data;
    switch (message.cmd) {
        case 'vscodeCallback':
            console.log(message.data);
            (callbacks[message.cbid] || function () { })(message.data);
            delete callbacks[message.cbid];
            break;
        default: break;
    }
});

new Vue({
    el: '#app',
    data: {
        time: '',
        config: {},
        console: '',
        setTimeoutInt: -1,
    },
    mounted() {
        this.time = this.getTime();
        callVscode({cmd: 'getAllConfig', key: ''}, config => {
            this.config = config
        });
    },
    watch: {
        config: {
            handler(nv, _ov) {
                //this.alert('进入了config监听')
                clearTimeout(this.setTimeoutInt)
                this.setTimeoutInt = setTimeout(() => {
                    if (nv['_testArrAppend']) {
                        nv['testArr'].push(nv['_testArrAppend'])
                        nv['_testArrAppend']=''
                        return
                    }
                    if (this.console) {
                        let ov = JSON.parse(this.console);
                        this.console = JSON.stringify(nv)
                        for (const key in nv) {
                            if (ov && key[0] != '_' && nv[key] !== ov[key]) {
                                let ovType, nvType
                                if ((nvType = typeof(nv[key])) == (ovType = typeof(ov[key]))) {
                                    this.console = `setConfig, key: ${key}`
                                    callVscode({cmd: 'setConfig', key: key, value: nv[key]}, null);
                                }
                                else if(ov[key]){
                                    switch (ovType) {
                                        case 'object':
                                            if (Array.isArray(ov[key])) {
                                                if (nvType == 'string'){
                                                    if (nv[key][nv[key].length - 1] === ',') nv[key].length -= 1
                                                    if (nv[key] == ov[key].join(',')) return
                                                    nv[key] = nv[key].split(',');//美中不足数组元素类型不行
                                                }
                                            }
                                            break;
                                        default:
                                            //this.alert(`类型不一致,变迁已回滚！${key}:${ovType}_${ov[key]},${nvType}_${nv[key]}`)
                                            this.alert(`类型不一致,变迁已回滚！${key}:ov_${ov[key]},nv_${nv[key]}`)
                                            nv[key] = ov[key]
                                            break;
                                    }
                                }
                            }
                        }
                    }
                    this.console = JSON.stringify(nv)
                }, 550);//550毫秒无变化提交更新
            },
            deep: true
        },
    },
    methods: {
        alert(msg) {
            callVscode({cmd: 'alert', msg: msg}, null);
        },
        toggleShowTip() {
            this.show = !this.show;
        },
        getTime() {
            const hour = new Date().getHours();
            if (hour <= 8) return '早上';
            else if (hour < 12) return '上午';
            else if (hour < 14) return '中午';
            else if (hour < 18) return '下午';
            return '晚上';
        }
    }
});