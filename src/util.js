const fs = require('fs');
const readline = require('readline');
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const exec = require('child_process').exec;
const SendProxy = require('../src/WebTool/SendProxy');
const utilConsts = {
    String:{
        endCharts: [' ', '('],
        errorCharts: ['', '.', '<', '>', ')'],
    }
}
const util = {
    testWord: '',
    Web:{
        /**
         * 从某个HTML文件读取能被Webview加载的HTML内容
         * @param {*} context 上下文
         * @param {*} templatePath 相对于插件根目录的html文件相对路径
         */
        getWebViewContent(context, templatePath) {
            const resourcePath = util.getExtensionFileAbsolutePath(context, templatePath);
            const dirPath = path.dirname(resourcePath);
            let html = fs.readFileSync(resourcePath, 'utf-8');
            // vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
            html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
                return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
            });
            return html;
        },
        showJson(data, jsonTitle = null){
            vscode.commands.executeCommand('extension.demo.showJson', {
                action: 'push', 
                title: jsonTitle,
                data: data
            });
        },
        delJson(jsonTitle = null){
            vscode.commands.executeCommand('extension.demo.showJson', {
                action: 'delete', 
                title: jsonTitle,
            });
        },
        /**
         * 根据配置 调用登录 获取json 调用回调函数
         * @param {*} callBack 回调函数
         * @param {*} isFail token是否失效
         */
        loadToken(callBack, isFail = false){
            let myName = 'vscodePluginDemo';//插件名
            let configs = vscode.workspace.getConfiguration()[myName];
            if (!isFail && configs['SendToken']) return configs['SendToken'];
            SendProxy.Send({
                Url: configs['autoUrl'] + '/api/App/CheckLogin4App',
                Method: 'GET',
                Query: `?credential=${configs['autoUserNo']}&password=${configs['autoPWD']}`,
            }, (data) => {
                try {
                    data = JSON.parse(data)
                    if (data.success === false) return;
                    let token = data.data.token
                    vscode.workspace.getConfiguration().update(myName+'.SendToken', token, true);//更新配置里的token
                    typeof(callBack) === 'function' && callBack(token);
                } catch (error) {
                    util.showError('token获取失败 连接可能被拒绝');
                    return;
                }
            });
        },
        //最后一次连接失败的时间
        lastConnErrDate: undefined,
    },
    Cache:{
        Controllers:{//使用这些索引器来访问缓存 使得save等等可以触发
            Set(name, Controller){
                this[name] = Controller;
            },
            Get(name){
                return this[name];
            },
            SetFuncCall(cName, fName){//钩子
                let c = this.Get(cName);
                if (!c) return;
            },
            GetFunc(){

            }
        },
        DBMode:'none',//redis sqlite 这些都没写
        save(){},
        load(){},
        init(){
            if (this.DBMode === 'none') return;//不需要加载
            //初次使用时等等
        },
    },
    Controller: function (name, fileName = ''){
        let curController = util.Cache.Controllers.Get(name);
        if (!curController) curController = this;
        else return curController;//缓存的
        this.errorMsg = '';
        this.type = 'Controller';
        this.name = name;
        this.baseName = `${name}Controller.cs`;
        this.JumpFunc = () => {};
        let setCache = (name, fn) => '';
        if (!fileName) {
            let findFiels = util.File.ApiControllers.getControllers(this.baseName);
            if (findFiels.length > 0){
                if (findFiels.length > 1){
                    util.showInfo('匹配到了多个api控制器，默认选择了第一个.'
                        + findFiels.map(f => f.fullName).join(','));
                }
                fileName = findFiels[0].fullName;
                findFiels.forEach(e => setCache(name, e.fullName));
                util.File.ApiControllers.files.filter(f => !util.Cache.Controllers.Get(f.cname))
                    .forEach(e => {
                        let c = new util.Controller(e.cname, e.fullName);
                        util.Cache.Controllers.Set(e.cname, c);
                    });
            } else {
                this.errorMsg = '未找到对应的控制器' + this.baseName;
                return this;
            }
        }else {
            if (!fs.existsSync(fileName)) {
                this.errorMsg = '控制器文件不存在！' + fileName;
                return this;
            }
        }
        
        this.fileName = fileName;
        this.JumpFunc = function(funcName){
            let _func = curController.getFunc(funcName);
            let _jump = () =>{
                fileName && util.Jump.ByFileToFunc(fileName, funcName, (selection, selections) =>{
                    if (!_func){
                        _func = AddFunc(funcName, selection);
                    }else _func.selection = selection;

                    selections.filter(f => !curController.getFunc(f.funcName)).forEach(f =>{//注册并方法
                        AddFunc(f.funcName, f.selection);
                    })
                })
            };
            if (_func && _func['selection']){
                util.Window.ShowFile(fileName, _func.selection, textEdit => {
                    let text = textEdit.document.getText(textEdit.document.getWordRangeAtPosition(_func.selection.start));
                    if (text == _func.name) return;//如果那个位置的文本就是方法名 跳转完成
                    else _jump();//否则重新跳转
                })
                return;
            }
            return _jump();
        };
        this.funcs = {};//获取funcs
        function Func(controller, funcName, selection) {
            this.type = 'ControllerFunc';
            this.name = funcName;
            this.controller = controller;
            this.selection = selection;
            this.jump = () => controller.JumpFunc(funcName);
        }
        function AddFunc(funcName, selection = undefined){
            let _func = curController.funcs[funcName] = new Func(curController, funcName, selection);
            util.Cache.Controllers.SetFuncCall(curController.name, funcName);//触发钩子
            return _func;
        }
        this.getFunc = (funcName) =>{
            return curController.funcs[funcName] || {};
        }
    },
    Document:{
        /**
         * 判断是否是控制器
         * @param {*} document vscode的文档对像
         */
        isController(document){
            let _lineIdx = 0
            while (_lineIdx < document.lineCount) {
                let _match = document.lineAt(_lineIdx).text.match(/^\s+public\s+class\s+(\w+?)Controller/)
                if (_match){
                    return _match[1]
                }
                _lineIdx+=1
            }
            return '';
        },
        /**
         * 缓存最后一次运行了hover的位置
         */
        hoverPosition:{},
    },
    String:{
        /**
         * 在源字符串的索引 最近的位置 寻找一段字符串，遇到结尾endCharts元素就结束，遇到errorCharts就直接异常返回空字符串
         * @param {*} sourceStr  源字符串
         * @param {*} startIdx  最近的位置
         * @param {*} endCharts  遇到结尾endCharts元素就结束
         * @param {*} isHasEnd  遇到结尾时 是否包含结尾
         * @param {*} errorCharts  遇到errorCharts就直接异常返回空字符串
         */
        findNearStr(sourceStr, startIdx, endCharts = utilConsts.String.endCharts, isHasEnd = true, errorCharts = utilConsts.String.errorCharts){
            const lineText = sourceStr
            let charts = []
            let leftIdx = startIdx
            let rightIdx = leftIdx
            const getChar = (idx) => 
                idx < lineText.length && idx >= 0? lineText[idx]: '';
            if (!Array.isArray(endCharts) || !Array.isArray(errorCharts)) return ''
            const isEnd = (_char) => endCharts.indexOf(_char) !== -1;
            const isError = (_char) => errorCharts.indexOf(_char) !== -1;
            while (leftIdx != -1 || rightIdx != -1) {
                let _char = ''
                if (leftIdx != -1){
                    //左边寻找
                    _char = getChar(leftIdx)
                    if(isEnd(_char)) {
                        if(isHasEnd)
                            charts[leftIdx] = _char
                        leftIdx = -1//直接终止
                    }
                    else if(isError(_char)) {//不应该出现的字符出现了
                        charts = []
                        //util.showInfo(`请选择一个方法名，而不是其他内容`);
                        break
                    }
                    else {
                        charts[leftIdx] = _char
                        leftIdx -= 1
                    }
                }
                if (rightIdx != -1){
                    //右边寻找
                    _char = getChar(rightIdx)
                    if(isEnd(_char)) {
                        if(isHasEnd)
                            charts[rightIdx] = _char
                        rightIdx = -1//直接终止
                    }
                    else if(isError(_char)) {//不应该出现的字符出现了
                        //vscode.window.showInformationMessage(`请选择一个方法名，而不是其他内容`);
                        charts = []
                        break
                    }
                    else {
                        charts[rightIdx] = _char
                        rightIdx += 1
                    }
                }
            }
            charts = charts.filter(c => c);
            return charts.length > 1? charts.join(''): '';
        }
    },
    File:{
        ApiControllers:{
            basePath:'',
            files:[],
            loadFiles(){
                let path = util.Path.getWebPath() + "\\Controllers\\ApiControllers";
                util.File.findFile(path, '');
            },
            /**
             * 寻找控制器
             * 找不到的时候 忽略大小写
             */
            getControllers(controllerFileBaseName){
                if (this.files.length == 0) this.loadFiles();
                let arr = this.files.filter(f => f.name == controllerFileBaseName);
                if (arr.length === 0) arr = this.files.filter(f => f.name.toLowerCase() == controllerFileBaseName.toLowerCase());
                return arr;
            },
        },
        findFile(dir, fn, result) {
            if (!this.ApiControllers.basePath)
                this.ApiControllers.basePath = util.Path.getWebPath() + "\\Controllers\\ApiControllers";
            let basePath = this.ApiControllers.basePath;
            const files = fs.readdirSync(dir);
            files.forEach((item, index) => {
                var fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    let _result = util.File.findFile(path.join(dir, item), fn, result);  //递归读取文件
                    if (_result) result = _result;
                } else if (stat.isFile()){ 
                    if (item == fn) {
                        result = path.join(dir, item);
                    }
                    let pns = dir.replace(basePath + '\\', '').split('\\');
                    let obj = util.File.ApiControllers;
                    pns.forEach((p, idx) =>{
                        if(!obj[p]) obj[p] = {};
                        if (idx + 1 == pns.length && !obj[p]['files']) {
                            obj[p]['files'] = []
                        }
                        obj = obj[p]
                    });
                    let _file = {name:item,cname:item.replace(/Controller.cs$/, ''),fullName:path.join(dir, item)};
                    obj['files'].push(_file);
                    util.File.ApiControllers.files.push(_file);
                }        
            });
            return result;
        },
        readFileList(dir, filesList = []) {
            const files = fs.readdirSync(dir);
            files.forEach((item, index) => {
                var fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {      
                    util.File.readFileList(path.join(dir, item), filesList);  //递归读取文件
                } else {                
                    filesList.push(fullPath);                     
                }        
            });
            return filesList;
        },
    },
    Window:{
        ShowFile(fileName, selection = undefined, showCall=(textEditor)=>{}){
            const options = {
                selection: selection,
                // 是否预览，默认true，预览的意思是下次再打开文件是否会替换当前文件
                preview: true,
                viewColumn: vscode.ViewColumn.Active,//显示在旁边第二组
            };
            //vscode.Uri.parse
            vscode.window.showTextDocument(vscode.Uri.file(fileName), options).then(textEditor => {
                showCall(textEditor)
            });
        }
    },
    Jump:{//跳转文件等等
        ByFileToFunc(fileName, funcName, openCall=(selection, selections)=>{}){
            let readStream = fs.createReadStream(fileName);
            var objReadline = readline.createInterface({
                input: readStream
            });
            //找到位置 找到了就弹窗
            let selection;
            let lineNum = 0;
            let isOpen = false;
            let selections = [];
            //匹配和打开 匹配这个行有方法名 并且方法名等于funcName就打开文档 
            ///^(\s+public.+\s+?)(.+?)\((.+?)?\)/
            let match_oepn = (line) =>{
                let _match = line.match(/^(\s+public.+\s+?)(.+?)\((.+?)?\)/);
                if (!_match) return lineNum++;
                let _funcName = _match[2];
                let _left = _match[1].length, _right = _match[1].length + _match[2].length;
                selection = new vscode.Range(new vscode.Position(lineNum, _left), new vscode.Position(lineNum, _right));
                selections.push({funcName:_funcName,selection:selection});
                if (_funcName.toLowerCase() == funcName.toLowerCase()) {
                    util.Window.ShowFile(fileName, selection);
                    isOpen = true;
                    openCall(selection, selections);
                    objReadline.close();//立即触发事件
                    readStream.destroy();//流关闭
                }
                lineNum++;
            };
            objReadline.on('line', function(line){
                if (!isOpen) match_oepn(line);
            });
            objReadline.on('close', function(line){
                if (!isOpen) {
                    openCall(undefined, selections);
                    vscode.window.showInformationMessage(`未匹配到方法 ${funcName},是否仍然打开控制器`,'是','否')
                    .then(function(select){
                        if (select == '是'){//从最上面开始打开 如果没有方法就去00位置 否则打开到第一个方法所在位置
                            let s = selections.length > 0 ? selections[0].selection
                                : new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
                            util.Window.ShowFile(fileName, s);
                        }
                    });
                }
            });
        },
        ApiController(controllerName, funcName){
            let c = new util.Controller(controllerName);
            if (c.errorMsg) util.showInfo(c.errorMsg);
            c.JumpFunc(funcName);
        },
        ApiUrl(apiUrl){
            let match = '\\/api\\/(.+?)\\/(.+?)(\\?.+)?';
            let _match = apiUrl.match(eval(`/^${match}$/i`));
            if (!_match || _match.length < 3) {
                util.showInfo(`当前行没有格式为 "/api/xxx/xx" 的字符串`);
                return;
            }
            let controllerName = _match[1], funcName = _match[2];
            util.showBarMessage(`控制器:${controllerName},方法名:${funcName}`, 5);
            return this.ApiController(controllerName, funcName);
        }
    },
    Path:{
        WebPath: '',
        getWebPath(){
            if (this.WebPath) return this.WebPath;
            if (vscode.workspace.workspaceFolders.length > 0){
                let workPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                //找到了 "i:\\code\\华丽\\src"
                if (workPath.length - 3 == workPath.indexOf('src') || fs.existsSync(workPath = (workPath + '\\src'))){
                    return this.WebPath = workPath + '\\Enterprise.Web';
                }
            }
            return '';
        }
    },
    /**
     * 获取当前所在工程根目录，有3种使用方法：<br>
     * getProjectPath(uri) uri 表示工程内某个文件的路径<br>
     * getProjectPath(document) document 表示当前被打开的文件document对象<br>
     * getProjectPath() 会自动从 activeTextEditor 拿document对象，如果没有拿到则报错
     * @param {*} document 
     */
    getProjectPath(document) {
        if (!document) {
            document = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
        }
        if (!document) {
            this.showError('当前激活的编辑器不是文件或者没有文件被打开！');
            return '';
        }
        const currentFile = (document.uri ? document.uri : document).fsPath;
        let projectPath = null;

        let workspaceFolders = vscode.workspace.workspaceFolders.map(item => item.uri.fsPath);
        // 由于存在Multi-root工作区，暂时没有特别好的判断方法，先这样粗暴判断
        // 如果发现只有一个根文件夹，读取其子文件夹作为 workspaceFolders
        if (workspaceFolders.length == 1 && workspaceFolders[0] === vscode.workspace.rootPath) {
            const rootPath = workspaceFolders[0];
            var files = fs.readdirSync(rootPath);
            workspaceFolders = files.filter(name => !/^\./g.test(name)).map(name => path.resolve(rootPath, name));
            // vscode.workspace.rootPath会不准确，且已过时
            // return vscode.workspace.rootPath + '/' + this._getProjectName(vscode, document);
        }
        workspaceFolders.forEach(folder => {
            if (currentFile.indexOf(folder) === 0) {
                projectPath = folder;
            }
        })
        if (!projectPath) {
            this.showError('获取工程根路径异常！');
            return '';
        }
        return projectPath;
    },
    /**
     * 获取当前工程名
     */
    getProjectName: function(projectPath) {
        return path.basename(projectPath);
    },
    getPluginPath() {

    },
    /**
     * 将一个单词首字母大写并返回
     * @param {*} word 某个字符串
     */
    upperFirstLetter: function(word) {
        return (word || '').replace(/^\w/, m => m.toUpperCase());
    },
    /**
     * 将一个单词首字母转小写并返回
     * @param {*} word 某个字符串
     */
    lowerFirstLeter: function(word) {
        return (word || '').replace(/^\w/, m => m.toLowerCase());
    },
    /**
     * 全局日志开关，发布时可以注释掉日志输出
     */
    log: function(...args) {
        console.log(...args);
    },
    /**
     * 全局日志开关，发布时可以注释掉日志输出
     */
    error: function(...args) {
        console.error(...args);
    },
    /**
     * 弹出错误信息
     */
    showError: function(info) {
        vscode.window.showErrorMessage(info);
    },
    /**
     * 弹出提示信息
     */
    showInfo: function(info) {
        vscode.window.showInformationMessage(info);
    },
    /**
     * 弹出提示信息-状态栏
     */
    showBarMessage: function(info, hideTime = null) {
        vscode.window.setStatusBarMessage(info, hideTime);
    },
    findStrInFolder: function(folderPath, str) {

    },
    /**
     * 从某个文件里面查找某个字符串，返回第一个匹配处的行与列，未找到返回第一行第一列
     * @param filePath 要查找的文件
     * @param reg 正则对象，最好不要带g，也可以是字符串
     */
    findStrInFile: function(filePath, reg) {
        const content = fs.readFileSync(filePath, 'utf-8');
        reg = typeof reg === 'string' ? new RegExp(reg, 'm') : reg;
        // 没找到直接返回
        if (content.search(reg) < 0) return {row: 0, col: 0};
        const rows = content.split(os.EOL);
        // 分行查找只为了拿到行
        for(let i = 0; i < rows.length; i++) {
            let col = rows[i].search(reg);
            if(col >= 0) {
                return {row: i, col};
            }
        }
        return {row: 0, col: 0};
    },
    /**
     * 获取某个字符串在文件里第一次出现位置的范围，
     */
    getStrRangeInFile: function(filePath, str) {
        var pos = this.findStrInFile(filePath, str);
        return new vscode.Range(new vscode.Position(pos.row, pos.col), new vscode.Position(pos.row, pos.col + str.length));
    },
    /**
     * 简单的检测版本大小
     */
    checkVersion: function(version1, version2) {
        version1 = parseInt(version1.replace(/\./g, ''));
        version2 = parseInt(version2.replace(/\./g, ''));
        return version1 > version2;
    },
    /**
     * 获取某个扩展文件绝对路径
     * @param context 上下文
     * @param relativePath 扩展中某个文件相对于根目录的路径，如 images/test.jpg
     */
    getExtensionFileAbsolutePath: function(context, relativePath) {
        return path.join(context.extensionPath, relativePath);
    },
    /**
     * 获取某个扩展文件相对于webview需要的一种特殊路径格式
     * 形如：vscode-resource:/Users/toonces/projects/vscode-cat-coding/media/cat.gif
     * @param context 上下文
     * @param relativePath 扩展中某个文件相对于根目录的路径，如 images/test.jpg
     */
    getExtensionFileVscodeResource: function(context, relativePath) {
        const diskPath = vscode.Uri.file(path.join(context.extensionPath, relativePath));
        return diskPath.with({ scheme: 'vscode-resource' }).toString();
    },
    /**
     * 在Finder中打开某个文件或者路径
     */
    openFileInFinder: function(filePath) {
        if (!fs.existsSync(filePath)) {
            this.showError('文件不存在：' + filePath);
        }
        // 如果是目录，直接打开就好
        if (fs.statSync(filePath).isDirectory()) {
            exec(`open ${filePath}`);
        } else {
            // 如果是文件，要分开处理
            const fileName = path.basename(filePath);
            filePath = path.dirname(filePath);
            // 这里有待完善，还不知道如何finder中如何选中文件
            exec(`open ${filePath}`);
        }
    },
    /**
     * 在vscode中打开某个文件
     * @param {*} path 文件绝对路径
     * @param {*} text 可选，如果不为空，则选中第一处匹配的对应文字
     */
    openFileInVscode: function(path, text) {
        let options = undefined;
        if (text) {
            const selection = this.getStrRangeInFile(path, text);
            options = { selection };
        }
        vscode.window.showTextDocument(vscode.Uri.file(path), options);
    },
    /**
     * 用JD-GUI打开jar包
     */
    openJarByJdGui: function(jarPath) {
        // 如何选中文件有待完善
        const jdGuiPath = vscode.workspace.getConfiguration().get('eggHelper.jdGuiPath');
        if (!jdGuiPath) {
            this.showError('JD-GUI路径不能为空！');
            return;
        }
        if (!fs.existsSync(jdGuiPath)) {
            this.showError('您还没有安装JD-GUI，请安装完后到vscode设置里面找到HSF助手并进行路径配置。');
            return;
        }
        if (!fs.existsSync(jarPath)) {
            this.showError('jar包未找到：' + jarPath);
            return;
        }
        exec(`open ${jarPath} -a ${jdGuiPath}`);
    },
    /**
     * 使用默认浏览器中打开某个URL
     */
    openUrlInBrowser: function(url) {
        exec(`open '${url}'`);
    },
    /**
     * 递归遍历清空某个资源的require缓存
     * @param {*} absolutePath
     */
    clearRequireCache(absolutePath) {
        const root = require.cache[absolutePath];
        if (!root) return;
        if (root.children) {
            // 如果有子依赖项，先清空依赖项的缓存
            root.children.forEach(item => {
                this.clearRequireCache(item.id);
            });
        }
        delete require.cache[absolutePath];
    },
    /**
     * 动态require，和普通require不同的是，加载之前会先尝试删除缓存
     * @param {*} modulePath 
     */
    dynamicRequire(modulePath) {
        this.clearRequireCache(modulePath);
        return require(modulePath);
    },
    /**
     * 读取properties文件
     * @param {*} filePath 
     */
    readProperties(filePath) {
        const content =  fs.readFileSync(filePath, 'utf-8');
        let rows = content.split(os.EOL);
        rows = rows.filter(row => row && row.trim() && !/^#/.test(row));
        const result = {};
        rows.forEach(row => {
            let temp = row.split('=');
            result[temp[0].trim()] = temp[1].trim();
        });
        return result;
    },
    /**
     * 比较2个对象转JSON字符串后是否完全一样
     * 特别注意，由于JS遍历对象的无序性（部分浏览器是按照添加顺序遍历的）导致同样的对象，
     * 转成JSON串之后反而不一样，所以这里采用其它方式实现。
     * @param {*} obj1 
     * @param {*} obj2 
     */
    jsonEquals(obj1, obj2) {
        let s1 = this.formatToSpecialJSON(obj1, '', true);
        let s2 = this.formatToSpecialJSON(obj2, '', true);
        return s1 === s2;
    }
};

module.exports = util;