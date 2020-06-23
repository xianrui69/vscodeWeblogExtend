/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:14
 * @LastEditTime: 2020-06-23 16:26:04
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\view\custom-welcome.js
 */ 
let _vue = new Vue({
    el: '#app',
    data: {
        deep: 1,
        datas:{
        }
    },
    created(){
        callVscode({cmd: 'getData'}, (datas) =>{
            for (const key in datas) {
                if (datas.hasOwnProperty(key)) {
                    this.$set(this['datas'], key, datas[key]);
                }
            }
        });
    },
    components:{
         jsonView:window['vue-json-view'].default
    },
    watch: {
        datas: {
            handler(nv, _ov) {
                callVscode({cmd: 'dataChange', data: nv}, null);
            },
            deep: true
        }
    },
    methods: {
        alert(msg) {
            callVscode({cmd: 'alert', msg: msg}, null);
        },
        push(title, data) {
            this.$set(this['datas'], title, data);
            callVscode({cmd: 'dataChange', data: this['datas']}, null);
        },
        delete(title){
            this.$delete(this['datas'], title);
            callVscode({cmd: 'dataChange', data: this['datas']}, null);
        },
        clear(){
            for (const title in this['datas']) {
                this.$delete(this['datas'], title);
            }
            callVscode({cmd: 'dataChange', data: this['datas']}, null);
        }
    }
});
window.messageListener = function(message) {
    if (typeof(message) == 'object'){
        switch (message['action']) {
            case 'push':
                if(typeof(message['data']) == 'object'){
                    _vue.push(message['title'] || '新的json', message['data']);
                }
                break;
            case 'delete':
                if(typeof(message['title']) == 'string'){
                    message['title'] && _vue.delete(message['title']);
                }
                break;
            default:
                break;
        }
    }
}
console.log(new Date());