"use strict";
const TAG = "gameCoinMgr.js";
const ddzRedis = require("../../redis/redisCoinDDZ");
const errcode = require("../../shared/errcode");
const coinRoom = require("./gameCoinRoom");
const shuffleLandlord = require('./landlordCard');
const userRecord = require("../../parse/UserRecord");
const pusher = require("../../room_mgr/coin_mgr/push");

var GameCoinMgr = function(){
    this.rooms = {};/////roomId -- room
    this.uidSocketMap = {};
    this.onlineCount = 0;
}

var mgr = GameCoinMgr.prototype;

mgr.createRoom = function(){
    
}

mgr.addRoomToTable = function(room){
    this.rooms[room.roomId] = room;
}

mgr.getRoomById = function(roomId, next){
    var room = this.rooms[roomId];
    if (room){
        return room;
        //next(errcode.OK, room);
    }else{
        ddzRedis.getCoinRoom(roomId, function(err, roomData){
            if (err){
                return next(errcode.REDIS_DATABASE_ERR, err);
            }
            room = new coinRoom(roomData);
            mgr.addRoomToTable(room);
            next(errcode.OK, room);
        });
    }
}



// mgr.addPlayerToTable = function(player){
//     this.players[player.userId] = player;
// }

// mgr.getPlayerByUId = function(userId){
//     return this.players[userId];
// }
//洗牌
mgr.shuffleCard = function(){
    var shuffleCard = new shuffleLandlord();
    shuffleCard.shuffle();
    return shuffleCard.assignCard();
}

mgr.setRoomPlayerReady = function(roomId, userId, next){
    mgr.getRoomById(roomId, function(errorcode, data){
        if (errorcode != errcode.OK){
            return next(errorcode, data);
        }
        var room = data;
        var player = room.getPlayerByUId(userId);
        player.setReadyStat(1);
        next(errcode.OK);
    });
}

mgr.robLandlord = function(roomId, userId, robVal, next){
    mgr.getRoomById(roomId, function(errorcode, data){
        if (errorcode != errcode.OK){
            return next(errorcode, data);
        }
        var room = data;
        var player = room.getPlayerByUId(userId);
        var robRetData = player.robLandlord(room, robVal);
        if (robRetData.errcode != errcode.OK){
            return next(robRetData.errcode);
        }
        var msg = {robScore: robVal};
        msg.userId = userId;
        msg.dealerId = robRetData.dealerId;
        msg.nextIdx = robRetData.nextIdx;
        msg.multiple = room.robMultiple;
        if (msg.dealerId){  //是否产生地主
            var dealer = room.getPlayerByUId(msg.dealerId);
            dealer.addLandlordCard(room.baseCards);
            pusher.pushRobLandlord(self, msg, room, function(){
                next(Code.OK);
            });
        }else{
            if (robRetData.isRestart){////重新发牌
                restartGame(room);
                pusher.pushStartCoinGame(self, room, true, function(){
                    pusher.pushRobLandlord(self, msg, room, function(){
                        next(Code.OK);
                    });
                });
            }else{
                pusher.pushRobLandlord(self, msg, room, function(){
                    next(Code.OK);
                });
            }
        }
    });
}

var restartGame = function(room){
	room.calculateRoomResult("流局");
    room.startOneRun();
}

mgr.playCard = function(roomId, userId, cards, next){
    var room;
    mgr.getRoomById(roomId, function(errorcode, data){
        if (errorcode != errcode.OK){
            return next(errorcode, data);
        }
        room = data;
        var player = room.getPlayerByUId(userId);
        var playData = player.playCard(room, cards);
        console.log("play  card  @@@@@: ", playData);
        if (playData.errcode != errcode.OK){
            console.log("打牌错误！！！：：：：", userId);
            return next(playData.errcode);
        }
        var msg = {cards: cards};
        msg.userId = userId;
        msg.isPass = playData.isPass;
        msg.remainderNum = playData.remainderNum;
        if (playData.remainderNum == 0){
            msg.nextIdx = -1;
            pusher.pushPlayCard(self, msg, room, function(){
                room.calculateRoomResult(userId);
                pusher.pushCoinResult(self, room, next);
            });
        }else{
            console.log(TAG, "牌没打完呢！");
            msg.nextIdx = playData.nextIdx;
            pusher.pushPlayCard(self, msg, room, next);
        }
    });
}

mgr.reconnectAttendance = function(roomId, userId, serverId, next){
    mgr.getRoomById(roomId, function(errorcode, data){
        if (errorcode != errcode.OK){
            return next(errorcode, data);
        }
        var room = data;
        if (room){
            var player = room.getPlayerByUId(userId);
            player.setPlayerServerId(serverId);
            var winnerId = room.winnerId;
            var resData = {code: errcode.OK, roomId: room.roomId, areaIdx: room.areaIdx, playersMap: {}};
            resData.multiple = room.robMultiple;
            resData.bombNum = room.totalBombNum;
            resData.winnerId = "";
            resData.dealerId = room.dealerId;
            resData.landlordCards = room.baseCards;
            if (room.dealerId == ""){
                console.log("抢地主状态2222222    ", room.nextSeatIdx);
                resData.nextIndex = room.nextSeatIdx;
            }else if (room.dealerId != "" && winnerId == ""){
                console.log("打牌状态333333      ", room.dealerId, winnerId);
                resData.isPass = true;
                resData.nextIndex = room.nextSeatIdx;
                if (room.nextSeatId == room.curPlayData.seatIdx){
                    resData.isPass = false;
                }
            }else{
                console.log("结算状态444444   ");
                resData.runScore = room.endData[userId].score;
                resData.winnerId = winnerId;
            }
            attendancePlayerData(userId, room, resData);
            next(errcode.OK, resData);
        }else{
            userRecord.updateUserByUserId(userId, {"roomId": ""}, function(err, data){
                if (err){
                    return next(errcode.MONGO_DATABASE_ERR, err);
                }
                for (var i = 1; i <= 4; ++i){
                    ddzRedis.exitWaitingCoinArea(i, userId, function(err, reply){console.log(err, reply)});
                }
                next(errcode.ROOM_NOT_EXIST);
            });
        }
    });
}

var attendancePlayerData = function(userId, room, resData){
    for(var uid in room.players){
        var player = room.players[uid];
        resData.playersMap[uid] = {
            userId: uid,
            nickName: player.nickname,
            sex: player.sex,
            userIconUrl: player.userIcon,
            isReady: player.readyStat,
            inIndex: player.seatIdx,
            loginIp: player.loginIp,
            location: player.location,
            robScore: player.robScore, 
            roomScore: player.coinNum,
            restCardNum: player.cardInHand.length,
            bombNum: player.bombNum,
            trustee: player.trusteeship,
            deskCard = player.cardInDesk,
        };
        if (uid == userId){
            resData.handCards = player.cardInHand;
        }
    }
}



global.g_gameCoinMgr = new GameCoinMgr();