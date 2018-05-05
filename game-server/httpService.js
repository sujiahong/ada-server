const TAG = "httpService.js";
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var tokenMgr = require("./tokenMgr");
var ErrorCode = require("../share/error_code");
var app = express();
var config = null;
var fs = require('fs');
var bodyParser = require('body-parser');

var serverIp = "";
const md5 = crypto.md5;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

//测试
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/get_server_info',function(req,res){
	var serverId = req.query.serverid;
	var sign = req.query.sign;
	logger.info('get_server_info serverId %s, sign %s', serverId, sign);
	if(serverId  != config.SERVER_ID || sign == null){
		http.send(res, ErrorCode.INVALID_ARG.code, ErrorCode.INVALID_ARG.msg);
		return;
	}

	var md5 = crypto.md5(serverId + config.ROOM_PRI_KEY);
	if(md5 != sign){
		http.send(res,ErrorCode.SIGN_ERR.code, ErrorCode.SIGN_ERR.msg);
		return;
	}

	var userRooms = roomMgr.getUserRooms();
	var arr = [];
	for(var userId in userRooms){
		var roomId = userRooms[userId];
		arr.push(userId);
		arr.push(roomId);
	}
	http.send(res,ErrorCode.SUCCESS.code, ErrorCode.SUCCESS.msg,{userroominfo:arr});
});

app.get('/create_room',function(req,res){
    logger.debug(req.query);
	var userId = parseInt(req.query.userid);
	var sign = req.query.sign;
	var gems = req.query.gems;
	var conf = req.query.conf
	if(userId == null || sign == null || conf == null){
		logger.error("invalid parameters")
		http.send(res, ErrorCode.INVALID_ARG.code, ErrorCode.INVALID_ARG.msg);
		return;
	}

	var md5 = crypto.md5(userId + conf + gems + config.ROOM_PRI_KEY);
	if(md5 != req.query.sign){
		logger.error("invalid reuqest.");
		http.send(res,ErrorCode.SIGN_ERR.code, ErrorCode.SIGN_ERR.msg);
		return;
	}

	conf = JSON.parse(conf);
	roomMgr.createRoom(userId,conf,gems,serverIp,config.CLIENT_PORT,function(err,roomId){
		if(err.code != ErrorCode.SUCCESS.code || roomId == null){
			http.send(res, err.code, err.msg);
			return;	
		}
		else{
			http.send(res, err.code, err.msg,{roomid:roomId});
		}
	});
});

app.get('/enter_room',function(req,res){
	var userId = parseInt(req.query.userid);
	var name = req.query.name;
	var roomId = req.query.roomid;
	var sign = req.query.sign;
	var sex = req.query.sex;
	if(userId == null || roomId == null || sign == null){
		http.send(res, ErrorCode.INVALID_ARG.code, ErrorCode.INVALID_ARG.msg);
		return;
	}

	var md5 = crypto.md5(userId + name + roomId + sex + config.ROOM_PRI_KEY);
	logger.debug(req.query);
	logger.debug(md5);
	if(md5 != sign){
		http.send(res,ErrorCode.SIGN_ERR.code, ErrorCode.SIGN_ERR.msg);
		return;
	}

	//安排玩家坐下
	roomMgr.enterRoom(roomId,userId,name, sex,function(err){
		if(err.code != ErrorCode.SUCCESS.code){
            http.send(res, err.code, err.msg);
			return;		
		}

		var token = tokenMgr.createToken(userId,5000);
		http.send(res, err.code,err.msg,{token:token});
	});
});

app.get('/ping',function(req,res){
	var sign = req.query.sign;
	var md5 = crypto.md5(config.ROOM_PRI_KEY);
	if(md5 != sign){
		return;
	}
	http.send(res, 0,"pong");
});

app.get("/match_room", function(req, res){
	var userId = req.query.userId;
	var gameType = req.query.gameType
	var sign = req.query.sign;
	if (userId == null || gameType == null || sign == null){
		return http.send(res, ErrorCode.PARM_ERR.code);
	}
	var md5sign = md5(userId + gameType + config.ROOM_PRI_KEY);
	if (md5sign != sign){
		return http.send(res, ErrorCode.SIGN_ERR.code);
	}
	var roomId = g_gameCoinMgr.getVacantRoomId();
});

app.get('/load_config',function(req,res){
	var type = req.query.type;
	var err = GameConfigMgr.loadConfig(type);
	logger.info('load config type %s', type);
	logger.info(err);
	http.send(res, err.code, err.msg);
});


app.get('/test',function(req,res){
	var rooms = roomMgr.getAllRooms();
	logger.error('*****************************\n');
	logger.error('*****************************\n');
	logger.error('*****************************\n');
	for(var  key in rooms){
		var room = rooms[key];
		var gameMgr = room.gameMgr;
		var game = gameMgr.games[room.id];
		for(var key in game.players){
			var player = game.players[key];
		}
	}
	http.send(res,0,"test ok");
});

app.get('/is_room_runing',function(req,res){
	var roomId = req.query.roomid;
	var sign = req.query.sign;
	if(roomId == null || sign == null){
		http.send(res,1,"invalid parameters");
		return;
	}

	var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
	if(md5 != sign){
		http.send(res,2,"sign check failed.");
		return;
	}
	
	//var roomInfo = roomMgr.getRoom(roomId);
	http.send(res,0,"ok",{runing:true});
});

var games = ['laizi', 'aihuang'];
app.get('/test_pai',function(req,res){
    res.header("Content-Type", "text/html");
    res.header("Cache-Control", "no-cache");
    var game = req.query.game;
    if(game == null) {
        game = games[0];
    }
    if(games.indexOf(game) < 0){
        return res.send('错误的玩法');
    }
    var data = "";
    try {
        data = fs.readFileSync(__dirname + '/game/test_'+game+'.txt', "utf8");
    } catch (err) {
        
    }
    app.set('view engine', 'pug');
    app.set('views', './views');
    res.render('index', { game: game, pais: data});
});

app.post('/test_pai',function(req,res){
    res.header("Content-Type", "text/html");
    res.header("Cache-Control", "no-cache");
    var game = req.query.game;
    var pais = req.body.pais;
    if(game == null) {
        game = games[0];
    }
    if(games.indexOf(game) < 0){
        return res.send('错误的玩法');
    }
    newpais=pais.replace(/\r\n/g, "");
    newpais=newpais.replace(/\n/g, "");
    var strArr = newpais.split(',');
    var ret = [];
    var warnning = false;
    var error = false;
    var warnningStr = "";
    var errorStr = "";
    for(var i = 0; i < strArr.length; i++){
        if(strArr[i] == ""){
            warnning = true;
            warnningStr += " 逗号数量错误";
            strArr.splice(i,1);
            continue;
        }
        var pai = parseInt(strArr[i]);
        if(pai < 0 || pai > 27) {
            error = true;
            errorStr += " 牌" + pai + "超出范围";
            continue;
        }
    }
    if(error) {
        return res.send("错误:"+errorStr+"<br/> 设置失败 <a href='/test_pai?game="+game+"'>返回</a>");
    }

    fs.writeFileSync(__dirname + '/game/test_'+game+'.txt', pais);
    
    var content = "设置成功 <a href='/test_pai?game="+game+"'>返回</a>";
    if(warnning){
        content = "警告：" + warnningStr + "<br/>" + content;
    }
    res.send(content);

    var exec = require('child_process').exec;
    exec("pm2 reload majiang_server");
});

exports.start = function($config){
	config = $config;
	var gameServerInfo = {
		serverid: config.SERVER_ID,
		clientip: config.CLIENT_IP,
		clientport: config.CLIENT_PORT,
		httpPort: config.GAME_FOR_HALL_PORT,
		load: roomMgr.getTotalRooms(),
		gametype: config.GAME_TYPE
	};
	var lastTickTime = 0;
	//向大厅服定时心跳
    setInterval(function(){
		if(lastTickTime + config.HTTP_TICK_TIME < Date.now()){
			lastTickTime = Date.now();
			gameServerInfo.load = roomMgr.getTotalRooms();
			http.get(config.HALL_FOR_GAEM_IP, config.HALL_FOR_GAEM_PORT, "/register_gs", gameServerInfo, function(ret,data){
				if(ret == true){
					if(data.errcode != 0){
						logger.error(data.errmsg);
					}
					
					if(data.ip != null){
						serverIp = data.ip;
					}
				}else{
					//
					lastTickTime = 0;
				}
			});
	
			var mem = process.memoryUsage();
			var format = function(bytes) {  
				  return (bytes/1024/1024).toFixed(2)+'MB';  
			}; 
			//logger.info('Process: heapTotal '+format(mem.heapTotal) + ' heapUsed ' + format(mem.heapUsed) + ' rss ' + format(mem.rss));
		}
	}, 2000);
    //为了方便测试这里要公开http服务
	// app.listen(config.GAME_FOR_HALL_PORT,config.GAME_FOR_HALL_IP);
	console.warn(TAG, "http listen port: ", config.GAME_FOR_HALL_PORT);
    app.listen(config.GAME_FOR_HALL_PORT);
	logger.info("game server is listening on " + config.GAME_FOR_HALL_IP + ":" + config.GAME_FOR_HALL_PORT);

	return app;
};