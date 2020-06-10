/*
 * @Author: your name
 * @Date: 2020-06-10 10:37:51
 * @LastEditTime: 2020-06-10 14:24:52
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\webTool\sds.js
 */ 

const code_dir = __dirname + '\\';//代码路径
const exec = require('child_process').exec;
const iconv = require('iconv-lite');
const util = require('../util');
const fs = require('fs');
const UUID = require('uuid');
const encoding = 'utf-8';//默认命令行的编码格式应该是
module.exports = {
    /**
     * 返回一个url之类格式的东东
     * @param {*} webLogData sqlite里的一行数据
     */
    getData(webLogData){
        let arg1 = {
            Url: (webLogData.IsHttps === 0 ? 'http://':'https://') + webLogData.Path,
            Method: webLogData.Method,
            ContentType: webLogData.ContentType,
            Headers: webLogData.Headers,
            Query: webLogData.Query,
            Body: webLogData.Body,
        }
        return arg1
    },
    /**
     * 重发一个请求 根据一行
     * @param {*} row sqlite里的一行数据
     * @param {*} callBack 回掉函数 里面是一个请求返回的text
     */
    ReSendByRow(row, callBack) {
        if (typeof(callBack) != 'function'){
            util.showError('ReSendByRow调用必须传递 callback 函数类型')
            return;
        }
        let _data = this.getData(row)
        let jsonStr = JSON.stringify(_data);
        let fn = code_dir + 'lastRequests.json'
        fs.writeFile(fn, jsonStr, function (err) {
            if (err)
                util.showError('写文件错误')
        });//记录最后一次请求 方便调试
        fn = code_dir + 'requests' + UUID.v1() + '.json'//产生唯一的文件 方便多文档读写
        fs.writeFile(fn, jsonStr, function(err) { 
            if (err) { 
                util.showError('写文件错误')//异常抛出
                return console.error(err);
            }
            exec(`python ${code_dir}Request.py ${fn}`,{ encoding: null}, function(error,stdout,stderr){
                setTimeout(() => {
                    fs.unlinkSync(fn);//删除请求的文件记录
                }, 20)
                let stdoutStr = iconv.decode(stdout, encoding)
                let stderrStr = iconv.decode(stderr, encoding)
                if(stdoutStr.length >1){//返回值
                    callBack(stdoutStr)
                }else if(error){
                    _data = _data
                    debugger
                    callBack('错误堆栈 : '+stderrStr)
                } else {
                    callBack('')
                    console.log('没有输出');
                }
            });
        });
    }
}


