//"use strict";
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var GameConfig = require('../share/game_config');
var ErrorCode = require('../share/error_code');



var app = express();
var hallAddr = "";

function send(res,ret){
	var str = JSON.stringify(ret);
	res.send(str)
}

var config = null;

var mylogger = logger.child({module:"http"});

exports.start = function(cfg){
	config = cfg;
	hallAddr = config.HALL_IP  + ":" + config.HALL_CLIENT_PORT;
	mylogger.info('hallAddr:'+hallAddr)
	app.listen(config.CLIENT_PORT);
	mylogger.info("account server is listening on " + config.CLIENT_PORT);
};

function check_account(req,res){
	var account = req.query.account;
	var sign = req.query.sign;
	if(account == null || sign == null){
		http.send(res,ErrorCode.NEED_ACCOUNT_INFO.code,ErrorCode.NEED_ACCOUNT_INFO.msg);
		return false;
	}

	var serverSign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
	if(serverSign != sign){
		http.send(res,ErrorCode.ERROR_SIGN.code,ErrorCode.ERROR_SIGN.msg);
		mylogger.error('sign is error');
		return false;
	}
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

app.get('/register',function(req,res){
	var account = req.query.account;
	var password = req.query.password;

	var fnFailed = function(){
		send(res,{errcode:1,errmsg:"account has been used."});
	};

	var fnSucceed = function(){
		send(res,{errcode:0,errmsg:"ok"});
	};

	db.is_user_exist(account,function(exist){
		if(exist){
			db.create_account(account,password,function(ret){
				if (ret) {
					fnSucceed();
				}
				else{
					fnFailed();
				}
			});
		}
		else{
			fnFailed();
			mylogger.error('account has been used');
		}
	});
});


app.get('/get_serverinfo',function(req,res){
	var game = req.query.game;
	var platform = req.query.platform;
	var version = req.query.version;
	console.log("1111  game:: ", game, "platform: ", platform, "version: ", version);
	var config = SwitchMgr.getConfig(game, platform, version);
	mylogger.info(config);
	console.log(config);
	var basicConfig = SwitchMgr.getBasicConfig();
	var ret = {
		basic_config: basicConfig,
		hall: hallAddr,
		switch_config: config
	};
	console.log("2222222   ", ret)
	mylogger.info(ret);
	send(res,ret);
});

app.get('/guest',function(req,res){
	if(req.query.account == null){
		mylogger.error('guest invalid account');
		send(res,{errcode:1,errmsg:"invalid account"});
		return;
	}
	var account = "guest_" + req.query.account;
	var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
	var ret = {
		errcode:0,
		errmsg:"ok",
		account:account,
		halladdr:hallAddr,
		sign:sign
	}
	send(res,ret);
});

app.get('/auth',function(req,res){
	var account = req.query.account;
	var password = req.query.password;

	db.get_account_info(account,password,function(info){
		if(info == null){
			send(res,{errcode:1,errmsg:"invalid account"});
			return;
		}

        var account = "vivi_" + req.query.account;
        var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
        var ret = {
            errcode:0,
            errmsg:"ok",
            account:account,
            sign:sign
        };
        send(res,ret);
	});
});


app.get('/get_switch',function(req,res){
	var game = req.query.game;
	var platform = req.query.platform;
	var version = req.query.version;

	var config = SwitchMgr.getConfig(game, platform, version);
	var ret = {
		errcode: 0,
		errmsg: "ok",
		config: config
	};
	send(res,ret);
});

app.get('/load_switch',function(req,res){
	var code = req.query.code;
	if( code !== GameConfig.basic.SwitchCode){
		var ret = {
			errcode:100,
			errmsg:"error"
		};
		send(res, ret)
	}else {
		SwitchMgr.reloadConfig();
		var ret = {
			errcode: 0,
			errmsg: "ok"
		};
		send(res,ret);
	}
});


var appInfo = {
	Android:{
		appid:"wx88a6f45fed7b9663",
		secret:"378b34bbcaff0fab4178dca52dc0ebc1"
	},
	iOS:{
		appid:"wx88a6f45fed7b9663",
		secret:"378b34bbcaff0fab4178dca52dc0ebc1"
	}
};

function get_access_token(code,os,callback){
	var info = appInfo[os];
	if(info == null){
		callback(false,null);
	}
	var data = {
		appid:info.appid,
		secret:info.secret,
		code:code,
		grant_type:"authorization_code"
	};

	http.get2("https://api.weixin.qq.com/sns/oauth2/access_token",data,callback,true);
}

function get_state_info(access_token,openid,callback){
	var data = {
		access_token:access_token,
		openid:openid
	};

	http.get2("https://api.weixin.qq.com/sns/userinfo",data,callback,true);
}

function create_user(account,name,sex,headimgurl,callback){
	var coins = GameConfig.basic.DefaultCoins;
	var gems = GameConfig.basic.DefaultFangKas;
	db.is_user_exist(account,function(ret){
		if(!ret){
			db.create_user(account,name,coins,gems,sex,headimgurl,function(ret){
				callback();
			});
		}
		else{
			db.update_user_info(account,name,headimgurl,sex,function(ret){
				callback();
			});
		}
	});
};
app.get('/wechat_auth',function(req,res){
	var code = req.query.code;
	var os = req.query.os;
	if(code == null || code == "" || os == null || os == ""){
		send(res,{errcode:1,errmsg:"invalid argument"});
		mylogger.error('wechat_auth invalid argument');
		return;
	}
	get_access_token(code,os,function(suc,data){
		if(suc){
			var access_token = data.access_token;
			var openid = data.openid;
			mylogger.info(data);
			get_state_info(access_token,openid,function(suc2,data2){
				if(suc2){
					var unionid = data2.unionid;
					var nickname = data2.nickname;
					var sex = data2.sex;
					var headimgurl = data2.headimgurl;
					var account = "wx_" + unionid;
					create_user(account,nickname,sex,headimgurl,function(){
						var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
					    var ret = {
					        errcode:0,
					        errmsg:"ok",
					        account:account,
					        halladdr:hallAddr,
					        sign:sign
					    };
					    send(res,ret);
					});
				}
			});
		}
		else{
			send(res,{errcode:-1,errmsg:"unkown err."});
		}
	});
});

app.get('/base_info',function(req,res){
	var userid = req.query.userid;
	db.get_user_base_info(userid,function(data){
		var ret = {
	        errcode:0,
	        errmsg:"ok",
			name:data.name,
			sex:data.sex,
	        headimgurl:data.headimg
	    };
	    send(res,ret);
	});
});


app.get('/iap_ok',function(req,res){
	var data = req.query;
	if(!check_account(req,res)){
		return;
	}
	var account = data.account;
	var add_gems_count = GameConfig.basic.IAPFangKaCount;
	var version = req.query.version;
	var platform = 'ios';
	var game = req.query.game;
	var config = SwitchMgr.getConfig(game, platform, version);
	if(config.support_pay) {
		db.add_user_gems_by_account(account, add_gems_count, function (suc) {
			if (suc) {
				db.get_gems(account, function (data) {
					if (data != null) {
						http.send(res, 0, "ok", {gems: data.gems});
					}
					else {
						http.send(res, ErrorCode.GET_GMES_FAILED.code, ErrorCode.GET_GMES_FAILED.msg);
					}
				});
			}
			else {
				http.send(res, ErrorCode.ADD_GMES_FAILED.code, ErrorCode.ADD_GMES_FAILED.msg);
			}
		});
	}else{
		http.send(res, ErrorCode.IAP_REFUSED.code, ErrorCode.ADD_GMES_FAILED.msg);
	}
});
