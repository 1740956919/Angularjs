const miniserver = require('mini-server-core');

const HTTP_STATUS_CODE = miniserver.HTTP_STATUS_CODE;
const HTTP_METHODS = miniserver.HTTP_METHODS;

const plugins = require('mini-server-plugins');
const path = require('path');
const devRoot = path.join(process.cwd(), '../..');
/**
 * context { runtime, fileAccessor }
 */
module.exports = function (context) {
    const runtime = context.runtime;
    const fileAccessor = context.fileAccessor;

    // logger filtering
    runtime.logger.addFilter(/favicon/i);

    // CDN files
    runtime.registerProxyHandler(HTTP_METHODS.GET, /CDN\/(.+)/, 'http://devfront.corp.lindge.com/CDN/{0}');
    // Framework files
    runtime.registerProxyHandler(HTTP_METHODS.GET, /Framework\/(.+)/, 'http://devfront.corp.lindge.com/Framework/{0}');
    // global clock
    runtime.registerProxyHandler(HTTP_METHODS.GET, /Translayer\/Figure\.Config\/ServerTime\/global_init_time/,
        'http://devfront.corp.lindge.com/Translayer/Figure.Config/ServerTime/global_init_time');
    // system config
    runtime.registerProxyHandler(HTTP_METHODS.GET, /\/SystemConfig\.js/i, 'http://devfront.corp.lindge.com/dev/resource/SystemConfig.js');

    // other configuration goes here
    plugins.load('lindge-public-include')
    .setSearchRoot(devRoot)
    .active(runtime);
};