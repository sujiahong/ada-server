var db = require('../utils/db');
var configs = require('../config/configs.js');
var util = require('../common/util');
var bunyan = require('bunyan');
var log_config = require('../config/log_config');
var mail = require('../utils/mail');

//init db pool.
db.init(configs.mysql_dealer());

global.logger = bunyan.createLogger(log_config.data);
logger.info('data start...');
logger.error("test data start");

var config = configs.data_server();
logger.info(config);

var ds = require('./data_server');
ds.start(configs.data_server());


process.on('uncaughtException', function (err) {
    //打印出错误
    logger.error('uncaughtException error');
    logger.error(err);
    if(err && err.code == 'ECONNREFUSED'){
        //do someting
    }else{
        //process.exit(1);
    }
    mail.send_mail('data-server uncaughtException', 'account-server uncaughtException');
});