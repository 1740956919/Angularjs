(function(angular)
{
'use strict';

const NOTIFICATION_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARN: 'warning'
};

if (!!window.require) {
    const { ipcRenderer } = require('electron');

    const FIRE_EVENT = 'toast-fire';

    function notify (type, opt) {
        ipcRenderer.send(FIRE_EVENT, type, opt);
    }

    /* module registeration */

    window.$lindgeToast = {
        NOTIFICATION_TYPE: NOTIFICATION_TYPE,
        notify: notify
    };
} else {
    window.$lindgeToast = {
        NOTIFICATION_TYPE: NOTIFICATION_TYPE,
        notify: function () { return; }
    };
}

if (angular) {
    angular.module('LINDGE-Toast', [])

    .service('$lindgeToast', [function () {
        return window.$lindgeToast || null;
    }]);
}

}(window.angular));