"use strict";
const TAG = "homeMgr.js";
const db = require('../utils/db');
const http = require('../utils/http');
const ErrorCode = require("../share/error_code");
const crypto = require('../utils/crypto');
const util = require("../utils/util");
const gameConfig = require("../share/game_config");


var HomeMgr = function(){
    this.config = {};
    this.gameTypeServersMap = {}; // gametype ==> {"ip:port" ==>{serverinfo}, "ip:port" ==>{serverinfo}}
}

HomeMgr.prototype.init = function(config){
    this.config = config;
}

HomeMgr.prototype.setGameTypeServersMap = function(gametype, key, jsonData){
    var servers = this.gameTypeServersMap[gametype];
    servers[key] = jsonData;
}

HomeMgr.prototype.getGameTypeServersMap = function(gametype, key){
    var servers = this.gameTypeServersMap[key];
    if (servers){
        return servers[key];
    }
    return null;
}

HomeMgr.prototype.gameRoute = function(gametype, roomId){
    var servers = this.gameTypeServersMap[gametype];
    if (servers){
		if (roomId){
			var keyArr = Object.keys(servers);
			var remainder = parseInt(roomId) % keyArr.length;
			return servers[keyArr[remainder]];
		}else{
        	var serverinfo = null;
        	for(var key in servers){
        	    var info = servers[key];
        	    if(serverinfo == null){
        	        serverinfo = info;			
        	    }else{
        	        if(serverinfo.load > info.load){
        	            serverinfo = info;
        	        }
        	    }
        	}	
			return serverinfo;
		}
    }
    return null;
}

HomeMgr.prototype.createRoom = function(account, userId, roomConf, fnCallback){
	var serverinfo = this.gameRoute();
	if(serverinfo == null){
		return fnCallback(ErrorCode.NO_GAME_SERVER.code,ErrorCode.NO_GAME_SERVER.msg);
	}
	var self = this;
	db.get_gems(account, function(data){
		if(data != null){
			//2、请求创建房间
			var reqdata = {
				userid:userId,
				gems:data.gems,
				conf:roomConf
			};
			reqdata.sign = crypto.md5(userId + roomConf + data.gems + self.config.ROOM_PRI_KEY);
			http.get(serverinfo.serverip, serverinfo.httpPort, "/create_room", reqdata, function(ret,data){
				if(ret){
					if(data.errcode == 0){
						fnCallback(data.errcode, data.errmsg, data.roomid);
					}else{
						fnCallback(data.errcode, data.errmsg);
					}
				}else {
					fnCallback(ErrorCode.REQ_CREATE_ROOM_ERROR.code, ErrorCode.REQ_CREATE_ROOM_ERROR.msg);
				}
			});	
		}else{
			fnCallback(ErrorCode.GET_USER_GEMS_ERROR.code, ErrorCode.GET_USER_GEMS_ERROR.msg);
		}
	});
}

HomeMgr.prototype.enterRoom = function(userId, name, sex, roomId,fnCallback){
	var reqdata = {
		userid:userId,
		name:name,
		roomid:roomId,
		sex:sex
	};
	reqdata.sign = crypto.md5(userId + name + roomId + sex + this.config.ROOM_PRI_KEY);

	var checkRoomIsRuning = function(serverinfo,roomId,callback){
		var sign = crypto.md5(roomId + config.ROOM_PRI_KEY);
		http.get(serverinfo.ip,serverinfo.httpPort,"/is_room_runing",{roomid:roomId,sign:sign},function(ret,data){
			if(ret){
				if(data.errcode == 0 && data.runing == true){
					callback(true);
				}
				else{
					callback(false);
				}
			}
			else{
				callback(false);
			}
		});
	}

	var enterRoomReq = function(serverinfo){
		http.get(serverinfo.ip,serverinfo.httpPort,"/enter_room",reqdata,function(ret,data){
			logger.info(data);
			if(ret){
				if(data.errcode == 0){
					db.set_room_id_of_user(userId,roomId,function(ret){
						fnCallback(data.errcode, data.errmsg, {
							ip:serverinfo.clientip,
							port:serverinfo.clientport,
							token:data.token
						});
					});
				}
				else{
					fnCallback(data.errcode, data.errmsg, null);
				}
			}
			else{
				fnCallback(ErrorCode.UNKOWN_ERR.code, ErrorCode.UNKOWN_ERR.msg,null);
			}
		});
	};

	var chooseServerAndEnter = function(serverinfo){
		serverinfo = chooseServer();
		if(serverinfo != null){
			enterRoomReq(serverinfo);
		}
		else{
			fnCallback(ErrorCode.NO_GAME_SERVER.code, ErrorCode.NO_GAME_SERVER.msg,null);
		}
	}

	db.get_room_addr(roomId,function(ret,ip,port){
		if(ret){
			var id = ip + ":" + port;
			var serverinfo = serverMap[id];
			if(serverinfo != null){
				checkRoomIsRuning(serverinfo,roomId,function(isRuning){
					if(isRuning){
						enterRoomReq(serverinfo);
					}
					else{
						chooseServerAndEnter(serverinfo);
					}
				});
			}
			else{
				chooseServerAndEnter(serverinfo);
			}
		}
		else{
			fnCallback(ErrorCode.GET_ROOM_DATA_ERR.code, ErrorCode.GET_ROOM_DATA_ERR.msg,null);
		}
	});
}

HomeMgr.prototype.matchNiuRoom = function(account, userId, callback){
	var serverinfo = this.gameRoute(gameConfig.game_type.niuniu);
	var reqdata = {
		userId: userId,
		gameType: gameConfig.game_type.niuniu,
	}
	reqdata.sign = crypto.md5(userId + gameConfig.game_type.niuniu + this.config.ROOM_PRI_KEY);
	http.get(serverinfo.serverip, serverinfo.httpPort, "/match_room", reqdata, function(isSuccess, data){
		if (isSuccess){
			if (data.errcode == ErrorCode.SUCCESS.code){
				callback(data.errcode, data.roomId);
			}else{
				callback(data.errcode, data.errmsg);
			}
		}else{
			callback(ErrorCode.HTTP_ERR.code, data);
		}
	});
}

module.exports = new HomeMgr();