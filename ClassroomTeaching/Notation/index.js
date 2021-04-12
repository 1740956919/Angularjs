(function ()
{
'use strict';

angular.module('ClassroomTeaching.Notation', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'LINDGE-Platform',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation'
])

.constant('Fabric', window.fabric)

.constant('IS_ELECTRON', window.process && window.process.type)

.constant('NOTATION_CONSTANTS', {
    URL: {
        NotationImg: 'image',
        ExportPath: 'export',
        ActionId: 'actionid',
        LessonId: 'lessonid'
    }
})

.factory('$node', ['IS_ELECTRON', function (IS_ELECTRON) {
    if (IS_ELECTRON) {
        return {
            fs: require('fs'),
            path: require('path'),
            Buffer: window.Buffer
        };
    } else {
        return {};
    }
}])

.controller('MainCtrl', ['$scope', '$q', 'Fabric', 'queryString', 'IS_ELECTRON', 'NOTATION_CONSTANTS', '$node', 'behaviorSynchronizer',
function ($scope, $q, Fabric, queryString, IS_ELECTRON, NOTATION_CONSTANTS, $node, behaviorSynchronizer) {
    /* -------------------- global objects and definitions -------------------- */
    var lessonId = queryString.get(NOTATION_CONSTANTS.URL.LessonId);

    var canvas = null;
    var undoManager = null;

    var elms = {
        canvasBg: null
    };

    var backgroundColors = [{
        name: '当前\n画面',
        color: 'url()'
    }, {
        name: '黑板',
        color: '#000000'
    }, {
        name: '白板',
        color: '#ffffff'
    }];

    var brushColors = [{
        name: '橙色',
        color: '#ff6f20'
    }, {
        name: '红色',
        color: '#d62111'
    }, {
        name: '蓝色',
        color: '#353fdf'
    }, {
        name: '黑色',
        color: '#000000',
        outline: true
    }, {
        name: '白色',
        color: '#ffffff'
    }];

    var brushSizes = [{
        name: '尺寸：大',
        size: 20,
        iconScale: 1.0
    }, {
        name: '尺寸：中',
        size: 12,
        iconScale: 0.8
    }, {
        name: '尺寸：小',
        size: 6,
        iconScale: 0.6
    }];

    var settings = {
        brushSize: brushSizes[2].size,
        brushColor: brushColors[1].color,
        bgColor: backgroundColors[1].color
    };

    $scope.isInitiating = false;
    $scope.lockScreen = false;

    $scope.settings = settings;
    $scope.backgroundColors = backgroundColors;
    $scope.brushColors = brushColors;
    $scope.brushSizes = brushSizes;

    $scope.undoManager = null;

    /* -------------------- action record -------------------- */
    var recordSynchronizer = null;

    function saveActionRecord(pictureFile) {
        if (recordSynchronizer) {
            recordSynchronizer.writeData({ Picture: pictureFile });
        }
    }

    /* -------------------- image exporting -------------------- */
    var exportDir = queryString.get(NOTATION_CONSTANTS.URL.ExportPath, true);
    var imgIndex = 1;
    var exportFormat = 'jpeg';

    function getNextFileName() {
        var name = `${imgIndex}.${exportFormat}`;
        imgIndex++;

        return name;
    }

    function downloadCanvasImg(canvas) {
        // for debug only
        var dataUrl = canvas.toDataURL(`image/${exportFormat}`, 1);

        var download = document.createElement('a');
        download.href = dataUrl;
        download.target = '_blank';
        download.download = `output_${getNextFileName()}`;

        var evt = document.createEvent('MouseEvent');
        evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        download.dispatchEvent(evt);

        return download.download;
    }

    function saveCanvasImg(canvas) {
        var dataUrl = canvas.toDataURL(`image/${exportFormat}`, 1);

        // rip off base64 prefix
        var idx = dataUrl.indexOf('base64,');
        if (idx >= 0) {
            idx += 7;
            if (dataUrl.charAt(idx) === ' ') {
                idx += 1;
            }
            dataUrl = dataUrl.substr(idx);
        }

        var fileName = getNextFileName();
        var outputPath = $node.path.join(exportDir, fileName);
        // base64 string to Buffer
        var imgData = $node.Buffer.from(dataUrl, 'base64');
        $node.fs.writeFileSync(outputPath, imgData);

        return fileName;
    }

    function exportImage(canvas) {
        function drawNotationsAndExport(outputCanvas, srcCanvas, defer) {
            var outputCtx = outputCanvas.getContext('2d');
            outputCtx.drawImage(srcCanvas, 0, 0);

            var fileName;
            if (IS_ELECTRON) {
                fileName = saveCanvasImg(outputCanvas);
            } else {
                fileName = downloadCanvasImg(outputCanvas);
            }

            saveActionRecord(fileName);

            if (defer) {
                defer.resolve();
            }
        }

        var defer = $q.defer();

        var canvasElm = canvas.getElement();
        var bgElm = elms.canvasBg;

        var outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvasElm.width;
        outputCanvas.height = canvasElm.height;

        var outputCtx = outputCanvas.getContext('2d');

        // set background
        if (bgElm.style.backgroundImage) {
            canvasElm = canvas.toCanvasElement();       // clone the canvas since image loading is async

            var img = new Image();      // create image element to load the image data
            img.src = bgElm.style.backgroundImage.substr(5, bgElm.style.backgroundImage.length - 7);    // the format should be `url("xxx")`
            img.onload = function () {
                var imgRatio = img.width / img.height;
                var canvasRatio = outputCanvas.width / outputCanvas.height;

                var scale;
                if (imgRatio > canvasRatio) {
                    scale = outputCanvas.width / img.width;
                    outputCtx.drawImage(
                        img,
                        0,
                        (outputCanvas.height - scale * img.height) / 2,
                        outputCanvas.width,
                        scale * img.height
                    );
                } else {
                    scale = outputCanvas.height / img.height;
                    outputCtx.drawImage(
                        img,
                        (outputCanvas.width - scale * img.width) / 2,
                        0,
                        scale * img.width,
                        outputCanvas.height
                    );
                }

                drawNotationsAndExport(outputCanvas, canvasElm, defer);
            };

            img.onerror = function () {
                defer.reject();
            };
        } else if (bgElm.style.backgroundColor) {
            outputCtx.fillStyle = bgElm.style.backgroundColor;
            outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
            drawNotationsAndExport(outputCanvas, canvasElm);
            defer.resolve();
        }

        return defer.promise;
    }

    /* -------------------- class record notification -------------------- */
    function notifyClassRecord() {
        if (IS_ELECTRON) {
            var { ipcRenderer } = require('electron');
            return ipcRenderer.invoke('AddRecord', {
                lessonId: lessonId,
                action: 'CLEAR_MARK',
                content: '教师板书',
                needCapture: true
            });
        } else {
            var defer = $q.defer();
            defer.resolve();
            return defer.promise;
        }
    }

    /* -------------------- ui handles -------------------- */
    function angularNotify() {
        $scope.$evalAsync(angular.noop);
    }

    function updateBgBoard(color) {
        if (color.startsWith('url(')) {
            elms.canvasBg.style.backgroundImage = color;
        } else {
            elms.canvasBg.style.backgroundImage = '';
            elms.canvasBg.style.backgroundColor = color;
        }
    }

    $scope.setBackgroundColor = function (colorInfo) {
        function udpateBg() {
            settings.bgColor = colorInfo.color;
            updateBgBoard(settings.bgColor);
        }

        if (colorInfo.color != settings.bgColor) {
            if (!canvas.isEmpty()) {
                // exportImage(canvas);

                $scope.lockScreen = true;
                notifyClassRecord()
                    .finally(() => {
                        udpateBg();
                        $scope.lockScreen = false;
                        angularNotify();
                    });
            } else {
                udpateBg();
            }
        }
    };

    $scope.setBrushColor = function (colorInfo) {
        settings.brushColor = colorInfo.color;
        canvas.freeDrawingBrush.color = settings.brushColor;
    };

    $scope.setBrushSize = function (sizeInfo) {
        settings.brushSize = sizeInfo.size;
        canvas.freeDrawingBrush.width = settings.brushSize;
    };

    $scope.clearScreen = function () {
        if (!canvas.isEmpty()) {
            // exportImage(canvas);

            $scope.lockScreen = true;
            notifyClassRecord()
                .finally(() => {
                    canvas.clear();
                    undoManager.apply();

                    $scope.lockScreen = false;
                    angularNotify();
                });
        }
    };

    /* -------------------- initiation -------------------- */

    function initCanvas () {
        function resizeCanvas (canvas) {
            var mainContainer = document.getElementById('notation-area');
            var rect = mainContainer.getBoundingClientRect();
            canvas.setWidth(rect.width);
            canvas.setHeight(rect.height);
            canvas.calcOffset();
        }

        // create fabric canvas
        var canvasElm = document.getElementById('notation-canvas');
        var fabricCanvas = new Fabric.Canvas(
            canvasElm,
            {
                isDrawingMode: true,
                containerClass: 'canvas-container'
            }
        );

        // setup window resizing
        window.addEventListener('resize', evt => {
            resizeCanvas(fabricCanvas);
        });

        resizeCanvas(fabricCanvas);

        // setup painting brush
        var brush = new Fabric.PencilBrush(fabricCanvas);
        brush.width = settings.brushSize;
        brush.color = settings.brushColor;
        fabricCanvas.freeDrawingBrush = brush;

        return fabricCanvas;
    }

    function initCanvasBg () {
        var container = document.body.querySelector('.canvas-container');

        var bgBoard = document.createElement('div');
        bgBoard.classList.add('background');
        container.prepend(bgBoard);

        return bgBoard;
    }

    function initUndoManager(canvas, maxHistorySize) {
        var undoManager = {
            _isProcessing: false,
            _nextState: null,

            maxSteps: maxHistorySize || -1,
            redoQueue: [],
            undoQueue: [],

            canUndo: false,
            canRedo: false,

            undo: undo,
            redo: redo,
            apply: apply
        };

        function updateUndoState() {
            undoManager.canUndo = undoManager.undoQueue.length > 0;
            undoManager.canRedo = undoManager.redoQueue.length > 0;
        }

        function getNextState() {
            return JSON.stringify(canvas.toDatalessJSON());
        }

        function saveHistory() {
            if (!undoManager._isProcessing) {
                var state = undoManager._nextState;
                undoManager.undoQueue.push(state);

                if (undoManager.undoQueue.length > maxHistorySize) {
                    undoManager.undoQueue.shift();
                }

                undoManager.redoQueue.length = 0;

                updateUndoState();
                undoManager._nextState = getNextState();

                angularNotify();
            }
        }

        function undo() {
            undoManager._isProcessing = true;

            try {
                var state = undoManager.undoQueue.pop();
                if (state) {
                    canvas.loadFromJSON(state).renderAll();

                    undoManager.redoQueue.push(undoManager._nextState);
                    undoManager._nextState = state;
                }

                updateUndoState();
            } finally {
                undoManager._isProcessing = false;
            }
        }

        function redo() {
            undoManager._isProcessing = true;

            try {
                var state = undoManager.redoQueue.pop();
                if (state) {
                    canvas.loadFromJSON(state).renderAll();

                    if (undoManager._nextState) {
                        undoManager.undoQueue.push(undoManager._nextState);
                    }

                    undoManager._nextState = state;

                    updateUndoState();
                }
            } finally {
                undoManager._isProcessing = false;
            }
        }

        function apply() {
            undoManager._nextState = getNextState();
            undoManager.undoQueue.length = 0;
            undoManager.redoQueue.length = 0;
            updateUndoState();
        }

        canvas.on({
            'object:added': saveHistory,
            'object:removed': saveHistory,
            'object:modified': saveHistory
        });

        undoManager._nextState = getNextState();

        return undoManager;
    }

    function setupGlobalShortcut() {
        window.addEventListener('keydown', evt => {
            function isCtrlOnly (evt) {
                return evt.ctrlKey && !evt.altKey && !evt.shiftkey;
            }

            switch (evt.keyCode) {
                case 90:    // Z
                    if (isCtrlOnly(evt) && undoManager.canUndo) {
                        undoManager.undo();
                        angularNotify();
                    }
                    break;
                case 89:    // Y
                    if (isCtrlOnly(evt) && undoManager.canRedo) {
                        undoManager.redo();
                        angularNotify();
                    }
                    break;
                case 67:    // C
                    if (isCtrlOnly(evt)) {
                        $scope.clearScreen();
                        angularNotify();
                    }
                    break;
            }
        });
    }

    function loadDefualtBgPicture() {
        var bgPath;
        if (IS_ELECTRON) {
            bgPath = queryString.get(NOTATION_CONSTANTS.URL.NotationImg, true);
        } else {
            bgPath = null;
        }

        if (!!bgPath) {
            var type = $node.path.extname(bgPath) || '.png';
            type = type.substr(1);

            var buffer = $node.fs.readFileSync(bgPath);
            var base64 = buffer.toString('base64');
            backgroundColors[0].color = `url(data:image/${type};base64,${base64})`;

            $scope.setBackgroundColor(backgroundColors[0]);
        } else {
            // remove current picture item
            // backgroundColors.shift();
        }
    }

    function init() {
        $scope.isInitiating = true;

        canvas = initCanvas();

        elms.canvasBg = initCanvasBg();
        updateBgBoard(settings.bgColor);

        undoManager = initUndoManager(canvas, 40);
        $scope.undoManager = undoManager;

        setupGlobalShortcut();

        try {
            loadDefualtBgPicture();
        } catch (err) {
            console.error(`load default background picture failed: ${err}`);
        }

        var actionId = queryString.get(NOTATION_CONSTANTS.URL.ActionId);
        if (actionId) {
            var synchronizer = behaviorSynchronizer.create(false).id(actionId);
            synchronizer.begin()
                .then(() => {
                    recordSynchronizer = synchronizer;
                }, () => {
                    console.error('create behavior synchronizer failed');
                })
                .finally(() => {
                    $scope.isInitiating = false;
                });
        } else {
            $scope.isInitiating = false;
        }
    }

    init();
}]);

}());