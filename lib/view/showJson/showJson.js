/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:14
 * @LastEditTime: 2020-06-23 17:29:53
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\view\custom-welcome.js
 */ 
let _vue = new Vue({
    el: '#app',
    data: {
        deep: 1,
        desc: true,
        datas:{
        },
        theme: 'one-dark',//可选主题样式,可选值为one-dark、vs-code，不选时为默认的白色主题
        closed: false,
        fontSize: 14,
        lineHeight: 24,
        /*
       属性	说明	类型	默认值
json	传入的json数据（必填）	Object	-
closed	是否折叠全部	Boolean	false
deep	展开深度,越大渲染速度越慢,建议不超过5	Number	3
icon-style	折叠按钮样式，可选值为square、circle、triangle	String	square
icon-color	两个折叠按钮的颜色	Array	theme=vs-code时，['#c6c6c6', '#c6c6c6']，其他情况为['#747983', '#747983']
theme	可选主题样式,可选值为one-dark、vs-code，不选时为默认的白色主题	String	-
font-size	字体大小,单位px	Number	14
line-height	行高，单位px	Number	24
         */
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
        },
        refresh(){
            callVscode({cmd: 'getData'}, (datas) =>{
                for (const key in datas) {
                    if (datas.hasOwnProperty(key)) {
                        this.$set(this['datas'], key, datas[key]);
                    }
                }
            });
        }
    }
});
window.messageListener = function(message) {
    if (typeof(message) == 'object'){
        switch (message['action']) {
            case 'push':
                if(typeof(message['data']) == 'object'){
                    _vue.push(message['title'] || '??json', message['data']);
                }
                break;
            case 'delete':
                if(typeof(message['title']) == 'string'){
                    message['title'] && _vue.delete(message['title']);
                }
                break;
            case 'refresh':
                _vue.refresh();
                break;
            default:
                break;
        }
    }
}