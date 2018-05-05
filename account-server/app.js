var db = require('../utils/db');
var adaConfig = require('../share/ada_config.js');
var SwitchMgr = require("./switchmgr");
var util = require('../utils/util');
var bunyan = require('bunyan');
var log_config = require('../share/log_config');
var mail = require('../utils/mail');

//init db pool.
db.init(adaConfig.mysql());

global.logger = bunyan.createLogger(log_config.account);
logger.info('account start...');
logger.error("test account start");

var config = adaConfig.account_server();
var as = require('./account_server');
as.start(config);                   //account server 启动

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
    mail.send_mail('account-server uncaughtException', 'account-server uncaughtException');
});
