/*
 * @Author: your name
 * @Date: 2020-06-10 10:37:51
 * @LastEditTime: 2020-06-23 17:24:02
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
const pythonHelper = {
    pythonVersionFile:{
        '2': 'Request_PY2.py',
        '3': 'Request.py',
    },
    pythonVersion: '',
    init(){
        exec(`python -V`, (error,stdout,stderr)=>{
            if(stderr.length >1||stdout.length>1){//返回值
                pythonHelper.pythonVersion = (stderr||stdout).split(' ')[1].split('.')[0];
            }else if(error){
                console.log('错误堆栈 : '+error)
            } else {
                console.log('没有输出');
            }
        });
    },
    getPythonFileName(){
        if (this.pythonVersionFile.hasOwnProperty(this.pythonVersion)){
            return this.pythonVersionFile[this.pythonVersion]
        }
        return ''//默认使用版本3
    }
}
pythonHelper.init();
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
    PythonFileName: null,
    getPythonFileName(callBack){
        let val = pythonHelper.getPythonFileName()
        if (!val)
            return setTimeout(() => this.getPythonFileName(callBack), 100);
        this.PythonFileName = val;
        callBack(val);
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
        if (!this.PythonFileName) return this.getPythonFileName(() => {
            this.ReSendByRow(row, callBack);
        });
        let pythonFileName = this.PythonFileName;
        let _data = this.getData(row)
        let jsonStr = JSON.stringify(_data);
        let fn = code_dir + 'lastRequests.json'
        fs.writeFile(fn, jsonStr, function (err) {
            if (err)
                util.showError('写文件错误')
        });//记录最后一次请求 方便调试
        fn = code_dir + 'requests_' + UUID.v1() + '.json'//产生唯一的文件 方便多文档读写
        fs.writeFile(fn, jsonStr, function(err) { 
            if (err) { 
                util.showError('写文件错误')//异常抛出
                return console.error(err);
            }
            let cmdStr = `python ${code_dir}${pythonFileName} ${fn}`
            exec(`python ${pythonFileName} ${fn.replace(code_dir, '')}`,{ cwd: __dirname, encoding: null}, function(error,stdout,stderr){
                setTimeout(() => {
                    fs.unlinkSync(fn);//删除请求的文件记录
                }, 20)
                cmdStr = cmdStr//用于看cmd执行的命令是什么样的
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
    },
    Send(data, callBack){
        if (typeof(callBack) != 'function'){
            util.showError('ReSendByRow调用必须传递 callback 函数类型')
            return;
        }
        if (!this.PythonFileName) return this.getPythonFileName(() => {
            this.Send(data, callBack);
        });
        let pythonFileName = this.PythonFileName;
        let jsonStr = JSON.stringify(data);
        let fn = code_dir + 'send_' + UUID.v1() + '.json'//产生唯一的文件 方便多文档读写
        fs.writeFile(fn, jsonStr, function(err) { 
            if (err) { 
                util.showError('写文件错误')//异常抛出
                return console.error(err);
            }
            let cmdStr = `python ${code_dir}${pythonFileName} ${fn}`
            exec(`python ${pythonFileName} ${fn.replace(code_dir, '')}`,{ cwd: __dirname, encoding: null}, function(error,stdout,stderr){
                setTimeout(() => {
                    fs.unlinkSync(fn);//删除请求的文件记录
                }, 120)
                cmdStr = cmdStr//用于看cmd执行的命令是什么样的
                let stdoutStr = iconv.decode(stdout, encoding)
                let stderrStr = iconv.decode(stderr, encoding)
                if(stdoutStr.length >1){//返回值
                    callBack(stdoutStr)
                }else if(error){
                    data = data
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


