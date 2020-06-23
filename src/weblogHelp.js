/*
 * @Author: your name
 * @Date: 2020-05-19 10:13:14
 * @LastEditTime: 2020-06-12 11:35:27
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vscode-plugin-demo-master\src\extension.js
 */ 
const vscode = require('vscode');
const util = require('./util');
const fs = require('fs');
const sqliteHelp = require('./SqliteHelper/sqliteHelper');

const _this = {
    sqliteHelp: null,
    /**
     * 初始化 判断是否存在weblog.db文件
     */
    init() {
        let workPath = util.Path.getWebPath();
        if (workPath){
            if(fs.existsSync(workPath = (workPath + '\\weblog.db'))){
                this.sqliteHelp = sqliteHelp(workPath)
                util.showBarMessage('检测到拥有weblog.db，已激活weblog功能', 5000)
            }
        }
    },
    /**
     * 测试弹窗
     */
    test() {
        this.sqliteHelp.all(`select * from weblog  where
        ($BeginTime is null or $BeginTime='' or date>$BeginTime) limit $a,$b`, {$a:0,$b:2}
            ,function(err,rows){
                var str = JSON.stringify(rows);
                util.showBarMessage(str);
            }
        )
    },
    /**
     * 查询方法
     */
    search(searchLogInputDto, callBack) {
        typeof(callBack) !== 'function' && (callBack = () =>{})
        searchLogInputDto = searchLogInputDto || {}
        /**/
        const commandStr = `select * from weblog where
                            ($BeginTime is null or $BeginTime='' or date>$BeginTime) and
                            ($EndTime is null or $EndTime='' or date<$EndTime) and
                            ($Path='%%' or Path like $Path) and
                            ($ContentType='%%' or ContentType like $ContentType) and
                            ($Headers='%%' or Headers like $Headers) and
                            ($Query='%%' or Query like $Query) and
                            ($Body='%%' or Body like $Body) and
                            ($Data='%%' or Data like $Data) and
                            ($Message='%%' or Message like $Message) and
                            ($Success is null or $Success='' or Success=$Success) and 
                            1=1 `;//0-1000条
        let likes = ['Path', 'ContentType', 'Headers', 'Query', 'Body', 'Data', 'Message'];
        likes.forEach(e => {
            searchLogInputDto[e] = `%${searchLogInputDto[e] || ''}%`
        });
        // searchLogInputDto["BeginTime"] = searchLogInputDto.BeginTime;
        // searchLogInputDto["EndTime"] = searchLogInputDto.EndTime;
        // searchLogInputDto["Success"] = searchLogInputDto.Success;
        if (!searchLogInputDto.hasOwnProperty('CurrentPageIndex')) searchLogInputDto['CurrentPageIndex'] = 0
        if (!searchLogInputDto.hasOwnProperty('PageSize')) searchLogInputDto['PageSize'] = 20
        if (!searchLogInputDto.hasOwnProperty('OrderField')) searchLogInputDto['OrderField'] = 'date'
        if (!searchLogInputDto.hasOwnProperty('IsDesc')) searchLogInputDto['IsDesc'] = true
        const orderStr = `ORDER BY ${searchLogInputDto.OrderField} ${searchLogInputDto.IsDesc ? 'Desc': ''}
                        limit $Skip,$Take`;
        //页码处理
        searchLogInputDto['Skip'] = searchLogInputDto.CurrentPageIndex * searchLogInputDto.PageSize;
        searchLogInputDto['Take'] = searchLogInputDto.PageSize;
        var _searchLogInputDto = {}
        for (const key in searchLogInputDto) {
            _searchLogInputDto['$' + key] = searchLogInputDto[key]
        }
        /*连接完请关闭 */
        this.sqliteHelp.get(commandStr.replace('select *','select count(*)'), _searchLogInputDto,(err,row)=>{
            if (row){
                let totalStr = row['count(*)']
                this.sqliteHelp.all(commandStr + orderStr, _searchLogInputDto,(err,rows)=>{
                    let data = { total: parseInt(totalStr), rows: rows }
                    callBack(err, data)
                    util.showBarMessage('查询成功', 5000)
                })
            }else callBack(err)
        })
    }
};
_this.init();
module.exports = _this.sqliteHelp ? _this: {};
