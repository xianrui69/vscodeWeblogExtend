const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const exec = require('child_process').exec;
const SendProxy = require('./WebTool/SendProxy');
const utilConsts = {
    String:{
        endCharts: [' ', '('],
        errorCharts: ['', '.', '<', '>', ')'],
    }
}
const util = {
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
         */
        loadToken(callBack){
            let myName = 'vscodePluginDemo';//插件名
            let configs = vscode.workspace.getConfiguration()[myName];
            SendProxy.Send({
                Url: configs['autoUrl'] + '/api/App/CheckLogin4App',
                Method: 'GET',
                Query: `?credential=${configs['autoUserNo']}&password=${configs['autoPWD']}`,
            }, (data) => {
                data = JSON.parse(data)
                let token = data.data.token
                typeof(callBack) === 'function' && callBack(token);
            });
        },
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
                    let _file = {name:item,fullName:path.join(dir, item)};
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
    Jump:{//跳转文件等等
        ApiController(controllerName, funcName){
            let fn = '', controllerFileName = `${controllerName}Controller.cs`;
            if (util.File.ApiControllers.files.length < 1){
                let path = util.Path.getWebPath() + "\\Controllers\\ApiControllers";
                fn = util.File.findFile(path, controllerFileName);
            }
            else {
                let findFiels = util.File.ApiControllers.files.filter(f => f.name == controllerFileName);
                if (findFiels.length > 0)
                    fn = findFiels[0].fullName;
            }
            const options = {
                // 是否预览，默认true，预览的意思是下次再打开文件是否会替换当前文件
                preview: false,
                viewColumn: vscode.ViewColumn.Active,//显示在旁边第二组
            };
            let activeTextEditor = vscode.window.showTextDocument(vscode.Uri.file(fn), options);
            activeTextEditor.then((textEditor) => {
                textEditor.selection.with({start: new vscode.Position(1,2)});
                //new vscode.Location(vscode.Uri.file(fn), new vscode.Position(0, 0))
                //debugger
            });
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