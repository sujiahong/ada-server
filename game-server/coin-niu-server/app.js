const TAG = "coin-niu-server 入口";
const http_service = require("../httpService");
const socket_service = require("../socketService");
const mail = require('../../utils/mail');
const GameConfigMgr = require("../game_config_mgr");
const ErrorCode = require("../../share/error_code");
const ServerConstant = require("../../share/server_constant");
const GameConfig = require("../../share/game_config");
const util = require('../../utils/util');
//var RedisClient = require("../utils/redis_client");
require("./logic/gameNiuMgr"); 

//从配置文件获取服务器信息
var adaConfig = require('../../share/ada_config.js');

var db = require('../../utils/db');
db.init(adaConfig.mysql());

//初始化log
var bunyan = require('bunyan');
var log_config = require('../../share/log_config');
global.logger = bunyan.createLogger(log_config.niuserver);

logger.info('coin-niu-server start...');
logger.error("test error coin-niu-server start");

GameConfigMgr.loadAllConfig(__dirname + '/../../share/game/');

var gameConfig = adaConfig.coin_niu_server();

//开启HTTP服务
var server = http_service.start(gameConfig[0]);
global.SERVER = server;

//开启外网SOCKET服务
socket_service.start(gameConfig[0]);

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.error('uncaughtException error');
    logger.error(err);
    if(err && err.code == 'ECONNREFUSED'){
        //do someting
    }else{
        //process.exit(1);
    }
    mail.send_mail('majiang-server uncaughtException', 'majiang-server uncaughtException');
});
