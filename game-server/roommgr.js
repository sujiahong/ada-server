var db = require('../utils/db');
var ErrorCode = require("../share/error_code");
//var GameConfig = require('../config/game_config');
var http_req = require('../utils/http');
var configs = require('../share/ada_config.js');

class RoomMgr {
	constructor() {
		this.rooms = {};   // roomId --> room
		this.creatingRooms = {};  // 用户的房间数据
		this.totalRoomsCount = 0;
		this.userRooms = {}; // userID-->roomId
	};

	initLogger(){
		this.logger = logger.child({module:'roommgr'});
	};

	generateRoomId() {
		var roomId = "";
		for (var i = 0; i < GameConfigMgr.get('common').FangNumLen; ++i) {
			roomId += Math.floor(Math.random() * 10);
		}
		return roomId;
	};

	constructRoomFromDb(dbdata) {
		var conf = JSON.parse(dbdata.base_info)
		this.logger.info(conf);
		var room = null;
		try {
			var room_class = require("./room/room_" + conf.type);
			room = new room_class();
		} catch (e) {
			this.logger.error("can' find room_handler type %s", conf.type)
			return null;
		}
		var ret = room.initFromDB(dbdata, this.userRooms);
		if (ret == false) {
			this.logger.error("createInfoFromDB error");
			return null;
		}
		this.rooms[room.id] = room;
		this.totalRoomsCount++;
		return room;
	};


	createRoom(creator, roomConf, gems, ip, port, callback) {
		var room_type = roomConf.type;
		console.log("11111   ", creator, roomConf, gems, ip, port);
		if (room_type == null) {
			callback(ErrorCode.ROOM_TYPE_NULL);
			this.logger.error("error, room type is null");
			return;
		}
		var room = null;
		try {
			var room_class = require("./room/room_" + room_type);
			room = new room_class();
		} catch (e) {
			this.logger.error("can't find room_handler room_type %s", room_type);
			callback(ErrorCode.ROOM_TYPE_ERR);
			return;
		}


		var errcode = room.checkConfig(roomConf, gems);
		if (errcode != ErrorCode.SUCCESS) {
			this.logger.error("room_handler check error");
			this.logger.error(errcode);
			callback(errcode);
			return;
		}


		var self = this;
		var fnCreate = function () {
			var roomId = self.generateRoomId();
			if (self.rooms[roomId] != null || self.creatingRooms[roomId] != null) {
				self.logger.debug("room is not null, create"); // 防止id重复
				fnCreate();
			} else {
				self.creatingRooms[roomId] = true;
				db.is_room_exist(roomId, function (ret) {
					if (ret) {
						delete self.creatingRooms[roomId];
						fnCreate();
					}
					else {
						var createTime = Math.ceil(Date.now() / 1000);
						var ret = room.init(roomConf, creator, roomId, createTime);
						self.logger.info("room.config=");
						self.logger.info(room.conf);
						if (ret == true) {
							//写入数据库
							var conf = room.conf;
							db.create_room(room.id, room.conf, ip, port, createTime, function (uuid) {
								delete self.creatingRooms[roomId];
								if (uuid != null) {
									room.uuid = uuid;
									self.logger.info("room info uuid %s", uuid);
									self.rooms[roomId] = room;
									self.totalRoomsCount++;
									callback(ErrorCode.SUCCESS, roomId);
								}
								else {
									callback(ErrorCode.ROOM_DB_CREATE_NULL);
								}
							});
						} else {
							callback(ErrorCode.ROOM_CREATE_NULL);
						}
					}
				});
			}
		};

		fnCreate();
	};

	destroy(roomId) {
		this.logger.info('room destroy');
		var room = this.rooms[roomId];
		if (room == null) {
			this.logger.error('room is null');
			return;
		}

		for (var i = 0; i < 4; ++i) {
			var userId = room.seats[i].userId;
			if (userId > 0) {
				delete this.userRooms[userId];
				db.set_room_id_of_user(userId, null);
			}
		}
		try {
			db.archive_room(roomId);
		}catch(e){
			this.logger.error('archive_room error');
			this.logger.error(e);
		}
		delete this.rooms[roomId];
		this.totalRoomsCount--;

	};

	getTotalRooms() {
		return this.totalRoomsCount;
	};

	getAllRooms() {
		return this.rooms;
	};


	getRoom(roomId) {
		return this.rooms[roomId];
	};

	isCreator(roomId, userId) {
		var room = this.rooms[roomId];
		if (room == null) {
			this.logger.error("can't find room, roomId " + roomId);
			return false;
		}
		return room.conf.creator == userId;
	};

	enterRoom(roomId, userId, userName, sex, callback) {
		this.logger.info('enterRoom %s %s', roomId, userId);
		var self = this;
		var fnTakeSeat = function (room) {
			if (self.getUserRoomId(userId) == roomId) {
				//已存在
				return ErrorCode.SUCCESS;
			}
			self.logger.info(room.seats);
			for (var i = 0; i < 4; ++i) {
				var seat = room.seats[i];
				if (seat.userId <= 0 || seat.userId == null) {
					seat.userId = userId;
					seat.name = userName;
					seat.sex = parseInt(sex);
					room.update_user_info();
					self.userRooms[userId] = roomId;
					return ErrorCode.SUCCESS;
				}else if(seat.userId != null && seat.userId == userId) {
					self.userRooms[userId] = roomId;
					return ErrorCode.SUCCESS;
				}
			}
			//房间已满
			return ErrorCode.ROOM_FULL;
		};

		var room = this.rooms[roomId];
		if (room) {
			var ret = fnTakeSeat(room);
			callback(ret);
		}
		else {
			var self = this;
			db.get_room_data(roomId, function (dbdata) {
				if (dbdata == null) {
					//找不到房间
					callback(ErrorCode.ROOM_NOT_EXIST);
				}
				else {
					room = self.constructRoomFromDb(dbdata);
					if (room == null) {
						callback(ErrorCode.ROOM_CREATE_FORM_DB_ERR);
					} else {
						// 获取到了
						for (var i = 0; i < 4; ++i) {
							var seat = room.seats[i];
							if (seat.userId > 0) {
								self.userRooms[userId] = roomId;
							}
						}
						var ret = fnTakeSeat(room);
						callback(ret);
					}
				}
			});
		}
	};

	setReady(userId, value) {
		var roomId = this.getUserRoomId(userId);
		if (roomId == null) {
			this.logger.info('can not find room userId %d', userId);
			return;
		}

		var room = this.getRoom(roomId);
		if (room == null) {
			this.logger.info('can not get room userId %d', userId);
			return;
		}
		room.setUserReady(userId,value);
	};

	isReady(userId) {
		var roomId = this.getUserRoomId(userId);
		if (roomId == null) {
			return;
		}

		var room = this.getRoom(roomId);
		if (room == null) {
			return;
		}

		return room.isReady(userId);
	};


	getUserRoomId(userId) {
		return this.userRooms[userId];
	};

	getUserRooms(){
		return this.userRooms;
	};

	getUserSeatIndex(userId) {
		var roomId = this.getUserRoomId(userId);
		if (roomId == null) {
			return;
		}

		var room = this.getRoom(roomId);
		if (room == null) {
			return;
		}

		return room.getSeatIndex(userId);
	};

	canStart(roomId){
		var room = this.rooms[roomId];
		return room.canStart();
	};

	exitRoom(userId) {
		var roomId = this.getUserRoomId(userId);
		if( roomId == null){
			return ;
		}
		var seatIndex = this.getUserSeatIndex(userId);
		if(seatIndex == null){
			return ;
		}

		var room = this.rooms[roomId];
		delete this.userRooms[userId];

		if (room == null) {
			return;
		}

		var seat = room.seats[seatIndex];
		seat.userId = 0;
		seat.name = "";

		var numOfPlayers = 0;
		for (var i = 0; i < room.seats.length; ++i) {
			if (room.seats[i].userId > 0) {
				numOfPlayers++;
			}
		}

		db.set_room_id_of_user(userId, null);

		if (numOfPlayers == 0) {
			this.destroy(roomId);
		}
	};

	costFangKa(userid, cost, remain_count){
		var userid = userid;
		var remain_count = remain_count;
		var cost = cost;
		logger.info('costFangKa userid %d, remain_count %d, cost %d', userid, remain_count,cost);
		db.cost_gems(userid, cost, function(ret){
			logger.info('cost_gems ret = '+ ret);
			if(ret == true){
				var config = configs.data_server();
				var reqdata = {
					userid:userid,
					count:cost,
					remain_count:remain_count
				};
				logger.info('consume_card reqdata');
				logger.info(reqdata);
				http_req.get(config.DATA_SERVER_IP,config.DATA_SERVER_PORT,"/consume_card",reqdata, function(ret,data){
					if(data.errcode == 0){
						logger.info('consume card ok');
					}
					else{
						logger.info('consume card error');
					}
				})
			}
		});
	}
}

module.exports = global.roomMgr = new RoomMgr();
