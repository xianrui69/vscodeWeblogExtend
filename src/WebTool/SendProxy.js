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
const vscode = require('vscode');
const util = require('../util');
const fs = require('fs');
const UUID = require('uuid');

const encoding = {
    py: 'utf-8',
    cmdErr: 'cp936',//默认命令行的编码格式应该是 除非写注册表 否则命令行的编码就是他
}
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
     * 响应请求的基类 对响应进行一个通用的处理
     * @param {*} fileName 响应关联的文件 （通过文件名的方式与py交互的请求文件）
     * @param {*} stdout 响应 输出 （python的打印）
     * @param {*} stderr 错误信息
     * @param {*} error 错误
     * @param {*} callBack 回调函数 
     * @param {*} cmdStr 易读性的参数 可以直接看到cmd命令
     * @param {*} data 易读性的参数 可以直接看到请求的内容是什么
     */
    _baseResponse(fileName, stdout, stderr, error, callBack, cmdStr, data){
            setTimeout(() => {
                fs.unlink(fileName, ()=>{});//删除请求的文件记录
            }, 120)
            cmdStr = cmdStr//用于看cmd执行的命令是什么样的
            let stdoutStr = iconv.decode(stdout, encoding.py)
            let stderrStr = iconv.decode(stderr, encoding.cmdErr)
            if(stdoutStr.length >1){//返回值
                callBack(stdoutStr)
            }else if(error){
                let errMsgs = ['由于目标计算机积极拒绝，无法连接', '身份验证错误'];
                let _result = {
                    "success": false,
                    "message": errMsgs.filter(e => stderrStr.indexOf(e) != -1).join(',')
                        || stderrStr,
                    "data": stderrStr
                };
                setTimeout(() => {
                    vscode.window.showInformationMessage('请求失败：' + _result.message);
                    //util.showInfo('请求失败：' + _result.message);//子线程里面无法调用util 暂时还不知道是怎么回事
                }, 100);
                callBack(JSON.stringify(_result));
            } else {
                callBack('')
                console.log('没有输出');
            }
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
        fs.writeFile(fn, jsonStr, (err)  => { 
            if (err) { 
                util.showError('写文件错误')//异常抛出
                return console.error(err);
            }
            let cmdStr = `python ${code_dir}${pythonFileName} ${fn}`
            exec(`python ${pythonFileName} ${fn.replace(code_dir, '')}`,{ cwd: __dirname, encoding: null}, (error,stdout,stderr) =>
                this._baseResponse(fn, stdout, stderr, error, callBack, cmdStr, _data)
            );
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
        fs.writeFile(fn, jsonStr, (err) => { 
            if (err) { 
                util.showError('写文件错误')//异常抛出
                return console.error(err);
            }
            let cmdStr = `python ${code_dir}${pythonFileName} ${fn}`
            exec(`python ${pythonFileName} ${fn.replace(code_dir, '')}`,{ cwd: __dirname, encoding: null}, (error,stdout,stderr) =>
                this._baseResponse(fn, stdout, stderr, error, callBack, cmdStr, data)
            );
        });
    }
}


