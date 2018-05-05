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