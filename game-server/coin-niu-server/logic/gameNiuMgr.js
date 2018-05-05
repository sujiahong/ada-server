"use strict";
const TAG = "gameNiuMgr.js";
const niuRedis = require("../../redis/redisCoinNiu");
const errcode = require("../../shared/errcode");
const constant = require("../../shared/constant");
const niuRoom = require("./gameNiuRoom");
const userRecord = require("../../parse/UserRecord");
const pusher = require("../../room_mgr/coin_niu_mgr/push");
const niuPlayer = require("./gameNiuPlayer");
const util = require("../../util/utils");

var GameNiuMgr = function(){
    this.rooms = {};/////roomId -- room
    this.gamePlayers = {}; //////userId --- player
    this.freeRoomArr = [];  //////空闲房间列表
}

module.exports = GameNiuMgr;

var mgr = GameNiuMgr.prototype;

mgr.addRoomToTable = function(room){
    this.rooms[room.roomId] = room;
}

mgr.getRoomById = function(roomId, next){
    var self = this;
    var room = this.rooms[roomId];
    if (room){
        next(errcode.OK, room);
    }else{
        niuRedis.getNiuRoom(roomId, function(err, roomData){
            if (err){
                return next(errcode.REDIS_DATABASE_ERR, err);
            }
            if (!roomData){
                next(errcode.NIU_ROOM_NOT_EXIST);
            }else{
                room = new niuRoom(roomData);
                self.addRoomToTable(room);
                next(errcode.OK, room);
            }
        });
    }
}

mgr.randRoomExceptLastId = function(id){
    var roomIdArr = [];
    for(var roomId in this.rooms){  
        if (roomId != id){
            roomIdArr.push(roomId);
        }
    }
    var ram = Math.floor(roomIdArr.length * Math.random());
    return this.rooms[roomIdArr[ram]];
}
////handler

mgr.ready = function(roomId, userId, next){
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = room.getPlayerByUid(userId);
            if (!player){
                return next(null, {code: errcode.NOT_IN_NIU_ROOM_SEAT});
            }
            if (player.readyStat == 1){
                return next(null, {code: errcode.NIU_ROOM_HAVE_READYED});
            }
            player.setReady(1);
            pusher.pushReady(room, userId, function(){
                if (room.isStartRun()){
                    room.StartOneRun();
                    pusher.pushHandCard(room, next);
                }else{
                    next(null, {code: errcode.OK});
                }
            });
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.robBanker = function(roomId, userId, multi, next){
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = room.getPlayerByUid(userId);
            if (!player){
                return next(null, {code: errcode.NOT_IN_NIU_ROOM_SEAT});
            }
            if (player.multiple > -1){
                return next(null, {code: errcode.NIU_ROOM_HAVE_ROBED});
            }
            player.robMultiple(multi);
            var multiAndEndArr = room.getMaxMultiAndEnd();
            console.log("#####  ", multiAndEndArr);
            if (multiAndEndArr[1]){//抢庄结束
                room.bankerId = room.lookupBanker(multiAndEndArr[0]);
                for (var uid in room.players){
                    if(uid != room.bankerId){
                        var player = room.players[uid];
                        player.multiple = -1;  //叫的倍数
                    }
                }
            }
            pusher.pushMultiple(room, userId, 1, next);
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.robMultiple = function(roomId, userId, multi, next){
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = room.getPlayerByUid(userId);
            if (!player){
                return next(null, {code: errcode.NOT_IN_NIU_ROOM_SEAT});
            }
            if (player.multiple > -1){
                return next(null, {code: errcode.NIU_ROOM_HAVE_CALL_MULTI});
            }
            player.robMultiple(multi);
            pusher.pushMultiple(room, userId, 2, function(){
                if (room.isRobMultipleEnd()){
                    pusher.pushOneCard(room, next);
                }else{
                    next(null, {code: errcode.OK});
                }
            });
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.flop = function(roomId, userId, next){
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = room.getPlayerByUid(userId);
            if (!player){
                return next(null, {code: errcode.NOT_IN_NIU_ROOM_SEAT});
            }
            if (player.flopStat == 1){
                return next(null, {code: errcode.NIU_ROOM_HAVE_FLOPED});
            }
            player.setFlopStat(1);
            var cards = [];
            for (var i = 0, len = player.cardInHand.length; i < len; ++i){
                cards[i] = player.cardInHand[i];
            }
            pusher.pushFlop(room, {[userId]: cards}, function(){
                if (room.isFlopEnd()){
                    var ret = room.startScore();
                    pusher.pushResult(room, ret, function(){
                        room.clearRun();
                        next(null, {code: errcode.OK});
                    });
                }else{
                    next(null, {code: errcode.OK});
                }
            });
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.seatdown = function(roomId, userId, seatIdx, next){
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var eecode = room.selectedSeat(userId, seatIdx);
            if (eecode == errcode.OK){
                niuRedis.setNiuRoom(roomId, util.objectToJson(room));
                pusher.pushSeat(room, userId, next);
            }else{
                next(null, {code: eecode});
            }
        }else{
            next(null, {code: ecode});
        }
    });
}
//
mgr.transpose = function(roomId, userId, next){
    var self = this;
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var eecode = room.leaveRoom(userId);
            if (eecode == errcode.OK){
                pusher.pushExit(room, userId, function(){
                    var player = self.gamePlayers[userId];
                    var randomRoom = self.randRoomExceptLastId(roomId);
                    randomRoom.witnessPlayers[userId] = player;
                    player.roomId = randomRoom.roomId;
                    userRecord.updateUserByUserId(userId, {roomId: randomRoom.roomId}, function(error){
                        if (error){
                            console.log(TAG, "====mgr.transpose=== error: ", error);
                            return next(null, {code: errcode.MONGO_DATABASE_ERR});
                        }
                        pusher.pushJoinRoom(randomRoom, userId, next);
                    });
                });
            }else{
                next(null, {code: eecode});
            }
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.exitRoom = function(roomId, userId, next){
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            if (room.isNotInRoom(userId)){
                return next(null, {code: errcode.NOT_IN_NIU_ROOM});
            }
            var eecode = room.leaveRoom(userId);
            if (eecode == errcode.OK){
                userRecord.updateUserByUserId(userId, {roomId: "", gamePlay: constant.GAME_PLAY.none}, function(error){
                    console.log(TAG, "====mgr.exitRoom=== error: ", error);
                    if (error){
                        return next(null, {code: errcode.MONGO_DATABASE_ERR});
                    }
                    niuRedis.setNiuRoom(roomId, util.objectToJson(room));
                    pusher.pushExit(room, userId, next);
                });
            }else{
                next(null, {code: eecode});
            }
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.reconnect = function(roomId, userId, next){
    var self = this;
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = room.getPlayerByUid(userId);
            if (player){
                self.gamePlayers[userId] = player;
                next(null, {code: errcode.OK, roomData: room.getClientRoomData(userId)});
            }else{
                player = room.getWitnessPlayerByUid(userId);
                if (player){
                    self.gamePlayers[userId] = player;
                    next(null, {code: errcode.OK, roomData: room.getClientRoomData(userId)});
                }else{
                    next(null, {code: errcode.NOT_IN_NIU_ROOM});
                }
            }
        }else if(ecode == errcode.NIU_ROOM_NOT_EXIST){
            userRecord.updateUserByUserId(userId, {roomId: "", gamePlay: constant.GAME_PLAY.none}, function(error){
                console.log(TAG, "====mgr.reconnect=== error: ", error);
                if (error){
                    return next(null, {code: errcode.MONGO_DATABASE_ERR});
                }
                next(null, {code: ecode});
            });
        }else{
            next(null, {code: ecode});
        }
    });
}

////remote

mgr.createRoom = function(roomId, userId, serverId, rule, next){
    var self = this;
    var player = self.gamePlayers[userId];
    console.log("logggg    ", player);
    if (!player){
        player = new niuPlayer();
        self.gamePlayers[userId] = player;
    }
    player.init(userId, serverId, function(ecode, record){
        if (ecode == errcode.OK){
            var room = new niuRoom();
            room.init(roomId, rule);
            room.creatorId = userId;
            room.players[userId] = player;
            player.seatIdx = 1;
            player.roomId = roomId;
            self.addRoomToTable(room);
            console.log("sddddd ", roomId);
            userRecord.updateUserOptionsByObject(record, {roomId: roomId, gamePlay: constant.GAME_PLAY.niu_niu}, function(error){
                console.log(TAG, "====mgr.createRoom=== error: ", error);
                if (error){
                    return next(null, {code: errcode.MONGO_DATABASE_ERR});
                }
                niuRedis.setNiuRoom(roomId, util.objectToJson(room));
                next(null, {code: errcode.OK, roomData: room.getClientRoomData(userId)});
            });
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.joinRoom = function(roomId, userId, serverId, next){
    var self = this;
    this.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = self.gamePlayers[userId];
            if (!player){
                player = new niuPlayer();
                self.gamePlayers[userId] = player;
            }
            if (room.isInRoom(userId)){
                return next(null, {code: errcode.HAVE_IN_NIU_ROOM});
            }
            player.init(userId, serverId, function(eecode, record){
                if (eecode == errcode.OK){
                    room.witnessPlayers[userId] = player;
                    player.roomId = roomId;
                    userRecord.updateUserOptionsByObject(record, {roomId: roomId, gamePlay: constant.GAME_PLAY.niu_niu}, function(error){
                        console.log(TAG, "====mgr.joinRoom=== error: ", error);
                        if (error){
                            return next(null, {code: errcode.MONGO_DATABASE_ERR});
                        }
                        niuRedis.setNiuRoom(roomId, util.objectToJson(room));
                        pusher.pushJoinRoom(room, userId, next);
                    });
                }else{
                    next(null, {code: eecode});
                }
            });
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.matchRoom = function(userId, msg, serverId, next){
    var roomArr = [];
    for (var roomId in this.rooms){
        var room = this.rooms[roomId];
        if (msg.baseCoin == room.baseCoin && msg.roomLaw == room.roomLaw){
            roomArr.push(room);
        }
    }
    var len = roomArr.length;
    var idx = Math.floor(len * Math.random());
    var i = idx;
    var room = roomArr[i];
    if (room){
        if (room.getPlayerNum() < room.uplimitPersons){
            return this.joinRoom(room.roomId, userId, serverId, next);
        }else{
            i = (i + 1)%len;
        }
        while(i != idx){
            if (room.getPlayerNum() < room.uplimitPersons){
                return this.joinRoom(room.roomId, userId, serverId, next);
            }
            i = (i + 1)%len;
        }
        this.generateRoom(userId, msg, serverId, next);
    }else{
        this.generateRoom(userId, msg, serverId, next);
    }
}

mgr.generateRoom = function(userId, msg, serverId, next){
    var self = this;
    util.genRoomUniqueId(niuRedis.isExistRoom, function(err, roomId){
        if (err) {
            return next(null, {code: errcode.ROOMID_ERR});
        }
        var rule = {
            roomLaw: msg.roomLaw,
            maxPersons: 6,
            GPSActive: 0,
            autoFlopStat: 0,
            midJoinStat: 1,
            baseCoin: msg.baseCoin
        };
        self.createRoom(roomId, userId, serverId, rule, next);
    });
}

mgr.playerOnline = function(roomId, userId, serverId, next){
    var self = this;
    self.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = self.gamePlayers[userId];
            console.log(TAG, "playerOnline  online ", player);
            if (!player){
                player = room.getPlayerByUid(userId);
                self.gamePlayers[userId] = player;
            }
            player.frontServerId = serverId;
            pusher.pushLineStat(room, userId, 1, next);
        }else{
            next(null, {code: ecode});
        }
    });
}

mgr.playerOffline = function(roomId, userId, next){
    var self = this;
    self.getRoomById(roomId, function(ecode, data){
        if (ecode == errcode.OK){
            var room = data;
            var player = self.gamePlayers[userId];
            console.log(TAG, "playerOffline  offline ", player);
            if (!player){
                player = room.getPlayerByUid(userId);
                self.gamePlayers[userId] = player;
            }
            player.frontServerId = "";
            pusher.pushLineStat(room, userId, 0, next);
        }else{
            next(null, {code: ecode});
        }
    });
}