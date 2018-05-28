const TAG = "sockerService.js";
var crypto = require('../utils/crypto');
var db = require('../utils/db');
var ErrorCode = require("../share/error_code");
var tokenMgr = require('./tokenMgr');
//var roomMgr = require('./roommgr');
var userMgr = require('./usermgr');
var niuHandler = require("./coin-niu-server/handler");
var ddzHandler = require("./coin-ddz-server/handler");
var socketMgr = require("./userSocketMgr");

var io = null;
const opts = {
	serveClient: false,
	pingInterval: 10000,
	pingTimeout: 5000,
	cookie: false
};
var socketSeqNo = 1;

exports.start = function (config) {
	io = require('socket.io')(config.CLIENT_PORT, opts);
	console.warn(TAG, "socket service is listening on %d ", config.CLIENT_PORT);

	io.sockets.on("connection", function (socket) {
		console.log(TAG, "one connection established: ", socket.id, socket.handshake.address);
		//出错
		socket.on("error", function (error) {
			console.warn(TAG, socket.id, "==socket userId, roomId, gamePlay: ",
				socket.userId, socket.roomId, socket.gamePlay, "error: ", error);
		});
		//断开链接,
		socket.on("disconnect", function (reason) {
			console.warn(TAG, socket.id, "==socket userId, roomId, gamePlay: ",
			socket.userId, socket.roomId, socket.gamePlay, "disconnect: ", reason);

			var userId = socket.userId;
			if (!userId) {
				return;
			}
			//此处有很大的延时,等服务器发现断开了,可能客户端有重新连接了一个
			//所以要做一个判断,否则问题很大
			var bindSocket = userMgr.getSocket(userId);
			if (bindSocket != null && bindSocket.seqno != socket.seqno) {
				logger.error('bindSocket seqno %d, socket.seqno %d', bindSocket.seqno, socket.seqno);
				logger.error('socket_service on disconnect has create new socket userId ' + userId);
				return;
			}
			var data = {
				userId: userId,
				online: false
			};

			//通知房间内其它玩家
			userMgr.broacastInRoom('user_state_push', data, userId);
			roomMgr.setReady(userId, false);
			//清除玩家的在线信息
			try {
				logger.error('socket_service on disconnect del userId ' + userId);
				userMgr.del(userId);
			} catch (e) {
				logger.error('socket_service on disconnect exception');
				logger.error(e);
			}
			socket.userId = null;
			//socket.disconnect();
		});
		socket.on("niuService", function (data, next) {
			niuHandler[data.route](socket, data, next);
		});

		socket.on("ddzService", function (data, next) {
			ddzHandler[data.route](socket, data, next);
		});

		// socket.on('game_ping',function(data){
		// 	var userId = socket.userId;
		// 	if(!userId){
		// 		return;
		// 	}
		// 	socket.emit('game_pong');
		// });
	});
	logger.info("socket service is listening on %d ", config.CLIENT_PORT);
};