'''
@Author: your name
@Date: 2020-06-09 11:41:12
@LastEditTime: 2020-06-10 14:26:01
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
    if data['Headers']:
        head = json.loads(data['Headers'])#里面一般包含了ContentType
        #head['Accept-Encoding'] = 'utf-8'
    p = data['Body']
    for pn in head:
        if type(head[pn]) == list:
            head[pn] = ';'.join(head[pn])
    head['Cookie'] = '''ck_rem=true; ck_username=zjhn; ck_userrealname=%E7%AE%A1%E7%90%86%E5%91%98; ck_userid=8d53e9c9-04d6-4eb0-8afd-a58f00a4a43c; ck_deptid=33b3c2c7-f370-4f94-83b9-a6100102fbce; def_contentType=application%2Fjson%3B%20charset%3Dutf-8; .AspNetCore.Antiforgery.xoPBgmQF2r0=CfDJ8Eqn5K6YWMFFifj7lyKflKhVZjY8NqdndPGzHR6_noi5vjcsmW4LUVBI5rg-J6gfOa056_IqjkMgMUEZhIf3Bxtbm9MknHqpm8azoG04KUN4JaJamf01TaCLBdJaHhAUOqbwGfJEZBfJKNj1S5ftk-0; .AspNetCore.Antiforgery.YuZsjO6egA0=CfDJ8Eqn5K6YWMFFifj7lyKflKj08aoqBggMCBF9AuKiFom-aahINg_v7e5X8Z4B_YTZfBZtrb-el8cx6-Yk0g5fafiRyIbUveYBK8CKoT-vkvSjB12ruDxizm9Z6B9_TlpDHHR7H9oTEvgLZ7J8OsHsRCc; ck_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJVc2VySUQiOiI4ZDUzZTljOS0wNGQ2LTRlYjAtOGFmZC1hNThmMDBhNGE0M2MiLCJSZWFsTmFtZSI6IueuoeeQhuWRmCIsIklzQWRtaW4iOnRydWUsIkV4cCI6IjIwMjAtMDYtMTFUMDk6NDM6MDIuMzU2MzA1NSswODowMCIsIklzTGVhZGVyIjowfQ.ymfhpQxoi_jgXh-fV3wkMX4PsRJU_z4eD7LMh7Z02tw'''
    if p == None or p == '': p = {}
    resp = None
    if data['Method'] == 'POST':
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
filePath = "i:\\vscode-plugin-demo-master\\vscode-plugin-demo-master\\src\\WebTool\\lastRequests.json"
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
    