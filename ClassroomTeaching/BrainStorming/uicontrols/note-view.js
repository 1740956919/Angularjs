(function ()
{

'use strict';

angular.module('ClassroomTeaching.BrainStorming.Control.NoteView', [])

.service('$noteUtil', [function () {
    const NOTE_SIZE = 110;
    const NOTE_PADDING = 10;
    const CONTAINER_TOP_PADDING = 20;
    const CONTAINER_BOTTOM_PADDING = 30;

    const NOTE_ROOT_CLS = 'note-item';

    /* -------------------- note object management -------------------- */

    /**
     * compute coordinate of note
     *
     * @param      {number}  index   The index
     * @return     {Array}   The note coordinate.
     */
    function computeNoteCoord(index) {
        var row = Math.floor(index / 2);
        var col = index % 2;

        var x = col * (NOTE_SIZE + NOTE_PADDING);
        var y = CONTAINER_TOP_PADDING + row * NOTE_SIZE + row * NOTE_PADDING;

        return [x, y];
    }

    /**
     * compute total size of notes
     *
     * @param      {number}  count   number of notes
     * @return     {Array}
     */
    function computeTotalSize(count) {
        var rowCount = Math.ceil(count / 2);
        var height = CONTAINER_TOP_PADDING + CONTAINER_BOTTOM_PADDING + rowCount * NOTE_SIZE + (rowCount - 1) * NOTE_PADDING;
        var width = NOTE_SIZE * 2 + NOTE_PADDING;

        return [width, height];
    }

    /**
     * instantinate note
     */
    function createNoteObject() {
        var elm = angular.element(`<div class="${NOTE_ROOT_CLS}"><div class="note-wrapper"></div></div>`);

        return {
            elm: elm,
            x: 0,
            y: 0,
            index: 0,
            id: '',
            setContent: function (content) {
                var totalLen = content.length;
                content = content.substr(0, 150);
                this.elm.children().eq(0).text(content);
            },
            setAttr: function (name, value) {
                this.elm.attr(name, value);
            },
            removeAttr: function (name) {
                this.elm.attr(name, undefined);
            },
            setPos: function (x, y) {
                this.x = x;
                this.y = y;
                this.elm.css({ left: x + 'px', top: y + 'px' });
            },
            setColor: function (color) {
                this.elm.css('background-color', color);
            },
            remove: function () {
                this.elm.remove();
            },
            setPath: function (...path) {
                this.elm.attr('note-path', path.join('/'));
            },
            markDragging: function (mark) {
                if (mark) {
                    this.elm[0].classList.add('dragging');
                } else {
                    this.elm[0].classList.remove('dragging');
                }
            },
            markRestoring: function (mark) {
                if (mark) {
                    this.elm[0].classList.add('restoring');
                } else {
                    this.elm[0].classList.remove('restoring');
                }
            },
            getGlobalPos: function () {
                var rect = this.elm[0].getBoundingClientRect();
                return [rect.x, rect.y];
            },
            hide: function () {
                this.elm[0].hidden = true;
            },
            show: function () {
                this.elm[0].hidden = false;
            }
        };
    }

    /**
     * update note object data
     *
     * @param      {Object}  noteObj
     * @param      {String}  collectionId
     * @param      {Object}  noteInfo
     */
    function updateNoteObjectByNoteInfo(noteObj, collectionId, noteInfo) {
        noteObj.id = noteInfo.id;
        noteObj.setContent(noteInfo.content);
        noteObj.setColor(noteInfo.color);
        noteObj.setPath(collectionId, noteInfo.id);

        return noteObj;
    }

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
     * convert input content to standard format for display
     *
     * @param   {String}  inputContent
     * @return  {String}
     */
    function convertNoteContent(inputContent) {
        return inputContent.replace(/\n/g, '<br>');
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

    this.createNoteObject = createNoteObject;
    this.updateNoteObjectByNoteInfo = updateNoteObjectByNoteInfo;
    this.computeNoteCoord = computeNoteCoord;
    this.computeTotalSize = computeTotalSize;

    this.getNoteElm = getNoteElm;
    this.getNoteId = getNoteId;
    this.convertNoteContent = convertNoteContent;

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

    /* -------------------- template helpers -------------------- */
    /**
     * add wrapper element
     *
     * @param      {Element}  elm
     * @return     {Element}
     */
    function addCollectionWrapper(elm) {
        var wrapper = angular.element('<div class="note-collection-wrapper">');
        elm.append(wrapper);
        return wrapper;
    }

    this.addCollectionWrapper = addCollectionWrapper;

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

    function configTouchScroll(container, callbacks) {
        var touchActived = false;

        container[0].addEventListener('touchmove', evt => {
            if (!touchActived || evt.touches.length < 2) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        }, { passive: false });

        container[0].addEventListener('touchend', evt => {
            if (touchActived) {
                touchActived = false;
                callbacks.onTouchScrollEnd();
            }
        });

        container[0].addEventListener('touchstart', function (evt) {
            if (evt.touches.length > 1) {
                touchActived = true;
                callbacks.onTouchScrollBegin();
            }
        }, { passive: false });
    }


    function configNotePointerActions(container, options, callbacks) {
        var dragEffectPerformed = false;
        var isDragging = false;

        var srcPoint = [0, 0];
        var currentPoint = [0, 0];
        var elmSrcPoint = [0, 0];

        var noteItem = null;
        var collisionElm = null;
        var dragAreaItem = null;

        function updateNotePos() {
            var offsetX = currentPoint[0] - srcPoint[0];
            var offsetY = currentPoint[1] - srcPoint[1];

            noteItem.setPos(elmSrcPoint[0] + offsetX, elmSrcPoint[1] + offsetY);
        }

        function beginPointerAction() {
            collisionElm = null;
            dragAreaItem = null;
        }

        function restoreDrag() {
            noteItem.markRestoring(true);
            noteItem.markDragging(false);
            noteItem.setPos(elmSrcPoint[0], elmSrcPoint[1]);
            setTimeout(() => {
                callbacks.onRestoreDragNote(noteItem);
            }, 260);
        }

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
                callbacks.onExitDragArea(dragAreaItem.name, dragAreaItem.data, accept, noteItem);
                markDragArea(dragAreaItem, false);
                dragAreaItem = null;
            }
        }

        function checkNoteUnderMouse(evt) {
            noteItem.hide();

            var elmUnderMouse = getNoteElm(document.elementFromPoint(evt.pageX, evt.pageY));
            if (elmUnderMouse !== collisionElm) {
                if (collisionElm) {
                    markCollision(collisionElm, false);
                }

                if (elmUnderMouse) {
                    if (elmUnderMouse.getAttribute('categorized') != 'true') {
                        var [cid, noteId] = getNoteId(elmUnderMouse);
                        if (callbacks.onCheckNoteCollision(cid, noteId, noteItem)) {
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

            noteItem.show();

            return !!collisionElm;
        }

        function checkAreaUnderMouse(evt) {
            noteItem.hide();

            var dragArea = getDragArea(document.elementFromPoint(evt.pageX, evt.pageY));
            if (dragArea) {
                var [name, data] = getDragAreaData(dragArea);
                if (!dragAreaItem || dragAreaItem.name != name || dragAreaItem.data != data) {
                    if (dragAreaItem) {
                        releaseCurrentDragArea();
                    }

                    if (callbacks.onAcceptDragArea(name, data)) {
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

            noteItem.show();
        }

        function moveHandle(evt) {
            evt.preventDefault();
            evt.stopPropagation();

            currentPoint = [evt.pageX, evt.pageY];
            if (isDragging) {
                updateNotePos();

                if (!dragEffectPerformed &&
                    computeDistance2(currentPoint, srcPoint) > options.dragEffectRadius) {
                    try {
                        callbacks.onDragPerformed();
                    } finally {
                        dragEffectPerformed = true;
                    }
                }

                var checkFinished = false;

                if (options.enableNoteCollide) {
                    checkFinished = checkNoteUnderMouse(evt);
                }

                if (!checkFinished && options.enableAreaDetect) {
                    checkFinished = checkAreaUnderMouse(evt);
                }
            } else {
                if (callbacks.canDragNote() && computeDistance2(currentPoint, srcPoint) > 100) {
                    isDragging = true;
                    elmSrcPoint = noteItem.getGlobalPos();

                    noteItem.markDragging(true);
                    updateNotePos();

                    callbacks.onBeginDragNote(noteItem);
                }
            }
        }

        function releaseHandle(evt) {
            evt.stopPropagation();
            evt.preventDefault();

            if (isDragging) {
                if (collisionElm) {
                    var [collideCollectionId, collideNoteId] = getNoteId(collisionElm);
                    var promise = callbacks.onNoteCollided(noteItem, collideCollectionId, collideNoteId);

                    if (promise) {
                        promise.then(() => {
                            // TBD: nothing todo for now
                        }, () => {
                            restoreDrag();
                        })
                        .finally(() => {
                            markCollision(collisionElm, false);
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
                    if (callbacks.canClickNote()) {
                        var [_, noteId] = getNoteId(evt.srcElement);
                        if (noteItem.id == noteId)  {
                            callbacks.onNoteClicked(noteItem);
                        }
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
                if (noteId) {
                    noteItem = callbacks.onGetNoteItem(noteId);

                    srcPoint = [evt.pageX, evt.pageY];
                    currentPoint = srcPoint;
                    dragEffectPerformed = false;

                    addGlobalEventCallback('pointermove', moveHandle);
                    addGlobalEventCallback('pointerup', releaseHandle);
                }
            }
        );
    }

    this.configTouchScroll = configTouchScroll;
    this.configNotePointerActions = configNotePointerActions;
}])

.directive('noteCollection', ['$log', '$noteUtil', function ($log, $noteUtil) {
    var DRAG_HOLDING_TIMEOUT = 200;
    var DRAG_EFFECT_RADIUS = 2000;

    return {
        priority: 1,
        scope: {
            collectionId: '=',
            noteCollection: '=',
            collectionEvents: '=',
            allowActions: "="       // all, none, click
        },
        restrict: 'A',
        replace: false,
        link: function(scope, iElm, iAttrs) {
            var containerElm = $noteUtil.addCollectionWrapper(iElm);

            var shouldUpdate = false;
            var isDragging = false;
            var isScrolling = false;

            var notes = [];

            var ignoredNotes = new Set();
            var elements = {};

            function updateElements() {
                var currentIds = new Set();
                notes.filter(note => !ignoredNotes.has(note.id))
                    .forEach((note, index) => {
                        var noteObject = elements[note.id];
                        if (!noteObject) {
                            noteObject = $noteUtil.createNoteObject();
                            elements[note.id] = noteObject;
                            containerElm.append(noteObject.elm);
                        }

                        noteObject.index = index;
                        $noteUtil.updateNoteObjectByNoteInfo(noteObject, scope.collectionId, note);

                        var [x, y] = $noteUtil.computeNoteCoord(index);
                        noteObject.setPos(x, y);

                        currentIds.add(note.id);
                    });

                Object.keys(elements).forEach(id => {
                    if (!currentIds.has(id) && !ignoredNotes.has(id)) {
                        var noteObject = elements[id];
                        noteObject.remove();
                        delete elements[id];
                    }
                });

                var [_, totalHeight] = $noteUtil.computeTotalSize(currentIds.size);
                containerElm.css({ height: totalHeight + 'px' });
            }

            function setupNoteDragging() {
                $noteUtil.configNotePointerActions(
                    iElm,
                    {
                        dragEffectRadius: DRAG_EFFECT_RADIUS,
                        dragHoldingTimeout: DRAG_HOLDING_TIMEOUT,
                        enableNoteCollide: true,
                        enableAreaDetect: true
                    },
                    {
                        canDragNote: function () {
                            return scope.allowActions == 'all' && !isScrolling;
                        },
                        canClickNote: function () {
                            return scope.allowActions != 'none' && !isScrolling;
                        },
                        onBeginDragNote: function (noteItem)  {
                            ignoredNotes.add(noteItem.id);
                            isDragging = true;
                        },
                        onRestoreDragNote: function (noteItem) {
                            noteItem.remove();
                            delete elements[noteItem.id];
                            ignoredNotes.delete(noteItem.id);

                            updateElements();       // force regenerating note
                        },
                        onCheckNoteCollision: function (collectionId, noteId, noteItem) {
                            return true;
                        },
                        onDragPerformed: function () {
                            updateElements();
                        },
                        onNoteClicked: function (noteItem) {
                            triggerEventCallback('onNoteClick', scope.collectionId, noteItem.id);
                        },
                        onNoteCollided: function (noteItem, collideCollectionId, collideNoteId) {
                            var promise = triggerEventCallback(
                                'onNoteCollide',
                                scope.collectionId, noteItem.id, collideCollectionId, collideNoteId
                            );

                            return promise.then(() => {
                                noteItem.remove();
                                ignoredNotes.delete(noteItem.id);
                                if (shouldUpdate) {
                                    updateElements();
                                    shouldUpdate = false;
                                }
                            });
                        },
                        onFinishDragNote: function () {
                            isDragging = false;
                        },
                        onGetNoteItem: function (noteId) {
                            return elements[noteId];
                        },
                        onEnterDragArea: function (name, data, noteItem) {
                            console.log(`enter area ${name} ${data}`);
                        },
                        onExitDragArea: function (name, data, accept, noteItem) {
                            if (name == 'category' && accept) {
                                noteItem.remove();
                                triggerEventCallback('onMoveToCategory', scope.collectionId, data, noteItem.id);
                            }
                        },
                        onAcceptDragArea: function (name) {
                            return name == 'category';
                        }
                    }
                );
            }

            function setupTouchScroll() {
                $noteUtil.configTouchScroll(
                    iElm,
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

            /* -------------------- note event callbacks -------------------- */
            function triggerEventCallback(name, ...params) {
                if (scope.collectionEvents) {
                    var callback = scope.collectionEvents[name];
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

            setupNoteDragging();
            setupTouchScroll();

            scope.$watch('noteCollection', function(newValue) {
                notes = newValue;
                if (!isDragging) {
                    updateElements();
                } else {
                    shouldUpdate = true;
                }
            }, true);
        }
    };
}])

.directive('noteCategoryCollection', ['$log', '$noteUtil', function ($log, $noteUtil) {
    var DRAG_HOLDING_TIMEOUT = 200;
    var DRAG_EFFECT_RADIUS = 2000;

    return {
        priority: 1,
        scope: {
            collectionId: '=',
            noteCategoryCollection: '=',
            collectionEvents: '=',
            allowActions: '='
        },
        restrict: 'A',
        replace: false,
        link: function(scope, iElm, iAttrs) {
            var containerElm = $noteUtil.addCollectionWrapper(iElm);

            var shouldUpdate = false;
            var isDragging = false;
            var isScrolling = false;

            var notes = [];

            var ignoredNotes = new Set();
            var elements = {};

            function updateElements() {
                var currentIds = new Set();
                notes.filter(note => !ignoredNotes.has(note.id))
                    .forEach((note, index) => {
                        var noteObject = elements[note.id];
                        if (!noteObject) {
                            noteObject = $noteUtil.createNoteObject();
                            elements[note.id] = noteObject;
                            containerElm.append(noteObject.elm);
                        }

                        noteObject.index = index;
                        noteObject.setAttr('categorized', 'true');
                        $noteUtil.updateNoteObjectByNoteInfo(noteObject, scope.collectionId, note);

                        var [x, y] = $noteUtil.computeNoteCoord(index);
                        noteObject.setPos(x, y);

                        currentIds.add(note.id);
                    });

                Object.keys(elements).forEach(id => {
                    if (!currentIds.has(id) && !ignoredNotes.has(id)) {
                        var noteObject = elements[id];
                        noteObject.remove();
                        delete elements[id];
                    }
                });

                var [_, totalHeight] = $noteUtil.computeTotalSize(currentIds.size);
                containerElm.css({ height: totalHeight + 'px' });
            }

            function setupNoteDragging() {
                $noteUtil.configNotePointerActions(
                    iElm,
                    {
                        dragEffectRadius: DRAG_EFFECT_RADIUS,
                        dragHoldingTimeout: DRAG_HOLDING_TIMEOUT,
                        enableNoteCollide: false,
                        enableAreaDetect: true
                    },
                    {
                        canDragNote: function () {
                            return scope.allowActions == 'all' && !isScrolling;
                        },
                        canClickNote: function () {
                            return scope.allowActions != 'none' && !isScrolling;
                        },
                        onBeginDragNote: function (noteItem)  {
                            ignoredNotes.add(noteItem.id);
                            isDragging = true;
                        },
                        onRestoreDragNote: function (noteItem) {
                            noteItem.remove();
                            delete elements[noteItem.id];
                            ignoredNotes.delete(noteItem.id);

                            updateElements();       // force regenerating note
                        },
                        onCheckNoteCollision: null,
                        onDragPerformed: function () {
                            updateElements();
                        },
                        onNoteClicked: function (noteItem) {
                            triggerEventCallback('onNoteClick', scope.collectionId, noteItem.id);
                        },
                        onNoteCollided: function (noteItem, collideCollectionId, collideNoteId) {
                            return null;
                        },
                        onFinishDragNote: function () {
                            isDragging = false;
                        },
                        onGetNoteItem: function (noteId) {
                            return elements[noteId];
                        },
                        onEnterDragArea: function (name, data, noteItem) {
                            console.log(`enter area ${name} ${data}`);
                        },
                        onExitDragArea: function (name, data, accept, noteItem) {
                            if (accept) {
                                if (name == 'members') {
                                    noteItem.remove();
                                    triggerEventCallback('onNoteRemoved', scope.collectionId, noteItem.id);
                                } else if (name == 'category') {
                                    noteItem.remove();
                                    triggerEventCallback('onNoteSwitch', scope.collectionId, data, noteItem.id);
                                }
                            }
                        },
                        onAcceptDragArea: function (name, data) {
                            return (name == 'members' || name == 'category') && data != scope.collectionId;
                        }
                    }
                );
            }

            function setupTouchScroll() {
                $noteUtil.configTouchScroll(
                    iElm,
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

            /* -------------------- note event callbacks -------------------- */
            function triggerEventCallback(name, ...params) {
                if (scope.collectionEvents) {
                    var callback = scope.collectionEvents[name];
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

            setupNoteDragging();
            setupTouchScroll();

            scope.$watch('noteCategoryCollection', function(newValue) {
                notes = newValue;
                if (!isDragging) {
                    updateElements();
                } else {
                    shouldUpdate = true;
                }
            }, true);
        }
    };
}]);

}());