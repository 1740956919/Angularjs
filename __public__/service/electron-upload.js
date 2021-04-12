(function ()
{

'use strict';

angular.module('Electron-Upload', ['LINDGE-Service', 'LINDGE-Platform'])

.service('$electronUpload', ['ExecutionQueue', '$remoteFileService', function (ExecutionQueue, $remoteFile) {
    var $node = {
        fs: require('fs'),
        constants: require('constants')
    };

    function createSession(filepath, bufferSize) {
        if (arguments.length > 1) {
            if (typeof bufferSize != 'number' || bufferSize < 0) {
                throw new TypeError('invalid bufferSize');
            }
        }

        var openFlags = $node.constants.O_RDONLY | $node.constants.O_SYNC;
        var fd = $node.fs.openSync(filepath, openFlags);

        var blockSize = bufferSize > 0 ? bufferSize : 1024 * 1024;
        var buffer = Buffer.alloc(blockSize);

        return {
            path: filepath,
            fd: fd,
            size: $node.fs.fstatSync(fd).size,
            buf: buffer,
            handle: null
        };
    }

    function closeSession(session) {
        $node.fs.closeSync(session.fd);
        session.fd = -1;
        session.buf = null;
    }

    function createUploadHandle() {
        return {
            progress: 0.0,
            fileSize: 0,
            failed: false,
            finished: false,
            token: '',
            cancel: null
        };
    }

    function uploadFile (session, options, eventHandles) {
        function triggerEvent(name, ...params) {
            if (eventHandles) {
                var handle = eventHandles[name];
                if (typeof handle == 'function') {
                    handle(...params);
                }
            }
        }

        var fd = session.fd;
        var buf = session.buf;

        var totalBytes = 0;

        var queue = ExecutionQueue.create(1, true);
        queue.addTask(next => {
            options = angular.extend({ encrypted: false, root: '' }, options);
            $remoteFile.open('', options)
                .then(result => {
                    session.handle.token = result.Handle;
                    next(null);
                }, err => {
                    next(err);
                });
        })
        .addTask(next => {
            function uploadChunk() {
                if (!queue.isAborted()) {
                    var bytesRead = $node.fs.readSync(fd, buf, 0, buf.length, totalBytes);
                    if (bytesRead > 0) {
                        var data = new Blob([buf.slice(0, bytesRead)]);
                        $remoteFile.write(session.handle.token, totalBytes, data)
                            .then(result => {
                                totalBytes += bytesRead;
                                session.handle.progress = (totalBytes / session.size) * 100;
                                try {
                                    triggerEvent('onProgress', session.handle);
                                } finally {
                                    setTimeout(uploadChunk, 200);
                                }
                            }, err => {
                                next(err);
                            });
                    } else {
                        next(null);
                    }
                }
            }

            uploadChunk();
        })
        .addTask(next => {
            $remoteFile.close(session.handle.token)
                .finally(() => {
                    session.handle.progress = 100;
                    session.handle.finished = true;

                    try {
                        triggerEvent('onFinish', session.handle);
                    } finally {
                        next(null);
                    }
                });
        })
        .finally(() => {
            try {
                if (queue.error) {
                    session.handle.failed = true;
                    triggerEvent('onFailed', queue.error, session.handle);
                }
            } finally {
                closeSession(session);
            }
        });

        session.handle.cancel = function () {
            queue.abort();
        };
    }

    /**
     * upload a local file
     *
     * @param   {String}   filepath      the local file path
     * @param   {Object?}  options       upload options, { root, encrypted }
     * @param   {Object?}  eventHandles  upload event handles, { onProgress, onFinish, onFailed }
     * @return  {UploadHandle}
     */
    this.upload = function (filepath, options, eventHandles) {
        var session = createSession(filepath);

        var uploadHandle = createUploadHandle();
        uploadHandle.fileSize = session.size;
        session.handle = uploadHandle;

        uploadFile(session, options, eventHandles);

        return uploadHandle;
    };
}]);

}());