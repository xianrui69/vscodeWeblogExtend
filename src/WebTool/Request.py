'''
@Author: your name
@Date: 2020-06-09 11:41:12
@LastEditTime: 2020-06-12 11:05:44
@LastEditors: Please set LastEditors
@Description: In User Settings Edit
@FilePath: \vscode-plugin-demo-master\src\py_test.py
'''
# -*- coding: utf-8 -*-
import sys,json,os,requests,gzip,brotli,io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
def ajax(data):
    url = data['Url'] + data['Query']
    head = {}
    if 'Headers' in data:
        head = json.loads(data['Headers'])#里面一般包含了ContentType
        #head['Accept-Encoding'] = 'utf-8'
    p = {}
    if 'Body' in data: p = data['Body']
    for pn in head:
        if type(head[pn]) == list:
            head[pn] = ';'.join(head[pn])
    if p == None or p == '': p = {}
    resp = None
    if data['Method'].upper() == 'POST':
        resp = requests.post(url,p,headers=head)
    else:
        resp = requests.get(url,headers=head);
    if resp.status_code == 200:
        str = ''
        reEncoding = resp.headers['Content-Encoding']
        try:
            str = resp.content.decode('utf-8')
        except BaseException as identifier:
            try:
                if reEncoding == 'br':
                    str = brotli.decompress(resp.content).decode('utf-8')
                elif reEncoding == 'gzip':
                    str = gzip.decompress(resp.content).decode('utf-8')
            except BaseException as identifier:
                print('解码异常 请调试')
                pass
        if str != '': print(str)#
    else:
        try:
            resp.encoding='utf-8'
            print(resp.text)
            pass
        except expression as identifier:
            data = gzip.decompress(resp.content).decode("utf-8")
            print(data)
            pass
filePath = os.getcwd() + "\\lastRequests.json"#当前目录下
if len(sys.argv) > 1:
    filePath = sys.argv[1]
if os.path.exists(filePath):
    data = ''
    #得到传输的json文件的内容 并解析出来
    with open(filePath, "r") as f:
        data = f.read()
        data = json.loads(data)
        #print(data)
    ajax(data)
    