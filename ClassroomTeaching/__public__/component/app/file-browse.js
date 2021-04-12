(function()
{
'use strict';

angular.module('Classroom.Component.FileBrowse', [
    'ngResource',
    'LINDGE-Service',
    'Client.Services.ClientProxy'
])

.constant('EntityType',{
    File: 'FILE',
    Folder: 'FOLDER'
})

.constant('ExcludeDirectories', [
    '$RECYCLE.BIN',
    '$Recycle.Bin',
    '$WinREAgent',
    'Documents and Settings',
    'System Volume Information',
    'Recovery',
    'sysytemsss.sys',
    'Windows',
    'PerfLogs',
    'ProgramData'
])

.constant('ExcludeFileTypes', [
    'ini',
    'link',
    'lnk',
    'rdb',
    'sys',
    'tmp',
    'rdp',
    'exe'
])

.factory('FileIcons', [function () {
    var root = '/Images';

    var extTable = {
        'mp4': `${root}/filetype-video.png`,
        'media': `${root}/filetype-video.png`,
        'mp3': `${root}/filetype-audio.png`,
        'audio': `${root}/filetype-audio.png`,
        'article': `${root}/filetype-article.png`,
        'doc': `${root}/filetype-doc.png`,
        'docx': `${root}/filetype-doc.png`,
        'image': `${root}/filetype-image.png`,
        'png': `${root}/filetype-image.png`,
        'jpg': `${root}/filetype-image.png`,
        'jpeg': `${root}/filetype-image.png`,
        'ppt': `${root}/filetype-ppt.png`,
        'pptx': `${root}/filetype-ppt.png`,
        'xls': `${root}/filetype-xls.png`,
        'xlsx': `${root}/filetype-xls.png`,
        'rar': `${root}/filetype-archive.png`,
        'zip': `${root}/filetype-archive.png`,
        '7z': `${root}/filetype-archive.png`,
        'pdf': `${root}/filetype-pdf.png`,
        'txt': `${root}/filetype-txt.png`
    };

    return {
        fileDefault: `${root}/filetype-unknown.png`,
        directoryDefault: `${root}/folder.png`,
        file: extTable,
        directory: {
            disk: `${root}/harddisk.png`,
            desktop: `${root}/desktop.png`,
            documents: `${root}/documents.png`
        }
    };
}])

.filter('ImageFilter',['EntityType', 'FileIcons', function (EntityType, FileIcons) {
    return function (item) {
        if (item) {
            switch (item.type) {
                case EntityType.File:
                    var ext = item.extension.toLowerCase();
                    var icon = FileIcons.file[ext];

                    if (icon) {
                        return icon;
                    } else {
                        return FileIcons.fileDefault;
                    }
                    break;
                case EntityType.Folder:
                    if (item.isDisk) {
                        return FileIcons.directory.disk;
                    } else if (item.isDesktopEntrance) {
                        return FileIcons.directory.desktop;
                    } else if (item.isDocumentsEntrance) {
                        return FileIcons.directory.documents;
                    } else {
                        return FileIcons.directoryDefault;
                    }
                    break;
                default:
                    return '';
            }
        } else {
            return '';
        }
    };
}])

.filter('DateTimeFilter',[function () {
    function formatNumber(number) {
        if (number < 10) {
            return '0' + number;
        } else {
            return String(number);
        }
    }

    function formatHour(hour) {
        if (hour <= 12) {
            return `上午${formatNumber(hour)}`;
        } else {
            return `下午${hour}`;
        }
    }

    return function (time) {
        if (time) {
            var date = new Date(time);
            var year = date.getFullYear();
            var month = formatNumber(date.getMonth() + 1);
            var day = formatNumber(date.getDate());
            var hour = formatHour(date.getHours());
            var minute = formatNumber(date.getMinutes());

            return `${year}年${month}月${day}日 ${hour}:${minute}`;
        } else {
            return '';
        }
    };
}])

.directive('fileBrowse', ['EntityType', '$clientProxy', 'ExcludeDirectories', '$http',
function (EntityType, $clientProxy, ExcludeDirectories, $http) {
    var template = `<div class="file-top-container">
                        <div class="board-show">
                            <img ng-src="{{selectedItem | ImageFilter}}" class="board-image" ng-show="selectedItem"/>
                            <div class="board-text">
                                <div class="name" ng-bind="selectedItem.name"></div>
                                <div ng-show="selectedItem.type == 'FILE'">
                                    <div class="type-size" ng-show="selectedItem.size">{{selectedItem.extension | uppercase}}文件 - {{selectedItem.size}}</div>
                                    <div class="type-size" ng-show="!selectedItem.size">{{selectedItem.extension | uppercase}}文件</div>
                                    <div class="message">信息</div>
                                    <div class="time">
                                        <span class="text">创建时间</span>
                                        <span class="time-content">{{selectedItem.createTime|DateTimeFilter}}</span>
                                    </div>
                                    <div class="time">
                                        <span class="text">修改时间</span>
                                        <span class="time-content">{{selectedItem.updateTime|DateTimeFilter}}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="file-middle-container" id="scroll-container">
                        <div class="directory" ng-repeat="directory in directoryList">
                            <div class="title" ng-show="$index == 0"><div>位置</div></div>
                            <div class="file-item"  ng-repeat="item in directory" ng-click="selectItem(item, directory)"
                            ng-class="{'selected': item.isSelected, 'global-selected': (item.fullPath && selectedItem.fullPath == item.fullPath) || (item.lessonMaterialId && selectedItem.lessonMaterialId == item.lessonMaterialId)}">
                                <img ng-src="{{item | ImageFilter}}" class="item-img" />
                                <div class="item-content">{{item.name}}</div>
                                <i class="lic lic-player-play arrow-icon" ng-show="item.type != 'FILE'"></i>
                            </div>
                        </div>
                    </div>`;

    return {
        priority: 1,
        scope: {
            onSelect: '=',
            onInit: '='
        },
        template: template,
        restrict: 'E',
        replace: false,
        link: function (scope) {
            const fs = require("fs");
            const os = require('os');
            const path = require('path'); 
            var lessonMaterials = [];
            var fileFilter = null;
            var filePaths = [];
            scope.directoryList = [];
            scope.selectedItem = null; 

            function refresh () {
                if (!scope.isLoading) {
                    init();
                }
            }

            function loadLessonMaterial (url) {
                scope.isLoading = true;
                $http.get(url).then(result => {
                    if(!scope.directoryList[0].some(d => d.fullPath == 'lesson/')){
                        scope.directoryList[0].unshift({
                            name: result.data.LessonName,
                            type: EntityType.Folder,
                            fullPath: 'lesson/',
                            isSelected: false,
                            isDisk: false,
                            isLessonMaterial: true
                        });
                        lessonMaterials = result.data.Materials.map(m => ({
                            name: m.Name,
                            type: EntityType.File,
                            extension: m.Type,
                            lessonMaterialId: m.Id,
                            fullPath: 'lesson/' + m.Id,
                            isSelected: false,
                            isLessonMaterial: true,
                            isOpen: m.IsOpen,
                            createTime: m.CreateTime,
                            updateTime: m.ModifyTime
                        }));
                        startMockSelect();
                    }
                    scope.isLoading = false;
                }, err => {
                    scope.isLoading = false;
                });
            }

            function select (filePath) {
                filePaths = [];
                let count = 0;
                let filePathCopy = filePath;
                for (let char of filePath) {
                    if (char == '/') {
                        count++;
                    }
                }
                if (filePath[filePath.length-1] == '/') {
                    count--;
                }
                for (var i = 0; i < count; i++) {
                    if (i == count - 1) {
                        if (filePath.substring(0, filePath.indexOf('/')) == 'lesson' || 
                            filePath.indexOf(path.join(os.homedir(), 'Desktop/'))!=-1 ||
                            filePath.indexOf(path.join(os.homedir(), 'Documents/'))!=-1) {
                            filePaths.unshift(path.dirname(filePathCopy) + '/');
                        } else {
                            filePaths.unshift(path.dirname(filePathCopy));
                        }
                    } else {
                        filePaths.unshift(path.dirname(filePathCopy) + '/');
                    }
                    filePathCopy = path.dirname(filePathCopy);
                }
                filePaths.push(filePath);
                if (filePath.indexOf(path.join(os.homedir(), 'Desktop/'))!=-1 && !filePaths.some(p => p == path.join(os.homedir(), 'Desktop/'))) {
                    filePaths.unshift(path.join(os.homedir(), 'Desktop/'));
                }
                if (filePath.indexOf(path.join(os.homedir(), 'Documents/'))!=-1 && !filePaths.some(p => p == path.join(os.homedir(), 'Documents/'))) {
                    filePaths.unshift(path.join(os.homedir(), 'Documents/'));
                }
            }

            function startMockSelect () {
                if (filePaths[0] == 'lesson/') {
                    for(let index = 0; index < filePaths.length; index++){
                        if(scope.directoryList.length < index || !scope.directoryList[index].some(d => d.fullPath == filePaths[index])){
                            break;
                        }
                        scope.directoryList[index].forEach(item => {
                            if (item.fullPath == filePaths[index]) {
                                scope.selectItem(item, null);
                            }
                        });
                    }
                } else if (filePaths[0]){
                    for (let index = 0; index < filePaths.length; index++) {
                        if(scope.directoryList.length < index || !scope.directoryList[index].some(d => d.fullPath == filePaths[index])){
                            break;
                        }
                        scope.directoryList[index].forEach(item => {
                            if (item.fullPath == filePaths[index]) {
                                scope.selectItem(item, scope.directoryList[index]);
                            }
                        });
                    }
                }
            }

            function setFilter (func) {
                fileFilter = func;
            }

            scope.onInit({
                refresh: refresh,
                loadLessonMaterial: loadLessonMaterial,
                select: select,
                setFilter: setFilter
            });

            scope.selectItem = function(item, fatherNode) {
                if (!scope.selectedItem || scope.selectedItem.fullPath != item.fullPath || scope.selectedItem.lessonMaterialId != item.lessonMaterialId) {
                    if (fatherNode) {
                        scope.directoryList.splice(scope.directoryList.indexOf(fatherNode) + 1, scope.directoryList.length);
                        fatherNode.forEach(function(n) {
                            if (n.isSelected) {
                                n.isSelected = false;
                            }
                        });
                    }
                    lessonMaterials.forEach(function(n) {
                        if (n.isSelected) {
                            n.isSelected = false;
                        }
                    });
                    item.isSelected = true;
                    scope.selectedItem = item;
                    scope.onSelect(item);
                    if (item.type != EntityType.File) {
                        if (item.isLessonMaterial && scope.directoryList.length == 1) {
                            scope.directoryList.push(lessonMaterials);
                        } else {
                            getFileList(item.fullPath);
                        }
                    }
                }
            };

            function directoryExists (fpath) {
                try {
                    return fs.statSync(fpath).isDirectory();
                } catch(err) {
                    return false;
                }
            }
        
            function getDiskList() {
                scope.isLoading = true;
                $clientProxy.getDiskInfo().then(result => {
                    if(scope.directoryList[0].every(d => d.fullPath.indexOf('盘') == -1)){
                        if(directoryExists(path.join(os.homedir(), 'Desktop'))){
                            scope.directoryList[0].push({
                                name: '桌面',
                                type: EntityType.Folder,
                                fullPath: path.join(os.homedir(), 'Desktop/'),
                                isSelected: false,
                                isDisk: false, 
                                isLessonMaterial: false,
                                isDesktopEntrance: true
                            });
                        }
                        if(directoryExists(path.join(os.homedir(), 'Documents'))){
                            scope.directoryList[0].push({
                                name: '文档',
                                type: EntityType.Folder,
                                fullPath: path.join(os.homedir(), 'Documents/'),
                                isSelected: false,
                                isDisk: false, 
                                isLessonMaterial: false,
                                isDocumentsEntrance: true
                            });
                        }
                        scope.directoryList[0].push.apply(scope.directoryList[0], result.map(a => ({
                            name: a.mounted.replace(':', '') + '盘',
                            type: EntityType.Folder,
                            fullPath: a.mounted + '/',
                            isSelected: false,
                            isDisk: true
                        })));
                        startMockSelect();
                        scope.$evalAsync(angular.noop);
                    }
                    scope.isLoading = false;
                });
            }
        
            function getFileList(fullPath) {
                function compareDirName(dir1, dir2) {
                    var name1 = dir1.name.toLowerCase();
                    var name2 = dir2.name.toLowerCase();

                    if (!isNaN(parseInt(name1)) && !isNaN(parseInt(name2))) {
                        name1 = parseInt(name1);
                        name2 = parseInt(name2);
                    }

                    if (name1 < name2) {
                        return -1;
                    } else if (name1 > name2) {
                        return 1;
                    } else {
                        return 0;
                    }  
                }

                try {
                    var fileList = fs.readdirSync(fullPath, { withFileTypes: true });
                } catch (error) {
                    return;
                }
                var newFileList = fileList.map(f => ({
                    name: f.name,
                    type: f.isFile() ? EntityType.File : EntityType.Folder,
                    extension: f.isFile() && f['name'].lastIndexOf('.') > -1 ? f['name'].slice(-(f['name'].length - f['name'].lastIndexOf('.') - 1)) : '',
                    fullPath: f.isFile() ? fullPath + f.name : fullPath + f.name + '/',
                    isSelected: false,
                    isDisk: false
                }));
                newFileList.forEach(function(n, index){
                    if(n.type == EntityType.File && fileFilter(n)){
                        try {
                            var fileInfo = fs.statSync(n.fullPath);
                        } catch (error) {
                            return;
                        }
                        let size = fileInfo.size;
                        n.fullPath = n.fullPath.substring(0, n.fullPath.length);
                        n.size = `${ size % Math.pow(10,6) == size ? `${ size % Math.pow(10,3) == size ? `小于1KB` : `${(size / Math.pow(10,3)).toFixed(1)}KB`}` : `${(size / Math.pow(10,6)).toFixed(1)}MB`}`;
                        n.createTime = fileInfo.birthtime;
                        n.updateTime = fileInfo.mtime;
                    }
                });
                if (!newFileList) {
                    scope.directoryList.push([]);
                }
                scope.directoryList.push(newFileList.filter(n => n.type == EntityType.Folder && !ExcludeDirectories.includes(n['name']) && n.name.indexOf('$')!=0 ).sort(compareDirName));
                scope.directoryList[scope.directoryList.length-1].push.apply(scope.directoryList[scope.directoryList.length-1], newFileList.filter(n => fileFilter(n)).sort(compareDirName));
                setTimeout(() => {
                    document.getElementById('scroll-container').scrollLeft = document.getElementById('scroll-container').scrollWidth;
                }, 100);
            }
        
            function init(){
                scope.selectedItem = null;
                scope.directoryList = [];
                scope.directoryList.push([]);
                getDiskList();
            }
        
            init();
        }
    };
}]);

}());