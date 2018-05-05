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

		socket.on('login', function (data) {
			data = JSON.parse(data);
			if (socket.userId != null) {
				//已经登陆过的就忽略
				return;
			}
			var token = data.token;
			var roomId = data.roomid;
			var time = data.time;
			var sign = data.sign;

			logger.info("login data");
			logger.info(data);

			//检查参数合法性
			if (token == null || roomId == null || sign == null || time == null) {
				logger.error("login_result: invalid parameters");
				socket.emit('login_result', { errcode: 1, errmsg: "invalid parameters" });
				return;
			}

			//检查参数是否被篡改
			var md5 = crypto.md5(roomId + token + time + config.ROOM_PRI_KEY);
			if (md5 != sign) {
				logger.error("login_result: login failed. invalid sign");
				socket.emit('login_result', { errcode: 2, errmsg: "login failed. invalid sign!" });
				return;
			}

			//检查token是否有效
			if (tokenMgr.isTokenValid(token) == false) {
				logger.error("login_result: token out of time.");
				socket.emit('login_result', { errcode: 3, errmsg: "token out of time." });
				return;
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
				socket.emit('login_result', ErrorCode.LOGIN_FAILED);
				return;
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
				});

				if (userId == rs.userId) {
					userData = seats[i];
				}
			}

			//通知前端
			var ret = {
				errcode: ErrorCode.SUCCESS.code,
				errmsg: ErrorCode.SUCCESS.msg,
				data: {
					roomid: room.id,
					conf: room.conf,
					numofgames: room.numOfGames,
					seats: seats
				}
			};
			logger.info('login_result');
			logger.info(ret);
			logger.info(seats);
			socket.emit('login_result', ret);

			//通知其它客户端
			userMgr.broacastInRoom('new_user_comes_push', userData, userId);

			socket.gameMgr = room.gameMgr;

			//玩家上线，强制设置为TRUE
			socket.gameMgr.setReady(userId);

			socket.emit('login_finished');

			if (room.dr != null) {
				var dr = room.dr;
				var ramaingTime = (dr.endTime - Date.now()) / 1000;
				var data = {
					time: ramaingTime,
					states: dr.states
				}
				userMgr.sendMsg(userId, 'dissolve_notice_push', data);
			}
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