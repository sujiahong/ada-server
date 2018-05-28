const TAG = "niu_handler.js";
const errcode = require("../../share/errcode");

var handle = module.exports;

handle.applyRoomList = function(){

}

handle.createRoom = function(){

}

handle.joinRoom = function(){

}

handle.login = function(socket, msg, next){
    if (socket.userId != null){
        return next({code: errcode.LOGINED});
    }
    var token = msg.token;
    var roomId = msg.roomId;
    var time = msg.time;
    var sign = msg.sign;
    if (token == null || roomId == null || time == null || sign == null){
        return next({code: errcode.PARM_ERR});
    }
    var md5 = crypto.md5(roomId + token + time + config.ROOM_PRI_KEY);
    if(md5 != sign){
        logger.error("login_response: login failed. invalid sign");
        return next({code: 2});
    }
    			//检查房间合法性
	var userId = tokenMgr.getUserID(token);
	//var roomId = roomMgr.getUserRoomId(userId);
	socketSeqNo++;
	if (socketSeqNo > 999999999) {
		socketSeqNo = 1;
	}
	logger.info("login userId = %s", userId);
	socket.seqno = socketSeqNo;
	userMgr.bind(userId, socket);
	//socket关联userid  roomid
	socket.userId = userId;
	socket.roomId = roomId;
	//返回房间信息
	var room = g_gameCoinRoom.getRoomById(roomId);
	if (room == null) {
		return next({code: 2});
    }
	room.setUserIP(userId, socket.handshake.address);
	var userData = null;
	var seats = [];
	for (var i = 0, len = room.seats.length; i < len; ++i) {
		var rs = room.seats[i];
		var online = false;
		if (rs.userId > 0) {
			online = userMgr.isOnline(rs.userId);
        }
		seats.push({
			userid: rs.userId,
			ip: rs.ip,
			score: rs.score,
			name: rs.name,
			online: online,
			ready: rs.ready,
			sex: rs.sex,
			seatindex: i,
			isowner: (parseInt(rs.userId) == parseInt(room.conf.creator))
		})
		if (userId == rs.userId) {
			userData = seats[i];
		}
    }
	//通知前端
	var ret = {
		code: errcode.OK,
		roomid: room.id,
		conf: room.conf,
		numofgames: room.numOfGames,
		seats: seats
	};
	logger.info('login_result');
	logger.info(ret);
	logger.info(seats);
	
	//通知其它客户端
	userMgr.broacastInRoom('onJoinRoom', userData, userId)
	socket.gameMgr = room.gameMgr
	//玩家上线，强制设置为TRUE
    socket.gameMgr.setReady(userId)
    next(ret);
}

handle.robBanker = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
	if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.robBanker(roomId, userId, msg.multi, next);
}

handle.robMultiple = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.robMultiple(roomId, userId, msg.multi, next);
}

handle.ready = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.ready(roomId, userId, next);
}

handle.flop = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.flop(roomId, userId, next);
}

handle.seatdown = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.seatdown(roomId, userId, msg.seatIdx, next);
}

handle.transpose = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.transpose(roomId, userId, next);
}

handle.exitRoom = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.exitRoom(roomId, userId, next);
}

handle.reconnect = function(socket, msg, next){
    var roomId = socket.roomId;
    var userId = socket.userId;
    if (!roomId || !userId) {
		return next({code: errcode.LOGINED_INVALID});
	}
    g_niuGameMgr.reconnect(roomId, userId, next);
}