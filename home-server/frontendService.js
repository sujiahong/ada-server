const TAG = "frontendService.js";
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var room_service = require("./backendService");
var ErrorCode = require('../share/error_code');
var util = require('../utils/util');
var GameConfig = require('../share/game_config');

var app = express();
var config = null;

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
		return false;
	}
	return true;
}

//设置跨域访问
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/login',function(req,res){
	if(!check_account(req,res)){
		return;
	}

	var ip = util.get_req_ip(req);

	var account = req.query.account;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,0,"ok");
			return;
		}
		var ret = {
			account:data.account,
			userid:data.userid,
			name:data.name,
			lv:data.lv,
			exp:data.exp,
			coins:data.coins,//金币
			gems:data.gems,	 //房卡
			ip:ip,
			sex:data.sex,
			in_pw:SwitchMgr.isInWhitelist(data.userid)
		};
		db.update_login_time(data.userid);
		db.get_room_id_of_user(data.userid,function(roomId){
			//如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
			if(roomId != null){
				//检查房间是否存在于数据库中
				db.is_room_exist(roomId,function (retval){
					if(retval){
						ret.roomid = roomId;
					}
					else{
						//如果房间不在了，表示信息不同步，清除掉用户记录
						db.set_room_id_of_user(data.userid,null);
					}
					http.send(res,0,"ok",ret);
				});
			}
			else {
				http.send(res,0,"ok",ret);
			}
		});
	});
});

app.get('/create_user',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	var name = req.query.name;
	var sex = req.query.sex;
	var coins = GameConfig.basic.DefaultCoins;
	var gems = GameConfig.basic.DefaultFangKas;

	db.is_user_exist(account,function(ret){
		if(!ret){
			db.create_user(account,name, coins,gems, sex,null,function(ret){
				if (ret == null) {
					http.send(res,2,"system error.");
				}
				else{
					http.send(res,0,"ok");
				}
			});
		}
		else{
			http.send(res,1,"account have already exist.");
		}
	});
});

app.get('/create_private_room',function(req,res){
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if(!check_account(req,res)){
		return;
	}


	if(SwitchMgr.isStopServer()){
		http.send(res,-1,"游戏已经停服,无法创建新的房间");
		return;
	}

	var account = data.account;

	data.account = null;
	data.sign = null;
	logger.info('create_private_room');
	logger.info(data);
	var conf = data.conf;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res, ErrorCode.SUCCESS.code, ErrorCode.SUCCESS.msg);
			return;
		}
		var userId = data.userid;
		var name = data.name;
		var sex = data.sex;
		//验证玩家状态
		db.get_room_id_of_user(userId,function(roomId){
			if(roomId != null){
				http.send(res,ErrorCode.ROOM_HAS_IN.code, ErrorCode.ROOM_HAS_IN.msg);
				return;
			}
			//创建房间
			try {
				room_service.createRoom(account, userId, conf, function (errcode, errormsg, roomId) {
					if (errcode == ErrorCode.SUCCESS.code && roomId != null) {
						room_service.enterRoom(userId, name, sex, roomId, function (errcode, errormsg, enterInfo) {
							if (enterInfo) {
								var ret = {
									roomid: roomId,
									ip: enterInfo.ip,
									port: enterInfo.port,
									token: enterInfo.token,
									time: Date.now()
								};
								ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);
								http.send(res, ErrorCode.SUCCESS.code, ErrorCode.SUCCESS.msg, ret);
							}
							else {
								http.send(res, errcode, errormsg);
							}
						});
					}
					else {
						http.send(res, errcode, errormsg);
					}
				});
			}catch (e){
				logger.error('creat Room error');
				logger.error(e);
				http.send(res,ErrorCode.UNKOWN_ERR.code, ErrorCode.UNKOWN_ERR.msg);
			}
		});
	});
});

app.get('/enter_private_room',function(req,res){
	var data = req.query;
	var roomId = data.roomid;
	if(roomId == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	if(SwitchMgr.isStopServer()){
		http.send(res,-1,"游戏已经停服,暂时无法进入房间");
		return;
	}

	var account = data.account;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,-1,"system error");
			return;
		}
		var userId = data.userid;
		var name = data.name;
		var sex = data.sex;

		//验证玩家状态
		//todo
		//进入房间
		room_service.enterRoom(userId,name, sex, roomId,function(errcode, errmsg, enterInfo){
			if(enterInfo){
				var ret = {
					roomid:roomId,
					ip:enterInfo.ip,
					port:enterInfo.port,
					token:enterInfo.token,
					time:Date.now()
				};
				ret.sign = crypto.md5(roomId + ret.token + ret.time + config.ROOM_PRI_KEY);
				http.send(res,errcode,errmsg,ret);
			}
			else{
				http.send(res,errcode, errmsg);
			}
		});
	});
});

app.get("/match_niu_room", function(req, res){
	var data = req.query;
	if (SwitchMgr.isStopServer()){
		return http.send(res, ErrorCode.STOP_SERVER, "暂时无法匹配");
	}
	
	g_homeMgr.matchNiuRoom(data.account, data.userid, function(errcode, data){
		if (errcode == ErrorCode.SUCCESS.code){
			var ret = {
				roomId: data.roomId,
				ip: data.ip,
				port: data.port,
				token: data.token,
				time: Date.now()
			};
			ret.sign = cryto.md5(roomId + ret.token + ret.time + g_homeMgr.config.ROOM_PRI_KEY);
			http.send(res, errcode, null, ret);
		}else{
			http.send(res, errcode);
		}
	});
});

app.get('/get_history_list',function(req,res){
	var data = req.query;
	if(!check_account(req,res)){
		return;
	}
	var account = data.account;
	var type = data.type;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,-1,"system error");
			return;
		}
		var userId = data.userid;
		logger.info('get_user_history userId=%s, type = %s ',userId,type);
		db.get_user_history(userId, type, function(rows){
			http.send(res,0,"ok",{history:rows});
		});
	});
});

app.get('/get_games_of_room',function(req,res){
	var data = req.query;
	var uuid = data.uuid;
	if(uuid == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	db.get_games_of_room(uuid,function(data){
		http.send(res,0,"ok",{data:data});
	});
});

app.get('/get_detail_of_game',function(req,res){
	var data = req.query;
	var uuid = data.uuid;
	var index = data.index;
	if(uuid == null || index == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	db.get_detail_of_game(uuid,index,function(data){
		http.send(res,0,"ok",{data:data});
	});
});

app.get('/get_user_status',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	db.get_gems(account,function(data){
		if(data != null){
			http.send(res,0,"ok",{gems:data.gems});
		}
		else{
			http.send(res,1,"get gems failed.");
		}
	});
});

app.get('/get_message',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var type = req.query.type;

	if(type == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}

	var version = req.query.version;
	db.get_message(type,version,function(data){
		if(data != null){
			http.send(res,0,"ok",{msg:data.msg,version:data.version});
		}
		else{
			http.send(res,1,"get message failed.");
		}
	});
});

app.get('/is_server_online',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var ip = req.query.ip;
	var port = req.query.port;
	logger.info("is_server_online  ip:"+ip+":"+port);
	room_service.isServerOnline(ip,port,function(isonline){
		var ret = {
			isonline:isonline
		};
		http.send(res,0,"ok",ret);
	});
});

app.get('/load_config',function(req,res){
	var code = req.query.code;
	var type = req.query.type;
	logger.info('load config code %s, type %s', code, type);
	if( code !== GameConfig.basic.LoadConfigCode){
		var ret = {
			errcode:100,
			errmsg:"error code"
		};
		http.send(res,100,"error",{});
	}else {
		room_service.loadConfig(type, function(ret){
			http.send(res,0,"ok",ret);
		});
	}
});

app.get('/load_switch',function(req,res){
	var code = req.query.code;
	if( code !== GameConfig.basic.SwitchCode){
		var ret = {
			errcode:100,
			errmsg:"error"
		};
		//send(res, ret)
		http.send(res, 100, "error", ret);
	}else {
		SwitchMgr.reloadConfig();
		var ret = {
			errcode: 0,
			errmsg: "ok"
		};
		http.send(res,0,"ok",ret);
	}
});


app.get('/get_prize_record',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	db.get_prize_record(account,function(count){
		var ret = {
			count:count
		};
		http.send(res,0,"ok",ret);
	});
});


app.get('/get_prize_count',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var userid = req.query.userid;
	db.get_prize_count(userid,function(count){
		var ret = {
			count:count
		};
		http.send(res,0,"ok",ret);
	});
});


app.get('/share_prize',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var userid = req.query.userid;
	db.share_prize(userid,function(data){
		logger.info('share_prize ok');
		http.send(res,0,"ok",{});
	});
});


app.get('/start_prize',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	var username = req.query.username;
	var userid = req.query.userid;
	logger.info('start_prize account %s, userid %d', account, userid);
	db.has_prize_count(userid, function(has){
		if(has == false){
			http.send(res,-1,"抽奖次数不够,分享朋友圈或者明天再来吧!",{});
		} else{
			db.get_prize_data(function(data){
				var prize_count = data;
				var prize_config = SwitchMgr.getPrizeConfig();
				//logger.info(prize_config);
				logger.info(prize_count);
				var total_weight = 0;
				for(var i = 1; i < 11; i++){
					var item_name = "item"+i;
					var item_weight = prize_config[item_name]['weight'];
					total_weight += item_weight;
				}

				var prize_type = 0;
				var times = 0;
				logger.info('total_weight = '+total_weight);
				do{
					var r = Math.floor(Math.random()*total_weight);
					var step_weight = 0;
					var tmp_type = 0;
					for(var i = 1; i < 11; i++){
						var item_name = "item"+i;
						var item_weight = prize_config[item_name]['weight'];
						step_weight += item_weight;
						logger.info('total_weight = %d, r=%d, step_weight = %d',total_weight, r, step_weight);
						if( step_weight >= r){
							tmp_type = i;
							break;
						}
					}
					if( prize_count['item'+tmp_type] !=null && prize_count['item'+tmp_type]  > 0 ){
						prize_type = tmp_type;
						break;
					}

					times++;
					if(times > 1000){
						break;
					}
				}while(true);
				if(prize_type > 0) {
					logger.info(prize_config);
					var prize_config_item = prize_config["item" + prize_type];
					var prize_name = prize_config_item['name'];
					logger.info(prize_config_item);
					db.prize_settle(userid, username, prize_type, prize_name, function (data) {
						if(data == true) {
							var type = prize_config_item['type'];
							var count = prize_config_item['count'];
							var ret = {
								prize_type: prize_type
							};
							if (type == "fangka") {
								var fangkaCount = count;

								db.add_user_gems(userid, fangkaCount);
							}
							http.send(res, 0, "ok", ret);
						}else{
							http.send(res,-1,"抽奖失败",{});
						}
					});
				}else{
					var ret = {
						prize_type: prize_type
					};
					http.send(res,-1,"抽奖失败",{});
				}
			});
		}
		return ;
	});
});

exports.start = function($config){
	console.warn(TAG, "frontend service CLEINT_PORT: " + $config.CLEINT_PORT);
	app.listen(g_homeMgr.config.CLEINT_PORT);
	logger.info("frontend service is listening on port " + g_homeMgr.config.CLEINT_PORT);
};
