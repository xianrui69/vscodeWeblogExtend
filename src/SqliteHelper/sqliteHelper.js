/*
 * @Author: your name
 * @Date: 2020-05-26 18:32:34
 * @LastEditTime: 2020-07-01 15:57:41
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\sqliteHelp.js
 */ 
 
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const sqliteHelp = {
    conn: '',
    _run(_arguments, callBack){
        if (typeof(callBack) !== 'function' || !this.conn) return
        if (typeof(_arguments[1]) !== 'object'){

        }
        else {
            let obj = {}
            for (const key in _arguments[1]) {
                if (_arguments[0].indexOf(key) !== -1) {
                    obj[key] = _arguments[1][key]
                }
            }
            _arguments[1] = obj
        }
        var _db = new sqlite3.Database(this.conn)
        if (typeof(_arguments[_arguments.length - 1]) === 'function') {
            let oldfunc = _arguments[_arguments.length - 1]
            _arguments[_arguments.length - 1] = function (){
                oldfunc.apply(this, arguments)
                _db.close()
            }
        }else _arguments.push(() => _db.close())
        callBack(_db, _arguments)
    },
    /**
     * 用法：get(sql,[param,...],[callback])。
     * 
     * 功能：运行指定参数的SQL语句，完成过后调用回调函数。如果执行成功，则回调函数中的第一个参数为null,第二个参数为结果集中的第一行数据，反之则回调函数中只有一个参数，只参数为一个错误的对象。
     */
    get(){
        this._run(arguments, (_db, _arguments) => {
            _db.get.apply(_db, _arguments)
        })
    },
    /**
     * 用法：all(sql,[param,...],[callback])。
     * 
     * 功能：运行指定参数的SQL语句，完成过后调用回调函数。如果执行成功，则回调函数中的第一个参数为null,第二个参数为查询的结果集，反之，则只有一个参数，且参数的值为一个错误的对象。
     */
    all(){
        this._run(arguments, (_db, _arguments) => {
            _db.all.apply(_db, _arguments)
        })
    },
    /**
     * 用法：run(sql,param,...],[callback])。
     * 
     * 功能：运行指定参数的SQL语句，完成之后调用回调函数，它不返回任何数据，在回调函数里面有一个参数，SQL语句执行成功，则参数的值为null,反之为一个错误的对象，它返回的是数据库的操作对象。在这个回调函数里面当中的this,里面包含有lastId(插入的ID)和change(操作影响的行数,如果执行SQL语句失败，则change的值永远为0)。
     */
    run(){
        this._run(arguments, (_db, _arguments) => {
            _db.run.apply(_db, _arguments)
        })
    },
    /**
     * 用法：prepare(sql,[param,...],[callback])。
     * 
     * 功能：预执行绑定指定参数的SQL语句，返回一个Statement对象，如果执行成功，则回调函数的第一个参数为null,反之为一个错误的对象。
     */
    prepare(){
        this._run(arguments, (_db, _arguments) => {
            _db.prepare.apply(_db, _arguments)
        })
    },
}

module.exports = function(conn){
    if (typeof(conn) !== 'string') return null
    if(!fs.existsSync(conn)){
        fs.openSync(conn, 'w');
    }
    sqliteHelp.conn = conn
    return sqliteHelp
}