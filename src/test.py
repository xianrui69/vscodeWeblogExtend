import requests,time,random,json,re,xlrd,xlwt,os,sys
#分别是 请求包 时间包 随机数 json处理 正则，，， 后面几个不懂
from bs4 import BeautifulSoup
from urllib import request
from xlutils.copy import copy
from datetime import datetime
json.loads(sys.argv[0])
url='http://story.hcrtg.com.cn/wewap/Live/GetLiveFormData'
head = {'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2_1 like Mac OS X) AppleWebKit/602.4.6 (KHTML, like Gecko) Mobile/14D27 MicroMessenger/6.5.6 NetType/4G Language/zh_CN'}
p={'areaCode': 59453, 'dataType': 'TEMP', 'field': 'T'}
wData = requests.post(url,p, headers=head)
wData.encoding='utf-8'      #可加可不加，爬虫结果乱码，可以用这个代码更正
arr=wData.text
arr = json.loads(arr)#json转换
arr1=[]
for a in arr:arr1.append({'statTime':a['statTime'],'stationLat':a['station']['lat'],'stationLon':a['station']['lon'],'stationStationName':a['station']['stationName'],'stationStationCode':a['station']['stationCode']})

def custom_time(timestamp):time_local = time.localtime(timestamp);dt = time.strftime("%Y-%m-%d %H:%M:%S", time_local);return dt;

def loadUrl(_url):
    wData = requests.get(_url,headers=head);
    webTxt=wData.text;
    result=[];
    _result=json.loads(re.search('<script type="text/javascript">\r\n.+?var stData =((.|\r|\n)+?);\r\n.+</script>', webTxt).group(1));
    for _r in _result:
            result.append({'t':_r['t'],'time':custom_time(_r['time']/1000-28800)});#东八区 时间减8
    return result;

arr=[];
for a in arr1:result=loadUrl('http://story.hcrtg.com.cn/wewap/Live/StationChart?stationNum=59453&stationCode='+a['stationStationCode']+'&m=59453');arr.append({'name':a['stationStationName'],'arr':result,'lat':a['stationLat'],'lon':a['stationLon']});time.sleep(random.random()*1.5);

cols=[['镇名','时间','温度','纬度','经度']]
times=[];sheetArr=[];
for a in arr:
    _arr=[]
    for b in a['arr']:
      cols.append([a['name'],b['time'],b['t'],a['lat'],a['lon']]);
      if b['time'] not in times:
        times.append(b['time']);
        sheetArr.append([['镇名','时间','温度','纬度','经度']]);
      sheetArr[times.index(b['time'])].append([a['name'],b['time'],b['t'],a['lat'],a['lon']]);

book = xlwt.Workbook()#新建一个excel
sheet = book.add_sheet('case1_sheet')#添加一个sheet页
row = 0#控制行
for stu in cols:
    col = 0#控制列
    for s in stu:#再循环里面list的值，每一列
        if str(s)=='nan':sheet.write(row,col,-1);
        else:sheet.write(row,col,s)
        col+=1
    row+=1

for time in times:
    sheet1 = book.add_sheet(time.replace(' ','_').replace('.','_').replace('-','_').replace(':','_'))#添加一个sheet页
    row = 0#控制行
    for stu in sheetArr[times.index(time)]:
        col = 0#控制列
        for s in stu:#再循环里面list的值，每一列
         if str(s)=='nan':sheet1.write(row,col,-1);
         else:sheet1.write(row,col,s);
         col+=1
        row+=1

book.save('G:/天气_'+str(datetime.now()).replace(' ','_').replace('.','_').replace('-','_').replace(':','_')+'.xls')#保存到目录下

