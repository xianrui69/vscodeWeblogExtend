#coding=utf-8
import sys,types
from WebLogDb_PY2 import *
from Request_PY2 import *
reload(sys)
sys.setdefaultencoding('UTF-8')
reload(sys)

def parseStr(_str, targetEncodeing=None):
    _val = ''
    for e in ['utf-8', 'cp936', 'gbk', 'raw_unicode_escape', 'unicode_escape']:
        if _val != '':
            break
        try:
            _val = _str.decode(e)
        except  BaseException as identifier:
            _val = ''
    if type(targetEncodeing) == types.StringType:
        _val = _val.encode(targetEncodeing)
    return str(_val)
def handP(str):
    #判断数据类型 不符合正则的直接返回空 否则 返回 k v 格式
    if type(str) != types.StringType or str.strip()[0] != '-' or str.strip().index('=') == -1:
        return None
    else:
        str = str.strip()
        return str[1:].split('=')

#测试下 参数 exe
sysArgvLen = len(sys.argv)
obj = None
connStr = ''
needArgs = ['dbFilePath']
if sysArgvLen > 1:
    obj = {}
    for idx in range(1, sysArgvLen):
        #0 是运行路径
        arr = handP(sys.argv[idx]);
        if arr != None:
            obj[arr[0]] = parseStr(arr[1], 'utf-8')
    #字典键忽略大小写
    keysToTarget(obj, needArgs)

def verifySysArgv(_obj):
    for pn in needArgs:
        lowPn = pn.lower()
        if lowPn not in [x.lower() for x in _obj.keys()]: return False
    return True
def getAjaxData(webLogData):
    arg1 = {
        'Method': webLogData['Method'],
        'ContentType': webLogData['ContentType'],
        'Headers': webLogData['Headers'],
        'Query': webLogData['Query'],
        'Body': webLogData['Body'],
    }
    if webLogData['IsHttps'] == 0:
        arg1['Url'] = str('http://' + webLogData['Path'])
    else:
        arg1['Url'] = str('https://' + webLogData['Path'])
    return arg1
if obj != None:
    #C:\Code\VSCODE\src\WebTool\GetAndSend_PY2.py -dbFilePath=C:\HuaLi\src\Enterprise.Web\weblog.db -Path=/api/App/CheckLogin4App -PageSize=1
    #C:\Code\VSCODE\src\WebTool\GetAndSend_PY2.exe -dbFilePath=C:\HuaLi\src\Enterprise.Web\weblog.db -Path=/api/Product/GetListByPage -PageSize=10 -Data=成品
    vResult = verifySysArgv(obj)#可以窃取一个token过来 就是不确定token属于谁 设置token模式 设置取token方法 设置重发给谁
    if not vResult: print('not')
    else:
        #支持模式 默认None ：get到哪个请求 完全的重发；  last取最新一条请求的token； login 根据config 登录
        if 'tokenMode' not in obj: obj['tokenMode'] = 'None'
        weblogDb = WebLogDb(obj['dbFilePath'])
        result = weblogDb.searchTop(obj)
        if result != None:
            result = getAjaxData(result)
            ajax(result)
            #除了编码有点让人凌乱还有一个问题就是tooken赋值