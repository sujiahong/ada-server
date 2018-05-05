const TAG = "backendService.js";
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var ErrorCode = require("../share/error_code");

var app = express();

var hallIp = null;
var config = null;
var rooms = {};
var serverMap = {};
var roomIdOfUsers = {};

//设置跨域访问
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/register_gs',function(req, res){
	var serverip = req.ip;
	var clientip = req.query.clientip;
	var clientport = req.query.clientport;
	var httpPort = req.query.httpPort;
	var load = req.query.load;
	var serverid = req.query.serverid;
	var gametype = req.query.gametype;
	var key = clientip + ":" + clientport;
	var serverInfo = g_homeMgr.getGameTypeServersMap(gametype, key);
	logger.info("[register_gs] key= " + key, serverInfo);
	if(serverInfo){
		if(serverInfo.clientport != clientport
			|| serverInfo.httpPort != httpPort
			|| serverInfo.serverip != serverip
		){
			logger.error("duplicate gsid:" + serverid + ",addr:" + serverip + "(" + httpPort + ")");
			http.send(res, 1, "duplicate gsid:" + serverid);
			return;
		}
		serverInfo.load = load;
	}else{
		g_homeMgr.setGameTypeServersMap(gametype, key, {
			serverip: serverip,
			serverid: serverid,
			clientip: clientip,
			clientport: clientport,
			httpPort: httpPort,
			load: load,
			gametype: gametype,
			key: key
		});
	}
	http.send(res, ErrorCode.SUCCESS.code, null, {ip: serverip});
});

exports.isServerOnline = function(ip, port, callback){
	var id = ip + ":" + port;
	var serverInfo = serverMap[id];
    logger.info("serverInfo "+ serverInfo)
	if(!serverInfo){
		callback(false);
		return;
	}
	logger.info("isServerOnline id = "+ id);
    var sign = crypto.md5(config.ROOM_PRI_KEY);
	http.get(serverInfo.ip,serverInfo.httpPort,"/ping",{sign:sign},function(ret,data){
		if(ret){
			callback(true);
		}
		else{
			callback(false);
		}
	});
};

exports.loadConfig = function(type, fnCallback){
	for(var s in serverMap){
		var serverinfo = serverMap[s];
		http.get(serverinfo.ip,serverinfo.httpPort,"/load_config",{type:type},function(ret,data){
			if(ret){
				if(data.errcode == 0){
					fnCallback(data.code, data.msg);
				}
				else{
					fnCallback(data.code, data.msg);
				}
			}else {
				fnCallback(ErrorCode.CONFIG_LOAD_ERROR.code, ErrorCode.CONFIG_LOAD_ERROR.msg);
			}
		});
	}
};

exports.start = function($config){
	console.warn(TAG, "backend service config ", $config);
	app.listen(g_homeMgr.config.HALL_FOR_GAEM_PORT, g_homeMgr.config.HALL_FOR_GAEM_IP);
	logger.info("backend service is listening on " + g_homeMgr.config.HALL_FOR_GAEM_IP + ":" + g_homeMgr.config.HALL_FOR_GAEM_PORT);
};
