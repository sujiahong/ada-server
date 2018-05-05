var frontendService = require("./frontendService");
var backendService = require("./backendService");
var sioService = require("./homeSIOService");
var mail = require('../utils/mail');
var adaConfig = require('../share/ada_config.js');
var bunyan = require('bunyan');
var log_config = require('../share/log_config');
var SwitchMgr = require("../account-server/switchmgr");

global.g_homeMgr = require("./homeMgr");

var homeConfig = adaConfig.home_server();
g_homeMgr.init(homeConfig);

var db = require('../utils/db');
db.init(adaConfig.mysql());

var redis = require("../utils/redis");
redis.init(adaConfig.redis());

global.logger = bunyan.createLogger(log_config.hall);
logger.info('hall start...');
logger.error("test error hall start");

frontendService.start(homeConfig);
backendService.start();
//sioService.start();
SwitchMgr.loadConfig(__dirname + '/../share/switch.json');

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.error('uncaughtException error');
    logger.error(err);
    if(err && err.code == 'ECONNREFUSED'){
        //do someting
    }else{
        //process.exit(1);
    }
    mail.send_mail('hall-server uncaughtException', 'hall-server uncaughtException');
});