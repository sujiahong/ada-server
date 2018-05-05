var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var GameConfig = require('../config/game_config');
var ErrorCode = require('../config/error_code');
var util = require('../common/util')


var app = express();

function send(res,ret){
	var str = JSON.stringify(ret);
	res.send(str)
}

exports.start = function(cfg){
	config = cfg;
	app.listen(config.DATA_SERVER_PORT);
	logger.info("data server is listening on " + config.DATA_SERVER_PORT);
};

function check_account(req,res){

	return true;
}


//设置跨域访问
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

app.get('/consume_card',function(req,res){
	logger.info(req.query);
	var userid = req.query.userid;
	var count = null;
	var remain_count = null;
	var fnFailed = function(){
		send(res,{errcode:1,errmsg:"consume_card error"});
	};

	var fnSucceed = function(){
		send(res,{errcode:0,errmsg:"ok"});
	};
	try {
		count = parseInt(req.query.count, 10);
		remain_count = parseInt(req.query.remain_count,10);
	}catch (e){
		fnFailed();
		return ;
	}

	if( isNaN(count) || isNaN(remain_count)){
		fnFailed();
		return ;
	}

	logger.info(req.query);
	logger.info(util.get_req_ip(req));
	db.add_card_consume(userid, count, remain_count,function(ret){
		if(ret == true){
			fnSucceed();
		}else{
			fnFailed();
		}

	});
});