"use strict";
const TAG = "gameNiuMgr.js";
const async = require("async");
const niuRedis = require("../../redis/redisCoinNiu");
const errcode = require("../../shared/errcode");
const constant = require("../../shared/constant");
const niuRoom = require("./gameNiuRoom");
const userRecord = require("../../parse/UserRecord");
const feeRecord =  require("../../parse/RoomFeeRecord");
const combatRecord = require("../../parse/NiuCombatRecord");
const pusher = require("../../room_mgr/coin_niu_mgr/push");
const niuPlayer = require("./gameNiuPlayer");
const util = require("../../util/utils");
const httpUtil = require("../../util/httpUtil");

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
            if (player.coinNum < multi * 8 * room.baseCoin * (room.getPlayerNum() - 1)){
                return next(null, {code: errcode.COIN_NOT_ENOUGH});
            }
            player.robMultiple(multi);
            var multiAndEndArr = room.getMaxMultiAndEnd();
            console.log("#####  ", multiAndEndArr);
            if (multiAndEndArr[1]){//抢庄结束
                room.bankerId = room.lookupBanker(multiAndEndArr[0]);
                var banker = room.getPlayerByUid(room.bankerId);
                if (multiAndEndArr[0] == 0){
                    banker.robMultiple(1);
                }
                pusher.pushMultiple(room, userId, 1, function(err, data){
                    for (var uid in room.players){
                        if(uid != room.bankerId){
                            var player = room.players[uid];
                            player.multiple = -1;  //叫的倍数
                        }
                    }
                    next(err, data);
                });
            }else{
                pusher.pushMultiple(room, userId, 1, next);
            }
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
            var banker = room.getPlayerByUid(room.bankerId);
            if (player.coinNum < multi * banker.multiple * 8 * room.baseCoin){
                return next(null, {code: errcode.COIN_NOT_ENOUGH});
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
            player.niuInHand = room.findoutNiuType(player.cardInHand);
            pusher.pushFlop(room, {[userId]: [cards, player.niuInHand]}, function(){
                if (room.isFlopEnd()){
                    var ret = room.startScore();
                    console.log(saveRoundEndData, "@@@@@@@@@@@@@@@@")
                    saveRoundEndData(room, ret, function(){
                        pusher.pushResult(room, ret, function(){
                            room.clearRun();
                            next(null, {code: errcode.OK});
                        });
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

var saveRoundEndData = function(room, ret, next){
    var _save = function(){
        saveMongoCombatGain(room, ret, function(err, combatRecord){
            if (err){
                console.warn(TAG, "saveRoundEndData 保存战绩mongo出错, 3妙后再试一次！！", err);
                return setTimeout(_save, 3000);
            }
            for (let uid in room.players){
                saveRedisCombatGain(uid, combatRecord);
                rebateRoomFeeToPromoter(room, uid);
            }
            next();
        });
    }
    _save();
}

var saveMongoCombatGain = function(room, scoreRet, next){
    util.generateUniqueId(8, niuRedis.isExistViewId, function(viewId){
        var param = {
            roomId: room.roomId,
            roomLaw: room.roomLaw,
            bankerId: room.bankerId,
            baseCoin: room.baseCoin,
            startStamp: room.startStamp,
            endStamp: room.endStamp,
            viewId: viewId,
            players: []
        };
        for (var uid in room.players){
            var player = room.players[uid];
            var resData = {
                userId: uid,
                nickname: player.nickname,
                iconUrl: player.userIcon,
                handCard: player.cardInHand,
                niuType: player.niuInHand.type,
                multi: player.multiple,
                remainderCoin: player.coinNum,
                coinIncr: scoreRet[uid].coinIncr
            };
            param.players.push(resData);
        }
        console.log("222222222222222222222", param);
        combatRecord.addRecord(param, function(err, record){
            if (err){
                return next(err);
            }
            console.log("33333333333333333");
            niuRedis.setViewIdCombatId(viewId, record.id.toString());
            next(null, record);
        });
    });
}

var saveRedisCombatGain = function(userId, record){
    var _save = function(){
        niuRedis.getNiuCombatGain(userId, function(err, gainArr){
            if (err){
                console.log(TAG, "saveCombatGain 保存战绩redis出错, error: ", err);
                return setTimeout(_save, 3000);
            }
            if (!gainArr){
                gainArr = [];
            }
            var players = [];
            var rePlayers = record.get("players");
            for (var i in rePlayers){
                var player = rePlayers[i];
                players.push({userId: player.userId, name: player.nickname, coinIncr: player.coinIncr});
            }
            var data = {
                roomId: record.get("roomId"),
                roomLaw: record.get("roomLaw"),
                baseCoin: record.get("baseCoin"),
                bankerId: record.get("bankerId"),
                storeStamp: record.get("endStamp"),
                viewCodeId: record.get("viewCodeId"),
                combatId: record.id.toString(),
                players: players
            };
            gainArr.unshift(data);
            if (gainArr.length > 10){
                gainArr.pop();
            }
            niuRedis.setNiuCombatGain(userId, gainArr);
        });
    }
    _save();
}

var rebateRoomFeeToPromoter = function(room, uid){
    let curPlayer = room.players[uid];
    var _rebate = function(){
        userRecord.updateUserByUserId(uid, {coinNum: curPlayer.coinNum}, function(error, record){
            if (error){
                return setTimeout(_rebate, 2000);
            }
            var param = {
                userId: uid,
                userNo: curPlayer.userNo,
                roomId: room.roomId,
                gamePlay: constant.GAME_PLAY.niu_niu,
                fee: room.baseCoin,
                remainder: curPlayer.coinNum,
                upPromoterId: record.get("bindId"),
                upUserNo: record.get("bindUserNo")
            };
            httpUtil.rebateRequest(param, function(code){
                if (code != errcode.OK){
                    setTimeout(_rebate, 2000);
                }
            });
        });
    }
    _rebate();
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