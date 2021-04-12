(function ()
{
'use strict';

angular.module('ClassroomTeaching.BrainStorming', [
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'LINDGE-Platform',
    'ClassroomTeaching.BrainStorming.Service',
    'ClassroomTeaching.BrainStorming.Control.SplitterView',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'ClassroomTeaching.ErrorService'
])

.constant('BS_CONSTANTS', {
    URL: {
        BSId: 'id',
        Readonly: 'readonly',
        State: 'state'
    },
    BS_STATES: {
        Preparing: 'PREPARING',
        Discussing: 'DISCUSSING',
        Completed: 'COMPLETED'
    },
    COLOR_CODES: [{ r: 255, g: 147, b: 25 }, { r: 249, g: 237, b: 90 }, { r: 178, g: 230, b: 251 }, { r: 233, g: 163, b: 184 }, { r: 156, g: 88, b: 253 }]
})

.constant('TOOLBAR_CONFIG', {
    control: {
        showStopButton: true,
        showCompleteButton: true,
        showJoinCount: true,
        showDuration: true,
        showToolbarUnderReviewing: true,
        lifecycleServiceName: "classroomteaching_brainstorming"
    },    
    controlled: {
        showStopButton: false,
        showCompleteButton: false,
        showJoinCount: false,
        showDuration: false,
        showToolbarUnderReviewing: false,
        lifecycleServiceName: "classroomteaching_brainstorming"
    },    
    review: {
        showStopButton: false,
        showCompleteButton: false,
        showJoinCount: false,
        showDuration: false,
        showToolbarUnderReviewing: false,
        lifecycleServiceName: "classroomteaching_brainstorming"
    }
})

.constant('IS_ELECTRON', window.process && window.process.type)

.service('$backdrop', [function () {
    this.showBackdrop = function (backdrop, onShow) {
        backdrop.css('display', '');
        setTimeout(() => {
            backdrop.css('opacity', 1);

            if (onShow) {
                setTimeout(() => {
                    onShow();
                }, 300);
            }
        }, 50);
    };

    this.hideBackdrop = function (backdrop) {
        backdrop.css('opacity', 0);
        setTimeout(() => {
            backdrop.css('display', 'none');
        }, 210);
    };

    function disableBackdrop(elm, disable) {
        if (disable) {
            elm.attr('backdrop-disabled', 'true');
        } else {
            elm.attr('backdrop-disabled', 'false');
        }
    }

    function isBackdropDisabled(elm) {
        return elm.attr('backdrop-disabled') == 'true';
    }

    this.configClickOutsideToClose = function (backdrop, onClose) {
        backdrop.bind('click pointerdown', evt => {
            if (!isBackdropDisabled(backdrop)) {
                evt.preventDefault();
                evt.stopPropagation();
                
                if (evt.srcElement === backdrop[0]) {
                    this.hideBackdrop(backdrop);

                    if (onClose) {
                        onClose();
                    }
                }
            }
        });
    };

    this.disableBackdropEvents = function (backdrop) {
        disableBackdrop(backdrop, true);
    };

    this.restoreBackdropEvents = function (backdrop) {
        disableBackdrop(backdrop, false);
    };
}])

.service('$notePreviewer', ['$backdrop', '$q', function ($backdrop, $q) {
    var ne = angular.element;

    var previewContainer = ne(document.getElementById('note-preview-container'));
    var previewElm = ne(previewContainer[0].querySelector('.note-previewer'));
    var contentElm = ne(previewElm[0].querySelector('.note-content'));

    var minimizeBtn = ne(previewContainer[0].querySelector('.mini-btn'));
    var removeBtn = ne(previewContainer[0].querySelector('.remove-btn'));

    var returnBtn = ne(previewContainer[0].querySelector('.return-btn'));
    var createBtn = ne(previewContainer[0].querySelector('.create-btn'));

    var currentDefer = null;

    function notifyPreviewAction(action) {
        if (currentDefer) {
            currentDefer.resolve(action);
            currentDefer = null;
        }
    }

    var backdropShown = false;

    minimizeBtn.bind('click pointerdown', evt => {
        if(backdropShown) {
            $backdrop.hideBackdrop(previewContainer);
            notifyPreviewAction('close');
        }
    });

    removeBtn.bind('click pointerdown', evt => {
        if(backdropShown) {
            $backdrop.hideBackdrop(previewContainer);
            notifyPreviewAction('delete');
        }
    });

    returnBtn.bind('click pointerdown', evt => {
        if(backdropShown) {
            $backdrop.hideBackdrop(previewContainer);
            notifyPreviewAction('return');
        }
    });

    createBtn.bind('click pointerdown', evt => {
        if(backdropShown) {
            $backdrop.hideBackdrop(previewContainer);
            notifyPreviewAction('create');
        }
    });

    this.previewNote = function (noteInfo) {
        previewElm.css('background-color', noteInfo.contentColor);
        contentElm[0].innerText = noteInfo.content;
        contentElm[0].scrollTop = 0;

        $backdrop.disableBackdropEvents(previewContainer);

        backdropShown = false;
        $backdrop.showBackdrop(previewContainer, () => {
            $backdrop.restoreBackdropEvents(previewContainer);
            backdropShown = true;
        });

        var defer = $q.defer();
        currentDefer = defer;
        return defer.promise;
    };

    $backdrop.configClickOutsideToClose(previewContainer, () => {
        notifyPreviewAction('close');
    });
}])

.service('$noteCategoryCreator', ['$backdrop', '$q', '$log', 'lplBehavior', 'ExecutionQueue', 'remoteInputService',
function ($backdrop, $q, $log, lplBehavior, ExecutionQueue, remoteInputService) {
    var ne = angular.element;

    var creatorContainer = ne(document.getElementById('note-category-create-container'));
    var titleInput = ne(creatorContainer[0].querySelector('input'));
    var clearBtn = ne(creatorContainer[0].querySelector('button'));
    var noteItems = Array.from(creatorContainer[0].querySelectorAll('.note-item')).map(ne);

    var isOpen = false;
    var currentDefer = null;
    var watchId = null;
    var watcherHandle = -1;
    var backdropShown = false;

    function moveCursorToEnd(el) {
        if (document.activeElement !== el) {
            el.focus();
        }

        var length = el.value.length;
        el.setSelectionRange(length, length);
    }

    function reset(argument) {
        currentDefer = null;
        watchId = null;
        watcherHandle = -1;
        isOpen = false;
    }

    function stopWatchInput() {
        if (watcherHandle >= 0) {
            clearTimeout(watcherHandle);
            watcherHandle = -1;
        }
    }

    function cancelInput(id) {
        remoteInputService.cancelRemoteInput({ id: id }).$promise.catch(err => {
            $log.error("取消远程输入失败", err);
        });
    }

    function beginWatchInput(bsId, onEnd) {
        ExecutionQueue.create(1, true)
            .addTask(next => {
                remoteInputService.beginRemoteInput(
                    { id: bsId },
                    null,
                    result => {
                        if (isOpen) {
                            watchId = result.BehaviorId;
                            next(null);
                        } else {
                            cancelInput(result.BehaviorId);
                        }
                    },
                    err => {
                        $log.error("开始获取远程输入失败", err);
                        next(err);
                    }
                );
            })
            .addTask(next => {
                function watch() {
                    remoteInputService.getRemoteInput(
                        { id: watchId },
                        result => {
                            titleInput.val(result.InputContent);
                            moveCursorToEnd(titleInput[0]);

                            if (result.IsCompleted) {
                                watcherHandle = -1;
                                watchId = null;
                                onEnd();
                                next(null);
                            } else {
                                watcherHandle = setTimeout(watch, 800);
                            }
                        },
                        err => {
                            $log.error("获取远程输入结果失败", err);
                            watcherHandle = setTimeout(watch, 800);
                        }
                    );
                }

                watch();
            });
    }

    function notifyResult() {
        var title = titleInput.val().trim();
        if (title) {
            currentDefer.resolve({
                title: title
            });
            stopWatchInput();
            $backdrop.hideBackdrop(creatorContainer);
            reset();
        }
    }

    function closeCategoryCreateDialog() {
        if (currentDefer) {
            currentDefer.reject();
        }

        stopWatchInput();

        if (watchId) {
            cancelInput(watchId);
        }

        reset();
    }

    this.beginCreateCategory = function (bsId, defaultTitle, note1, note2) {
        currentDefer = $q.defer();

        noteItems[0].css('background-color', note1.contentColor);
        noteItems[0].children().eq(0).text(note1.content);
        if (note2) {
            noteItems[1].css('background-color', note2.contentColor);
            noteItems[1].children().eq(0).text(note2.content);
        }
        titleInput.val(defaultTitle || '');

        isOpen = true;
        backdropShown = false;
        $backdrop.disableBackdropEvents(creatorContainer);
        $backdrop.showBackdrop(creatorContainer, () => {
            $backdrop.restoreBackdropEvents(creatorContainer);
            backdropShown = true;
        });

        currentDefer.promise.finally(() => {
            currentDefer = null;
        });

        beginWatchInput(bsId, () => {
            notifyResult();
        });

        return currentDefer.promise;
    };

    $backdrop.configClickOutsideToClose(creatorContainer, () => {
        if(backdropShown) {
            closeCategoryCreateDialog();
        }
    });

    titleInput.bind('keydown', evt => {
        if (evt.keyCode == 13 && currentDefer) {
            closeCategoryCreateDialog();
            $backdrop.hideBackdrop(creatorContainer);
            //notifyResult();
        }
    });

    clearBtn.bind('click', evt => {
        titleInput.val('');
        titleInput[0].focus();
    });
}])

.service('$noteUtil', [function () {
    const NOTE_ROOT_CLS = 'note-container';

    /**
     * check element is a note
     *
     * @param {Element}   elm
     * @return {boolean}
     */
    function isNoteElm(elm) {
        return !!elm && elm.classList.contains(NOTE_ROOT_CLS);
    }

    /**
     * recursively find note element and extract data from it
     *
     * @param  {Element}    elm
     * @param  {Function?}  callback  data extract callback
     * @return {Any}
     */
    function _extractNoteInfoFromElm(elm, callback) {
        if (isNoteElm(elm)) {
            if (callback) {
                return callback(elm);
            } else {
                return elm;
            }
        } else {
            if (elm.tagName == 'BODY') {
                return null;
            } else {
                return _extractNoteInfoFromElm(elm.parentElement, callback);
            }
        }
    }

    /**
     * get container and note id from element
     *
     * @param  {Element}  elm
     * @return {[String, String]}
     */
    function getNoteId(elm) {
        var ids = _extractNoteInfoFromElm(elm, e => {
            var path = e.getAttribute('note-path');
            return path.split('/');
        });

        return ids || [];
    }

    /**
     * get note root element
     *
     * @param  {Element}  elm
     * @return {Element}
     */
    function getNoteElm(elm) {
        return _extractNoteInfoFromElm(elm, null);
    }

    /**
     * get drag area root element
     *
     * @param  {Element}  elm
     * @return {Element}
     */
    function getDragArea(elm) {
        if (elm.hasAttribute('note-drag-area')) {
            return elm;
        } else {
            if (elm.tagName == 'BODY') {
                return null;
            } else {
                return getDragArea(elm.parentElement);
            }
        }
    }

    /**
     * get data bound with drag area
     *
     * @param  {Element}  elm
     * @return {[String, String?]}
     */
    function getDragAreaData(elm) {
        var name = elm.getAttribute('note-drag-area');
        var data = elm.getAttribute('note-drag-data') || null;

        return [name, data];
    }

    this.getNoteElm = getNoteElm;
    this.getNoteId = getNoteId;

    /* -------------------- spacial math functions -------------------- */

    /**
     * calculates square distance between two points
     *
     * @param  {[Number, Number]} p1   first point
     * @param  {[Number, Number]} p2   second point
     * @return {Number}
     */
    function computeDistance2(p1, p2) {
        var dx = p2[0] - p1[0];
        var dy = p2[1] - p1[1];

        return dx * dx + dy * dy;
    }

    /* -------------------- html events helpers -------------------- */

    /**
     * register event callback to outest element
     *
     * @param {String}    name          event name
     * @param {Function}  callback
     */
    function addGlobalEventCallback(name, callback) {
        document.body.addEventListener(name, callback);
    }

    /**
     * remove event callback from outest element
     *
     * @param {String}    name          event name
     * @param {Function}  callback
     */
    function removeGlobalEventCallback(name, callback) {
        document.body.removeEventListener(name, callback);
    }

    this.addGlobalEventCallback = addGlobalEventCallback;
    this.removeGlobalEventCallback = removeGlobalEventCallback;

    function monitorSinglePointEvent(elm, acceptCallback, actionCallback) {
        var currentEvt = null;
        var waitHandle = -1;

        elm.addEventListener('pointerdown', evt => {
            if (currentEvt) {
                currentEvt = null;
                clearTimeout(waitHandle);
            } else {
                currentEvt = evt;
                waitHandle = setTimeout(() => {
                    if (acceptCallback(evt)) {
                        actionCallback(evt);
                    }

                    currentEvt = null;
                    waitHandle = -1;
                }, 10);
            }
        });

        elm.addEventListener('pointerup', (evt) => {
            if (currentEvt) {
                currentEvt = null;
                clearTimeout(waitHandle);
            }
        });
    }
    
    var isScrolling = false;

    function configNotePointerActions(container, options, callbacks) {
        var isDragging = false;

        var srcPoint = [0, 0];
        var currentPoint = [0, 0];
        var elmSrcPoint = [0, 0];

        var noteItem = null;
        var newNoteContainer = null;
        var newNoteItem = null;
        var collisionElm = null;
        var dragAreaItem = null;

        function markCollision(elm, mark) {
            if (mark) {
                elm.classList.add('focused');
            } else {
                elm.classList.remove('focused');
            }
        }

        function markDragArea(item, mark) {
            if (mark) {
                item.elm.classList.add('focused');
            } else {
                item.elm.classList.remove('focused');
            }
        }

        function releaseCurrentDragArea(accept) {
            if (dragAreaItem) {
                let [collectionId, noteId] = getNoteId(noteItem[0]);
                callbacks.onExitDragArea(dragAreaItem.name, dragAreaItem.data, accept, collectionId, noteId);
                markDragArea(dragAreaItem, false);
                dragAreaItem = null;
            }
        }

        function checkNoteUnderMouse(evt) {
            newNoteContainer[0].hidden = true;

            var elmUnderMouse = getNoteElm(document.elementFromPoint(evt.pageX, evt.pageY));
            if (elmUnderMouse !== collisionElm) {
                if (collisionElm) {
                    markCollision(collisionElm, false);
                }

                if (elmUnderMouse) {
                    if (elmUnderMouse.getAttribute('categorized') != 'true') {
                        var [cid, noteId] = getNoteId(elmUnderMouse);
                        if (callbacks.onCheckNoteCollision(cid, noteId, noteItem) && noteItem[0].parentElement != document.elementFromPoint(evt.pageX, evt.pageY)
                        && noteItem[0] != document.elementFromPoint(evt.pageX, evt.pageY)) {
                            markCollision(elmUnderMouse, true);
                        } else {
                            elmUnderMouse = null;
                        }
                    } else {
                        elmUnderMouse = null;
                    }
                }

                collisionElm = elmUnderMouse;

                if (collisionElm != null && dragAreaItem) {
                    releaseCurrentDragArea();
                }
            }

            newNoteContainer[0].hidden = false;

            return !!collisionElm;
        }

        function checkAreaUnderMouse(evt) {
            newNoteContainer[0].hidden = true;

            var dragArea = getDragArea(document.elementFromPoint(evt.pageX, evt.pageY));
            if (dragArea) {
                var [name, data] = getDragAreaData(dragArea);
                if (!dragAreaItem || dragAreaItem.name != name || dragAreaItem.data != data) {
                    if (dragAreaItem) {
                        releaseCurrentDragArea();
                    }
                    let [collectionId, noteId] = getNoteId(noteItem[0]);

                    if (callbacks.onAcceptDragArea(name, data, collectionId)) {
                        dragAreaItem = {
                            name: name,
                            data: data,
                            elm: dragArea
                        };

                        markDragArea(dragAreaItem, true);
                        callbacks.onEnterDragArea(name, data, noteItem);
                    }
                }
            } else {
                if (dragAreaItem) {
                    releaseCurrentDragArea();
                }
            }

            newNoteContainer[0].hidden = false;
        }

        function configTouchScroll(container, callbacks) {
            var touchActived = false;
    
            container.addEventListener('touchmove', evt => {
                if (!touchActived || evt.touches.length < 2) {
                    evt.preventDefault();
                    evt.stopPropagation();
                }
            }, { passive: false });
    
            container.addEventListener('touchend', evt => {
                if (touchActived) {
                    touchActived = false;
                    callbacks.onTouchScrollEnd();
                }
            });
    
            container.addEventListener('touchstart', function (evt) {
                if (evt.touches.length > 1) {
                    touchActived = true;
                    callbacks.onTouchScrollBegin();
                }
            }, { passive: false });
        }
        
        var splitterBar = document.getElementsByTagName('splitter-scrubber')[0];

        
        function updateNotePos() {
            var offsetX = currentPoint[0] - srcPoint[0];
            var offsetY = currentPoint[1] - srcPoint[1];
            newNoteContainer[0].children[0].innerText = noteItem[0].innerText;
            newNoteContainer.css({ left: (elmSrcPoint[0] + offsetX) + 'px', top: (elmSrcPoint[1] + offsetY) + 'px'});
        }

        function restoreDrag() {
            let backgroundColor = noteItem[0].getAttribute('transparent-color');
            let noteItemFather = angular.element(noteItem[0].parentElement);
            noteItemFather.css({ 'background': backgroundColor });
            newNoteContainer.remove();
            noteItem.css('opacity','1');
        }

        function moveHandle(evt) {
            evt.preventDefault();
            evt.stopPropagation();

            currentPoint = [evt.pageX, evt.pageY];
            if(isScrolling || splitterBar.getAttribute('trigger') == 'true') {
                releaseHandle(evt);
                return;
            }
            if (isDragging && !isScrolling) {
                let parentElement = angular.element(noteItem[0].parentElement);
                let backgroundColor = noteItem[0].parentElement.getAttribute('transparent-color');
                parentElement.css({ 'background': backgroundColor});
                updateNotePos();
                var checkFinished = false;

                if (options.enableNoteCollide) {
                    checkFinished = checkNoteUnderMouse(evt);
                }

                if (!checkFinished && options.enableAreaDetect) {
                    checkFinished = checkAreaUnderMouse(evt);
                }
            } else {
                if (callbacks.canDragNote() && !isScrolling && computeDistance2(currentPoint, srcPoint) > 100) {
                    isDragging = true;
                    splitterBar.setAttribute('isScrolling', 'true');
                    splitterBar.classList.add('scrolling');
                    noteItem.css('opacity','0');
                    let rect = noteItem[0].getBoundingClientRect();
                    elmSrcPoint = [rect.x, rect.y];
                    
                    newNoteContainer = angular.element(`<div class="note-new-container" style="background:${noteItem.css('background')}"><div class="note-new-item"></div</div>`);
                    angular.element(document.getElementsByTagName('body')[0]).append(newNoteContainer);
                    updateNotePos();

                    callbacks.onBeginDragNote(noteItem);
                }
            }
        }

        function releaseHandle(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            splitterBar.setAttribute('isScrolling', 'false');
            splitterBar.classList.remove('scrolling');
            if(splitterBar.getAttribute('trigger') == 'true'){
                splitterBar.removeAttribute('trigger');
            }
            if (isDragging) {
                if (collisionElm) {
                    var [collideCollectionId, collideNoteId] = getNoteId(collisionElm);
                    var [srcCollectionId, srcNoteId] = getNoteId(noteItem[0]);
                    var promise = callbacks.onNoteCollided(srcCollectionId, srcNoteId, collideCollectionId, collideNoteId);
                    if (promise) {
                        promise.then(() => {
                            //
                        }, () => {
                            restoreDrag();
                        })
                        .finally(() => {
                            markCollision(collisionElm, false);
                            newNoteContainer.remove();
                        });
                    } else {
                        restoreDrag();
                    }
                } else if (dragAreaItem) {
                    releaseCurrentDragArea(true);
                    restoreDrag();
                } else {
                    restoreDrag();
                }
            } else {
                if (evt.srcElement) {
                    if (callbacks.canClickNote() && !isScrolling) {
                        var [collectionId, noteId] = getNoteId(evt.srcElement);
                        callbacks.onNoteClicked(collectionId, noteId);
                    }
                }
            }

            removeGlobalEventCallback('pointermove', moveHandle);
            removeGlobalEventCallback('pointerup', releaseHandle);

            callbacks.onFinishDragNote();
            isDragging = false;
        }

        monitorSinglePointEvent(
            container[0],
            evt => evt.srcElement && evt.button <= 0 && !isDragging,
            evt => {
                var [_, noteId] = getNoteId(evt.srcElement);
                if (noteId && !isScrolling && !isDragging) {
                    noteItem = angular.element(getNoteElm(evt.srcElement).children[0]);
                    srcPoint = [evt.pageX, evt.pageY];
                    currentPoint = srcPoint;

                    addGlobalEventCallback('pointermove', moveHandle);
                    addGlobalEventCallback('pointerup', releaseHandle);
                }
            }
        );

        configTouchScroll(
            document.getElementsByTagName('body')[0],
            {
                onTouchScrollBegin: function () {
                    isScrolling = true;
                },
                onTouchScrollEnd: function () {
                    isScrolling = false;
                }
            }
        );
    }
    
    this.configNotePointerActions = configNotePointerActions;
}])

.controller('MainCtrl', ['$scope', '$log', '$q', 'queryString', '$notePreviewer', '$noteCategoryCreator', 'brainStormingService', 'votingService',
'BS_CONSTANTS', 'IS_ELECTRON', 'lifecycleService', 'TOOLBAR_CONFIG', 'errorService', '$noteUtil',
function ($scope, $log, $q, queryString, $notePreviewer, $noteCategoryCreator, brainStormingService, votingService,
BS_CONSTANTS, IS_ELECTRON, lifecycleService, TOOLBAR_CONFIG, errorService, $noteUtil) {
    var brainStormingId = queryString.get(BS_CONSTANTS.URL.BSId);
    var readonly = queryString.get(BS_CONSTANTS.URL.Readonly) == 'true';
    var state = queryString.get(BS_CONSTANTS.URL.State);
    var areaWidth = {
        leftWidth: 0,
        rightWidth: 0
    };
    var colorCodes = BS_CONSTANTS.COLOR_CODES;
    var toolbarConfigs = TOOLBAR_CONFIG;
    var memberCollections = [];
    var DRAG_HOLDING_TIMEOUT = 200;
    var DRAG_EFFECT_RADIUS = 2000;
    var isDragging = false;
    var isScrolling = false;

    $scope.isLoading = false;
    $scope.isUpdating = false;
    $scope.isLocked = readonly;
    $scope.memberNotes = [];
    $scope.categories = [];
    $scope.allowActions = 'all';
    $scope.toolbarConfig = toolbarConfigs[state];
    $scope.categoryNoteClicked = false;
    $scope.memberNoteClicked = false;

    $scope.brainstormInfo = {
        state: '',
        duringSeconds: 0,
        timer: -1,
        joinCount: 0,
        totalCount: 0
    };

    $scope.voteInfo = {
        isLoading: false,
        timer: -1,
        voteId: '',
        isVoting: false,
        duringSeconds: 0,
        joinCount: 0,
        totalCount: 0,
        voteResult:[]
    };

    var noteCallbacks = {
        onNoteClick: function (authorId, noteId) {
            var note = findMemberNote(authorId, noteId);
            if (note) {
                $scope.memberNoteClicked = true;
                ngRefresh();
                $notePreviewer.previewNote(note).then(action => {
                    if (action == 'delete') {
                        deleteNote(authorId, noteId, false);
                    }
                    if (action == 'create') {
                        $scope.showSecondNote = false;
                        showCreateCategoryDialog(authorId, noteId);
                        ngRefresh();
                    }
                }).finally(() => {
                    $scope.memberNoteClicked = false;
                });
            }
        },
        onNoteCollide: function (srcCollectionId, srcNoteId, destCollectionId, destNoteId) {
            $scope.showSecondNote = true;
            ngRefresh();
            return showCreateCategoryDialog(srcCollectionId, srcNoteId, destCollectionId, destNoteId);
        },
        onMoveToCategory: function (srcCollectionId, categoryId, noteId) {
            var note = removeMemberNote(srcCollectionId, noteId, true);
            if (note) {
                var category = findCategory(categoryId);
                if (category) {
                    category.notes.push(note);
                    ngRefresh();

                    markUpdating(
                        brainStormingService.updateIdeaCategory(
                            { id: brainStormingId, receptor: noteId },
                            { CategoryId: categoryId },
                            null,
                            err => {
                                errorService.showErrorMessage(err);
                            }
                        ).$promise
                    );
                }
            }
        }
    };

    var categoryCallbacks = {
        onNoteClick: function (categoryId, noteId) {
            var note = findCategoryNote(categoryId, noteId);
            if (note) {
                $scope.categoryNoteClicked = true;
                ngRefresh();
                $notePreviewer.previewNote(note).then(action => {
                    if (action == 'delete') {
                        deleteNote(categoryId, noteId, true);
                    }
                    if (action == 'return') {
                        returnCategoryNote(categoryId, noteId);
                    }
                }).finally(() => {
                    $scope.categoryNoteClicked = false;
                });
            }
        },
        onNoteRemoved: function (categoryId, noteId) {
            returnCategoryNote(categoryId, noteId);
        },
        onNoteSwitch: function (srcCategoryId, destCategoryId, noteId) {
            var destCategory = findCategory(destCategoryId);
            var note = removeCategoryNote(srcCategoryId, noteId);
            if (note) {
                markUpdating(
                    brainStormingService.updateIdeaCategory(
                        { id: brainStormingId, receptor: noteId },
                        { CategoryId: destCategoryId },
                        null,
                        err => {
                            errorService.showErrorMessage(err);
                        }
                    ).$promise
                );

                destCategory.notes.push(note);
                ngRefresh();
            }
        }
    };

    function returnCategoryNote(categoryId, noteId) {
        var note = findCategoryNote(categoryId, noteId);
        var memberCollection = findMemberCollection(note);
        memberCollection.notes.push(note);
        note = removeCategoryNote(categoryId, noteId);
        if (note) {
            markUpdating(
                brainStormingService.clearIdeaCategory(
                    { id: brainStormingId, receptor: noteId },
                    { CategoryId: categoryId },
                    null,
                    err => {
                        errorService.showErrorMessage(err);
                    }
                ).$promise);
            ngRefresh();
        }
    }

    function showCreateCategoryDialog (srcCollectionId, srcNoteId, destCollectionId, destNoteId) {
        var defer = $q.defer();

        var srcNote = findMemberNote(srcCollectionId, srcNoteId);
        var destNote = findMemberNote(destCollectionId, destNoteId);
        var defaultTitle = `分类${$scope.categories.length + 1}`;
        var ideaIds = [srcNoteId];
        if (destNoteId) {
            ideaIds.push(destNoteId);
        }
        $noteCategoryCreator.beginCreateCategory(brainStormingId, defaultTitle, srcNote, destNote)
            .then(categoryInfo => {
                markUpdating(
                    brainStormingService.createCategory(
                        { id: brainStormingId },
                        { CategoryName: categoryInfo.title, IdeaIds: ideaIds},
                        result => {
                            removeMemberNote(srcCollectionId, srcNoteId, true);
                            if (destCollectionId && destNoteId) {
                                removeMemberNote(destCollectionId, destNoteId, true);
                            }

                            let categoryParam = {
                                CategoryId: result.CategoryId,
                                Name: categoryInfo.title,
                                VoteCount: 0,
                                IsVoted: false
                            };
                            var category = createCategory(categoryParam);
                            category.notes.push(srcNote);
                            if (destNote) {
                                category.notes.push(destNote);
                            }
                            $scope.categories.push(category);
                            sortCategoryByVote();
                            ngRefresh();

                            defer.resolve();
                        },
                        defer.reject
                    ).$promise
                );
            }, defer.reject);

        return defer.promise;
    }

    function deleteNote (collectionId, noteId, belongCategory) {
        markUpdating(
            brainStormingService.deleteIdea(
                { id: brainStormingId, receptor: noteId },
                result => {
                    if (belongCategory) {
                        removeCategoryNote(collectionId, noteId);
                    } else {
                        removeMemberNote(collectionId, noteId);
                    }
                },
                err => {
                    errorService.showErrorMessage(err);
                }
            )
            .$promise
        );
    }

    function removeMemberNote (authorId, noteId, noDeleteMember) {
        let note = null;
        let memberDeleteIndex = -1;
        let columnDeleteIndex = -1;
        $scope.memberNotes.forEach((column,cIndex) => {
            column.memberCollections.forEach((m, mIndex) => {
                if (m.authorId == authorId) {
                    let deleteIndex = -1;
                    m.notes.forEach((n, index) => {
                        if (n.id == noteId) {
                            deleteIndex = index;
                            note = n;
                            note.authorId = m.authorId;
                        }
                    });
                    if (deleteIndex != -1) {
                        m.notes.splice(deleteIndex, 1);
                        deleteIndex = -1;
                        if (m.notes.length == 0 && !findNoteCategory(authorId) && !noDeleteMember) {
                            memberDeleteIndex = mIndex;
                        }
                        ngRefresh();
                    }
                }
            });
            if (memberDeleteIndex != -1) {
                column.memberCollections.splice(memberDeleteIndex, 1);
                memberDeleteIndex = -1;
                let collectionDeleteIndex = -1;
                memberCollections.forEach((collection, collectionIndex) => {
                    if (collection.authorId == note.authorId) {
                        collectionDeleteIndex = collectionIndex;
                    }
                });
                if(collectionDeleteIndex != -1) {
                    memberCollections.splice(collectionDeleteIndex, 1);
                    collectionDeleteIndex = -1;
                }
                if (column.memberCollections.length == 0) {
                    columnDeleteIndex = cIndex;
                }
            }
        });
        if (columnDeleteIndex != -1) {
            $scope.memberNotes.splice(columnDeleteIndex, 1);
            columnDeleteIndex = -1;
        }
        return note;
    }

    function removeCategoryNote (categoryId, noteId) {
        let note = null;
        let categoryDeleteIndex = -1;
        $scope.categories.forEach((c, cIndex) => {
            if (c.categoryId == categoryId) {
                let deleteIndex = -1;
                c.notes.forEach((n, index) => {
                    if (n.id == noteId) {
                        deleteIndex = index;
                        note = n;
                    }
                });
                if (deleteIndex != -1) {
                    c.notes.splice(deleteIndex, 1);
                    checkMemberWhetherHasIdea(note.authorId);
                    ngRefresh();
                    if(c.notes.length == 0) {
                        categoryDeleteIndex = cIndex;
                    }
                }
            }
        });
        if (categoryDeleteIndex != -1) {
            $scope.categories.splice(categoryDeleteIndex, 1);
            ngRefresh();
        }
        return note;
    }

    function checkMemberWhetherHasIdea(authorId){
        let memberDeleteIndex = -1;
        $scope.memberNotes.forEach(column => {
            column.memberCollections.forEach((m, mIndex) => {
                if (m.authorId == authorId && m.notes.length == 0 && !findNoteCategory(authorId)) {
                    memberDeleteIndex = mIndex;
                }
            });
            
            if(memberDeleteIndex != -1) {
                column.memberCollections.splice(memberDeleteIndex, 1);
            }
        });
    }

    function findMemberNote (authorId, noteId) {
        let note = null;
        $scope.memberNotes.forEach(column => {
            column.memberCollections.forEach(m => {
                if (m.authorId == authorId) {
                    m.notes.forEach((n, index) => {
                        if (n.id == noteId) {
                            note = n;
                        }
                    });
                }
            });
        });
        return note;
    }

    function findCategory (categoryId) {
        let category = null;
        $scope.categories.forEach(c => {
            if (c.categoryId == categoryId) {
                category = c;
            }
        });
        return category;
    }

    function findNoteCategory (authorId) {
        let isSearched = false;
        $scope.categories.forEach(c => {
            c.notes.forEach(n => {
                if (authorId == n.authorId) {
                    isSearched = true;
                }
            });
        });
        return isSearched;
    }

    function findCategoryNote (categoryId, noteId) {
        let note = null;
        $scope.categories.forEach(c => {
            if (c.categoryId == categoryId) {
                c.notes.forEach((n, index) => {
                    if (n.id == noteId) {
                        note = n;
                    }
                });
            }
        });
        return note;
    }

    function createMemberCollection(memberIdea) {
        return {
            authorId: memberIdea.MemberId || '',
            name: memberIdea.Name || '',
            portrait: memberIdea.Portrait || '',
            notes: [],
            containerColor: '',
            contentColor: '',
            spaceSize: 0
        };
    }

    function createNote(idea) {
        return {
            id: idea.IdeaId || '',
            content: idea.IdeaContent || '',
            authorId: idea.AuthorId || '',
            containerColor: '',
            contentColor: '',
            spaceSize: idea.IdeaContent.length
        };
    }

    function createCategory(category) {
        return {
            categoryId: category.CategoryId || '',
            name: category.Name || '',
            voteCount: category.VoteCount,
            isVoted: category.IsVoted,
            notes: []
        };
    }

    function resetState() {
        brainStormingService.getBrainstormState(
        { id: brainStormingId },
        result => {
            changeState(result.State);
            $scope.brainstormInfo.duringSeconds = result.DuringSeconds;
            $scope.brainstormInfo.joinCount = result.JoinCount;
            $scope.brainstormInfo.totalCount = result.TotalCount;
            $scope.voteInfo.totalCount = result.TotalCount;
        },
        err => {
            errorService.showErrorMessage(err);
        });
    }
    
    function changeState(state) {
        // 当前状态是否与传入状态相等
        if ($scope.brainstormInfo.state != state) {
            // 检查是否当前状态和目标状态是否在讨论中和已结束间
            if (!(($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Discussing && state == BS_CONSTANTS.BS_STATES.Completed) ||
            ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Completed && state == BS_CONSTANTS.BS_STATES.Discussing))) {
                // 检查当前状态是否是准备中
                if ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Preparing) {
                    if (($scope.toolbarConfig.showDuration && state == BS_CONSTANTS.BS_STATES.Completed) || !$scope.toolbarConfig.showDuration) {
                        clearTimeout($scope.brainstormInfo.timer);
                    }
                // 检查当前状态是否是讨论中
                } else if ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Discussing) {
                    if ($scope.voteInfo.isVoting) {
                        clearTimeout($scope.voteInfo.timer);
                        $scope.voteInfo.isVoting = false;
                        $scope.voteInfo.voteResult.forEach(v => {
                            $scope.categories.forEach(c => {
                                if (c.categoryId == v.categoryId) {
                                    c.voteCount = v.voteCount;
                                    c.isVoted = v.isVoted;
                                }
                            });
                        });
                        sortCategoryByVote();
                    }
                }
                // 检查目标状态是否是准备中
                if (state == BS_CONSTANTS.BS_STATES.Preparing) {
                    updateBrainstormDuration();
                } else {
                    loadBoard({ isNew: false, isInitBoard: true});
                }
            } else {
                // 讨论中到已结束状态
                if ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Discussing && state == BS_CONSTANTS.BS_STATES.Completed) {
                    if ($scope.toolbarConfig.showDuration) {
                        clearTimeout($scope.brainstormInfo.timer);
                    }
                    if ($scope.voteInfo.isVoting) {
                        clearTimeout($scope.voteInfo.timer);
                        $scope.voteInfo.isVoting = false;
                        $scope.voteInfo.voteResult.forEach(v => {
                            $scope.categories.forEach(c => {
                                if (c.categoryId == v.categoryId) {
                                    c.voteCount = v.voteCount;
                                    c.isVoted = v.isVoted;
                                }
                            });
                        });
                        sortCategoryByVote();
                    }
                // 已结束到讨论中状态
                } else if ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Completed && state == BS_CONSTANTS.BS_STATES.Discussing) {
                    updateBrainstormDuration();
                }
            }
            $scope.isLocked = state == BS_CONSTANTS.BS_STATES.Completed;
            updateAllowActions();
            $scope.brainstormInfo.state = state;
            checkVoting();
        }
    }

    function linkNoteColor(note, memberCollection) {
        note.contentColor = memberCollection.contentColor;
        note.containerColor = memberCollection.containerColor;
    }

    function findMemberCollection(note){
        let collection = null;
        $scope.memberNotes.forEach(column => {
            column.memberCollections.forEach(memberCollection => {
                if (memberCollection.authorId == note.authorId) {
                    collection = memberCollection;
                }
            });
        });
        return collection;
    }

    function loadBoard(param) {
        $scope.isLoading = true;
        updateAllowActions();
        brainStormingService.getBrainstormData(
        { id: brainStormingId },
        { IsNew: param.isNew },
        result => {
            memberCollections = [];
            result.MemberIdeas.forEach((memberIdea, index) => {
                let memberCollection = createMemberCollection(memberIdea);
                let color = colorCodes[index % colorCodes.length];
                memberCollection.contentColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
                memberCollection.containerColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
                memberIdea.Ideas.forEach(idea => {
                    let note = createNote(idea);
                    linkNoteColor(note, memberCollection);
                    memberCollection.notes.push(note);
                    memberCollection.spaceSize += note.spaceSize;
                });
                memberCollections.push(memberCollection);
            });
            waterfallSort();
            if (param.isInitBoard) {
                result.DisscussResults.forEach(c => {
                    let category = createCategory(c);
                    c.Ideas.forEach(idea => {
                        let note = createNote(idea);
                        linkNoteColor(note, findMemberCollection(note));
                        category.notes.push(note);
                    });
                    $scope.categories.push(category);
                });
                sortCategoryByVote();
            }
            
            if (param.isInitBoard) {
                configMemberNotesPointerActions();
                configCategoryNotesPointerAction();
            }
        },
        err => {
            errorService.showErrorMessage(err);
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
            updateAllowActions();
        });
    }

    $scope.collectNotes = function () {
        if ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Preparing) {
            brainStormingService.startDiscussion(
                { id: brainStormingId },
                result => {
                    changeState(BS_CONSTANTS.BS_STATES.Discussing);
                },
                err => {
                    errorService.showErrorMessage(err);
                }
            );
        } else {
            loadBoard({
                isNew: true,
                isInitBoard: false
            });
        }
    };

    function waterfallSort () {
        let columnCount = Math.floor((areaWidth.leftWidth - 22) / 218);
        $scope.memberNotes = [];
        for (let i = 0 ; i < columnCount; i++) {
            $scope.memberNotes.push({
                columnSize: 0,
                memberCollections: []
            });
        }
        memberCollections.forEach((c, index) => {
            if (index < columnCount) {
                $scope.memberNotes[index].memberCollections.push(c);
                $scope.memberNotes[index].columnSize += c.spaceSize;
            } else {
                let minColumnIndex = 0;
                $scope.memberNotes.forEach((m, index) => {
                    if (m.columnSize < $scope.memberNotes[minColumnIndex].columnSize) {
                        minColumnIndex = index;
                    }
                });
                $scope.memberNotes[minColumnIndex].memberCollections.push(c);
                $scope.memberNotes[minColumnIndex].columnSize += c.spaceSize;
            }
        });
    }

    function sortCategoryByVote() {
        $scope.categories.sort((a, b) => {
            var va = a.isVoted ? a.voteCount : -Infinity;
            var vb = b.isVoted ? b.voteCount : -Infinity;

            if (va != vb) {
                return vb - va;
            } else {
                return a.title == b.title ? 0 : (a.title < b.title ? -1 : 1);
            }
        });
    }

    function updateBrainstormDuration () {
        $scope.brainstormInfo.duringSeconds += 1;
        $scope.brainstormInfo.timer = setTimeout(updateBrainstormDuration, 1000);
        ngRefresh();
    }

    function beginSyncVoting () {
        syncVoting();
        updateVotingDuration();
    }

    function syncVoting () {
        votingService.checkVoting(
            { id: brainStormingId },
            result => {
                if (result.IsVoting) {
                    setTimeout(syncVoting, 1000);
                    $scope.voteInfo.joinCount = result.VoteInfo.JoinCount;
                    if($scope.voteInfo.joinCount > $scope.voteInfo.totalCount) {
                        $scope.voteInfo.totalCount = $scope.voteInfo.joinCount;
                    }
                    $scope.voteInfo.voteResult = result.VoteInfo.VoteResult.map(v => {
                        return {
                            categoryId: v.CategoryId,
                            voteCount: v.VoteCount,
                            isVoted: v.IsVoted
                        };
                    });
                } else {
                    clearTimeout($scope.voteInfo.timer);
                    $scope.voteInfo.isVoting = false;
                    $scope.voteInfo.voteResult.forEach(v => {
                        $scope.categories.forEach(c => {
                            if (c.categoryId == v.categoryId) {
                                c.voteCount = v.voteCount;
                                c.isVoted = v.isVoted;
                            }
                        });
                    });
                    sortCategoryByVote();
                    ngRefresh();
                }
            },
            err => {
                errorService.showErrorMessage(err);
            }
        );
    }

    $scope.onToggleVote = function () {
        if ($scope.voteInfo.isVoting) {
            $scope.stopVote();
        } else {
            $scope.startVote();
        }
    };

    $scope.stopVote = function () {
        $scope.voteInfo.isLoading = true;
        votingService.stopVoting(
            { id: $scope.voteInfo.voteId },
            result => {
                clearTimeout($scope.voteInfo.timer);
                $scope.voteInfo.isVoting = false;
            },
            err => {
                errorService.showErrorMessage(err);
            }
        ).$promise
        .finally(() => {
            $scope.voteInfo.isLoading = false;
        });
    };

    $scope.startVote = function () {
        $scope.voteInfo.isLoading = true;
        votingService.startVoting(
            { id: brainStormingId },
            result => {
                $scope.voteInfo.voteId = result.VoteId;
                $scope.voteInfo.duringSeconds = 0;
                $scope.voteInfo.isVoting = true;
                beginSyncVoting();
            },
            err => {
                errorService.showErrorMessage(err);
            }
        ).$promise
        .finally(() => {
            $scope.voteInfo.isLoading = false;
        });
    };

    function checkVoting () {
        if ($scope.brainstormInfo.state == BS_CONSTANTS.BS_STATES.Discussing && !$scope.voteInfo.isVoting) {
            votingService.checkVoting(
                { id: brainStormingId },
                result => {
                    if (!$scope.isLocked && result.IsVoting) {
                        $scope.voteInfo.isVoting = true;
                        $scope.voteInfo.voteId = result.VoteId;
                        $scope.voteInfo.duringSeconds = result.VoteInfo.DuringSeconds;
                        beginSyncVoting();
                    }
                },
                err => {
                    errorService.showErrorMessage(err);
                }
            );
        }
    }

    function updateVotingDuration () {
        $scope.voteInfo.duringSeconds += 1;
        $scope.voteInfo.timer = setTimeout(updateVotingDuration, 1000);
        ngRefresh();
    }

    function updateAllowActions() {
        if ($scope.isLoading) {
            $scope.allowActions = 'none';
        } else if ($scope.isUpdating || $scope.isLocked) {
            $scope.allowActions = 'click';
        } else {
            $scope.allowActions = 'all';
        }
    }

    function markUpdating(promise) {
        $scope.isUpdating = true;
        updateAllowActions();

        promise.finally(() => {
            $scope.isUpdating = false;
            updateAllowActions();
        });
    }

    function ngRefresh() {
        $scope.$evalAsync(angular.noop);
    }

    $scope.reviewBrainstorm = function () {
        lifecycleService.setServiceUrl($scope.toolbarConfig.lifecycleServiceName);
        lifecycleService.reviewBrainstorm(
            { id: brainStormingId },
            result => {
                $scope.brainstormInfo.joinCount = result.JoinCount;
                $scope.brainstormInfo.totalCount = result.TotalCount;
                changeState(BS_CONSTANTS.BS_STATES.Completed);
            },
            err => {
                errorService.showErrorMessage(err);
            }
        );
    };

    $scope.completeBrainstorm = function () {

    };

    $scope.onMove = function (areaWidthInfo) {
        areaWidth = areaWidthInfo;
        let columnCount = Math.floor((areaWidth.leftWidth - 22) / 218);
        let newWidth = columnCount * 200 + 18 * (columnCount - 1) + 40;
        let columnListContainer = angular.element(document.getElementsByClassName('column-panel-list')[0]);
        columnListContainer.css('width', newWidth + 'px');
        waterfallSort();
        ngRefresh();
    };

    $scope.onInit = function (areaWidthInfo) {
        areaWidth = areaWidthInfo;
    };

    function configMemberNotesPointerActions () {
        var memberArea = angular.element(document.getElementsByClassName('member-notes')[0]);
        $noteUtil.configNotePointerActions(
            memberArea,
            {
                dragEffectRadius: DRAG_EFFECT_RADIUS,
                dragHoldingTimeout: DRAG_HOLDING_TIMEOUT,
                enableNoteCollide: true,
                enableAreaDetect: true
            },
            {
                canDragNote: function () {
                    return $scope.allowActions == 'all';
                },
                canClickNote: function () {
                    return $scope.allowActions != 'none';
                },
                onBeginDragNote: function (noteItem)  {
                    isDragging = true;
                },
                onCheckNoteCollision: function (collectionId, noteId, noteItem) {
                    return true;
                },
                onNoteClicked: function (collectionId, noteId) {
                    triggerEventCallback('onNoteClick', noteCallbacks, collectionId, noteId);
                },
                onNoteCollided: function (srcCollectionId, srcNoteId, collideCollectionId, collideNoteId) {
                    return triggerEventCallback(
                        'onNoteCollide',
                        noteCallbacks,
                        srcCollectionId, srcNoteId, collideCollectionId, collideNoteId
                    );
                },
                onFinishDragNote: function () {
                    isDragging = false;
                },
                onEnterDragArea: function (name, data, noteItem) {
                    console.log(`enter area ${name} ${data}`);
                },
                onExitDragArea: function (name, data, accept, collectionId, noteId) {
                    if (name == 'category' && accept) {
                        triggerEventCallback('onMoveToCategory', noteCallbacks, collectionId, data, noteId);
                    }
                },
                onAcceptDragArea: function (name) {
                    return name == 'category';
                }
            }
        );
    }

    function configCategoryNotesPointerAction () {
        var discussArea = angular.element(document.getElementsByClassName('discuss-results')[0]);
        $noteUtil.configNotePointerActions(
            discussArea,
            {
                dragEffectRadius: DRAG_EFFECT_RADIUS,
                dragHoldingTimeout: DRAG_HOLDING_TIMEOUT,
                enableNoteCollide: false,
                enableAreaDetect: true
            },
            {
                canDragNote: function () {
                    return $scope.allowActions == 'all';
                },
                canClickNote: function () {
                    return $scope.allowActions != 'none';
                },
                onBeginDragNote: function (noteItem)  {
                    isDragging = true;
                },
                onCheckNoteCollision: null,
                onNoteClicked: function (collectionId, noteId) {
                    triggerEventCallback('onNoteClick', categoryCallbacks, collectionId, noteId);
                },
                onNoteCollided: function (srcCollectionId, srcNoteId, collideCollectionId, collideNoteId) {
                    return null;
                },
                onFinishDragNote: function () {
                    isDragging = false;
                },
                onEnterDragArea: function (name, data, noteItem) {
                    console.log(`enter area ${name} ${data}`);
                },
                onExitDragArea: function (name, data, accept, collectionId, noteId) {
                    if (accept) {
                        if (name == 'members') {
                            triggerEventCallback('onNoteRemoved', categoryCallbacks, collectionId, noteId);
                        } else if (name == 'category') {
                            triggerEventCallback('onNoteSwitch', categoryCallbacks, collectionId, data, noteId);
                        }
                    }
                },
                onAcceptDragArea: function (name, data, collectionId) {
                    return (name == 'members' || name == 'category') && data != collectionId;
                }
            }
        );
    }

    function triggerEventCallback(name, collectionEvents, ...params) {
        if (collectionEvents) {
            var callback = collectionEvents[name];
            if (typeof callback == 'function') {
                try {
                    return callback(...params);
                } catch (err) {
                    $log.error(`error occurred in event callback ${name}, ${err}`);
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    }


    function init() {
        if (IS_ELECTRON) {
            var { ipcRenderer } = require('electron');
            ipcRenderer.on('set-discussion-state', (evt, state) => {
                resetState();
                updateAllowActions();
                ngRefresh();
            });
        }
        resetState();
    }

    init();
}]);

}());