const TAG = "niu_pusher.js";
const async = require("async");
const constant = require("../../share/constant");
const errcode = require("../../share/errcode");


var exp = module.exports;

exp.pushJoinRoom = function(room, entrantId, next){
    try{
        var pushData = {route: "onJoinRoom"};
        var entrant = room.getWitnessPlayerByUid(entrantId);
        pushData.userId = entrantId;
        pushData.nickname = entrant.nickname
        pushData.iconurl = entrant.userIcon;
        pushData.userNo = entrant.userNo;
        var uidsidArr = [];
        for (var uid in room.players){
            uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
        }
        for (var uid in room.witnessPlayers){
            if (uid != entrantId){
                uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
            }
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushJoinRoom:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK, roomData: room.getClientRoomData(entrantId)});
        });
    }catch(e){
        console.error(TAG, "pushJoinRoom: error: ", e);
    }
}

exp.pushReady = function(room, readyerId, callback){
    try{
        var pushData = {route: "onReady"};
        pushData.userId = readyerId;
        var uidsidArr = [];
        for (var uid in room.players){
            if (uid != readyerId){
                uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
            }
        }
        for (var uid in room.witnessPlayers){
            uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushReady:  channelService.pushMessageByUids: ", err);
            callback();
        });
    }catch(e){
        console.error(TAG, "pushReady: error: ", e);
    }
}

exp.pushHandCard = function(room, next){
    try{
        let pushData = {route: "onHandCard"};
        var parallelFuncArr = [];
        for(let uid in room.players){
            let player = room.players[uid];
            let handCard = player.cardInHand;            
            var func = function(cb){
                var playerHandData = {};
                for (var id in room.players){
                    playerHandData[id] = [];
                    if (id == uid){
                        for (var i = 0, len = handCard.length; i < len-1; ++i){
                            playerHandData[id][i] = handCard[i];
                        }
                    }else{
                        for (var i = 0; i < 4; ++i){
                            playerHandData[id].push(1000);
                        }
                    }
                }
                pushData.playerHandData = playerHandData;
                channelService.pushMessageByUids(pushData, [{uid: uid, sid: player.frontServerId}], cb);
            }
            parallelFuncArr.push(func);
        }
        for (let wuid in room.witnessPlayers){
            let player = room.witnessPlayers[wuid];
            var func = function(cb){
                var playerHandData = {};
                for (var id in room.players){
                    playerHandData[id] = [];
                    for (var i = 0; i < 4; ++i){
                        playerHandData[id].push(1000);
                    }
                }
                pushData.playerHandData = playerHandData;
                channelService.pushMessageByUids(pushData, [{uid: wuid, sid: player.frontServerId}], cb);
            }
            parallelFuncArr.push(func);
        }
        async.parallel(parallelFuncArr, function(err, ret){
            console.warn(TAG, "pushHandCard:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushHandCard: error: ", e);
    }
}

exp.pushMultiple = function(room, robId, multitType, callback){
    try{
        var pushData = {route: "onMultiple"};
        pushData.userId = robId;
        pushData.multiType = multitType;
        pushData.multi = room.players[robId].multiple;
        pushData.bankerId = room.bankerId;
        var uidsidArr = [];
        for (var uid in room.players){
            uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
        }
        for (var uid in room.witnessPlayers){
            uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushMultiple:  channelService.pushMessageByUids: ", err);
            callback(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushMultiple: error", e);
    }
}

exp.pushOneCard = function(room, next){
    try{
        let pushData = {route: "onOneCard"};
        var parallelFuncArr = [];
        for(let uid in room.players){
            let player = room.players[uid];
            let handCard = player.cardInHand;            
            var func = function(cb){
                var playerHandData = {};
                for (var id in room.players){
                    playerHandData[id] = [];
                    if (id == uid){
                        playerHandData[id] = handCard[handCard.length-1];
                    }else{
                        playerHandData[id] = 1000;
                    }
                }
                pushData.playerHandData = playerHandData;
                channelService.pushMessageByUids(pushData, [{uid: uid, sid: player.frontServerId}], cb);
            }
            parallelFuncArr.push(func);
        }
        for (let wuid in room.witnessPlayers){
            let player = room.witnessPlayers[wuid];
            var func = function(cb){
                var playerHandData = {};
                for (var id in room.players){
                    playerHandData[id] = 1000;
                }
                pushData.playerHandData = playerHandData;
                channelService.pushMessageByUids(pushData, [{uid: wuid, sid: player.frontServerId}], cb);
            }
            parallelFuncArr.push(func);
        }
        async.parallel(parallelFuncArr, function(err, ret){
            console.warn(TAG, "pushOneCard:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushOneCard: error", e);
    }
}

exp.pushFlop = function(room, playerHandData, next){
    try{
        var pushData = {route: "onFlop", playerHandData: {}};
        for (var uid in playerHandData){
            pushData.playerHandData[uid] = playerHandData[uid];
        }
        var uidsidArr = [];
        for (var uid in room.players){
            uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
        }
        for (var uid in room.witnessPlayers){
            uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushFlop:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushFlop: error", e);
    }
}

exp.pushSeat = function(room, userId, next){
    try{
        var pushData = {route: "onSeat"};
        var player = room.players[userId];
        var playerData = player.getClientPlayerData();
        pushData.playerData = playerData;
        var uidsidArr = [];
        for (var uid in room.players){
            if (uid != userId){
                uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
            }
        }
        for (var uid in room.witnessPlayers){
            if (uid != userId){
                uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
            }
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushSeat:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK, playerData: playerData});
        });
    }catch(e){
        console.error(TAG, "pushSeat: error: ", e);
    }
}

exp.pushExit = function(room, userId, next){
    try{
        var pushData = {route: "onExit"};
        pushData.userId = userId;
        var uidsidArr = [];
        for (var uid in room.players){
            if (uid != userId){
                uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
            }
        }
        for (var uid in room.witnessPlayers){
            if (uid != userId){
                uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
            }
        }
        console.log("222222222222  ", uidsidArr);
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushExit:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushExit: error: ", e);
    }
}

exp.pushResult = function(room, result, next){
    try{
        var pushData = {route: "onResult"};
        pushData.result = {};
        for (var uid in result){
            pushData.result[uid] = {
                niuType: result[uid].niuType,
                coinIncr: result[uid].coinIncr,
                coinNum: result[uid].coinNum,
                readyStat: 0
            };
        }
        var uidsidArr = [];
        for (var uid in room.players){
            uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
        }
        for (var uid in room.witnessPlayers){
            uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushResult:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushResult:  error: ", e);
    }
}

exp.pushLineStat = function(room, userId, stat, next){
    try{
        var pushData = {route: "onLineStat"};
        pushData.userId = userId;
        pushData.lineStat = stat;
        var uidsidArr = [];
        for (var uid in room.players){
            if (uid != userId){
                uidsidArr.push({uid: uid, sid: room.players[uid].frontServerId});
            }
        }
        for (var uid in room.witnessPlayers){
            if (uid != userId){
                uidsidArr.push({uid: uid, sid: room.witnessPlayers[uid].frontServerId});
            }
        }
        channelService.pushMessageByUids(pushData, uidsidArr, function(err){
            console.warn(TAG, "pushLineStat:  channelService.pushMessageByUids: ", err);
            next(null, {code: errcode.OK});
        });
    }catch(e){
        console.error(TAG, "pushLineStat:  error: ", e);
    }
}