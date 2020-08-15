#coding=utf-8
import sys,os,types
reload(sys)
sys.setdefaultencoding('UTF-8')
reload(sys)
#字典中的键 大小忽略 并转换成数组中的键
def keysToTarget(dict, arr):
    for pn in arr:
        for x in dict.keys():
            if x != pn and x.lower() == pn.lower():
                #忽略大小写
                dict[pn] = dict.pop(x)
class WebLogDb():
    def __init__(self, connStr):
        if type(connStr) != types.StringType or len(connStr) == 0:
            self.initState = False
        elif not os.path.exists(connStr):
            self.initState = False
        else:
            self.initState = True
    def searchTop(self, _obj):
        _obj['PageSize'] = 1
        result = self.search(_obj)
        if result[1][0]['count'] == 0:
            return None
        else:
            return result[0][0]
    def search(self, _obj):
        if not self.initState:
            print('inin Error!')
            return
        likes = ['Path', 'ContentType', 'Headers', 'Query', 'Body', 'Data', 'Message'];
        eqs = ['BeginTime', 'EndTime', 'Success']
        others = ['CurrentPageIndex', 'PageSize', 'OrderField', 'IsDesc', 'Id']
        #字典忽略大小写
        keysToTarget(_obj, likes + eqs + others)
        for pn in likes + eqs:
            if pn not in _obj: _obj[pn] = ''
        for pn in likes:
            _obj[pn] = '%' + _obj[pn] + '%'
        if 'CurrentPageIndex' not in _obj: _obj['CurrentPageIndex'] = 0
        else: _obj['CurrentPageIndex'] = int(_obj['CurrentPageIndex'])
        if 'PageSize' not in _obj: _obj['PageSize'] = 20
        else: _obj['PageSize'] = int(_obj['PageSize'])
        if 'OrderField' not in _obj: _obj['OrderField'] = 'id'
        if 'IsDesc' not in _obj: _obj['IsDesc'] = True
        if 'Id' not in _obj: _obj['Id'] = ''
        if _obj['IsDesc']: _obj['DescStr'] = 'desc'
        else: _obj['DescStr'] = ''
        #页码处理
        _obj['Skip'] = _obj['CurrentPageIndex'] * _obj['PageSize']
        _obj['Take'] = _obj['PageSize']
        #需要防止sql注入
        sql = '''
            select * from weblog where
                (:BeginTime is null or :BeginTime='' or date>:BeginTime) and
                (:EndTime is null or :EndTime='' or date<:EndTime) and
                (:Path='%%%%' or Path like :Path) and
                (:ContentType='%%%%' or ContentType like :ContentType) and
                (:Headers='%%%%' or Headers like :Headers) and
                (:Query='%%%%' or Query like :Query) and
                (:Body='%%%%' or Body like :Body) and
                (:Data='%%%%' or Data like :Data) and
                (:Message='%%%%' or Message like :Message) and
                (:Success is null or :Success='' or Success=:Success) and 
                (:Id is null or :Id='' or Id=:Id) and 
                1=1'''%_obj
        #print(_obj)
        total = self.execSql(sql.replace('select *', 'select count(1) count'), _obj)
        rows = self.execSql(sql + '''
                ORDER BY %(OrderField)s %(DescStr)s
                limit %(Skip)s,%(Take)s'''%_obj, _obj)
        return (rows, total)

    #可以改出 self出来
    def execSql(self, sql, _obj):
        import sqlite3
        conn = sqlite3.connect(_obj['dbFilePath'])
        conn.text_factory = str
        c = conn.cursor()
        cursor = c.execute(sql, _obj)
        columns_tuple = cursor.description
        columns_list = [field_tuple[0] for field_tuple in columns_tuple]
        rows = []
        for row in cursor.fetchall():
            _row = {}
            rows.append(_row)
            _idx = 0
            for filed in columns_list:
                _row[filed] = row[_idx]
                if type(_row[filed]) == types.UnicodeType:
                    _row[filed] = _row[filed].encode('utf-8')
                _idx = _idx + 1
        conn.close()
        return rows