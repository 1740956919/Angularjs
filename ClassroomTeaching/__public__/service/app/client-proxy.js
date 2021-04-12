// 为保证渲染进程代码可以在页面正常运行，添加debug代码
var ipcRenderer;
if(typeof require == 'function'){
    ipcRenderer = require('electron').ipcRenderer;
} else {
    ipcRenderer = {
        send: function (code, data) { }
    };
}

(function ()
{

'use strict';

// client proxy
angular.module('Client.Services.ClientProxy', [])

.factory('$clientProxy', [function () {

    function sendMessage (code, data) {
        ipcRenderer.send(code, data || '');
    }

    function sendJsonMessage (code, data) {
        ipcRenderer.send(code, JSON.stringify(data) || '');
    }

    function hideWindow (routeString) {
        ipcRenderer.send('HideWindow', routeString);
    }

    function showWindow (routeObject) {
        ipcRenderer.send('ShowWindow', routeObject);
    }

    function getDiskList () {
        return ipcRenderer.invoke('get-diskinfo');
    }

    function downloadFile (options) {
        return ipcRenderer.invoke('download-file', options);
    }

    function downloadMessageFile (options) {
        return ipcRenderer.invoke('download-message-file', options);
    }

    function getToken () {
        return ipcRenderer.invoke('GetToken');
    }

    function retriveDownloadInfo (data) {
        return ipcRenderer.invoke('query-downloadinfo', data);
    }
    
    function addRecord (data) {
        return ipcRenderer.invoke('AddRecord', data);
    }


    function downloadReportFile (options) {
        return ipcRenderer.invoke('download-report-file', options);
    }

    return {
        sendMessage: sendMessage,
        sendJsonMessage: sendJsonMessage,
        getDiskInfo: getDiskList,
        downloadFile: downloadFile,
        getToken: getToken,
        retriveDownloadInfo: retriveDownloadInfo,
        downloadMessageFile: downloadMessageFile,
        hideWindow: hideWindow,
        showWindow: showWindow,
        addRecord: addRecord,
        downloadReportFile: downloadReportFile,
    };

}]);

}());