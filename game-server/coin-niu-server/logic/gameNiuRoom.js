"use_strict";
const TAG = "coinNiuRoom.js";
const async = require("async");
const utils = require('../../util/utils');
const niuRedis = require("../../redis/redisCoinNiu");
const constant = require("../../shared/constant");
const errcode = require("../../shared/errcode");
const player = require("./gameNiuPlayer");
const inspect = require("./inspectNiu");

var roomPokerCards = null;
var pokerCardLen = 0;

function CoinNiuRoom(opts) {
    this.roomId = "";
    this.creatorId = "";
    this.players = {}; //玩家们
    this.witnessPlayers = {}; //观战玩家们
    this.roomLaw = 0;  // 无花 / 经典
    this.curRunCount = 0; //
    this.startStamp = 0; //开始时间戳
    this.endStamp = 0; //结束时间戳
    this.bankerId = ""; //庄
    this.baseCoin = 1;  //底分
    this.uplimitPersons = 0; //上限人数
    this.GPSActive = 0;
    this.autoFlopStat = 0;
    this.midJoinStat = 0;
    if (opts) {
        this.roomId = opts.roomId;
        this.curRunCount = opts.curRunCount;
        this.startStamp = opts.startStamp;
        this.endStamp = opts.endStamp;
        this.baseCoin = opts.baseCoin;  //底分
        this.bankerId = opts.bankerId;
        this.uplimitPersons = opts.uplimitPersons;
        this.GPSActive = opts.GPSActive;
        this.autoFlopStat = opts.autoFlopStat;
        this.midJoinStat = opts.midJoinStat;
        this.roomLaw = opts.roomLaw;
        for (var i in opts.players){
            this.players[i] = new player(opts.players[i]);
        }
        for (var i in opts.witnessPlayers){
            this.witnessPlayers[i] = new player(opts.witnessPlayers[i]);
        }
    }
}

module.exports = CoinNiuRoom;

CoinNiuRoom.prototype.init = function (roomId, rule) {
    this.roomId = roomId;
    this.startStamp = Date.now();
    this.roomLaw = rule.roomLaw;
    this.uplimitPersons = rule.maxPersons;
    this.GPSActive = rule.GPSActive;
    this.autoFlopStat = rule.autoFlopStat;
    this.midJoinStat = rule.midJoinStat;
    this.baseCoin = rule.baseCoin;
    if (this.roomLaw == constant.NIU_PLAY_TYPE.jingdian){
        roomPokerCards = constant.NIU_JINGDIAN_CARD;
        pokerCardLen = 52;
    }else{
        roomPokerCards = constant.NIU_WUHUA_CARD;
        pokerCardLen = 36;
    }
}

CoinNiuRoom.prototype.isStartRun = function(){
    // if (this.getPlayerNum() < 2){
    //     return false;
    // }
    var allReady = 1;
    for (var i in this.players) {
        allReady &= this.players[i].readyStat;
    }
    if (allReady == 1) {
        return true;
    }
    return false;
}

CoinNiuRoom.prototype.StartOneRun = function(){
    this.shuffleCard();
    this.dealCard();
    this.curRunCount++;
}

CoinNiuRoom.prototype.shuffleCard = function(){
    if (!roomPokerCards){
        if (this.roomLaw == constant.NIU_PLAY_TYPE.jingdian){
            roomPokerCards = constant.NIU_JINGDIAN_CARD;
            pokerCardLen = 52;
        }else{
            roomPokerCards = constant.NIU_WUHUA_CARD;
            pokerCardLen = 36;
        }
    }
    for (var j=1; j <= pokerCardLen; ++j){
        var ram = Math.ceil(Math.random() * pokerCardLen);
        var cardId = roomPokerCards[j];
        roomPokerCards[j] = roomPokerCards[ram];
        roomPokerCards[ram] = cardId;
    }
    //console.log("===========\n", roomPokerCards);
}

CoinNiuRoom.prototype.dealCard = function(){
    var idx = 1;
    for (var k = 1; k < 6; ++k){
        for (var uid in this.players){
            ++idx;
            var player = this.players[uid];
            player.cardInHand.push(roomPokerCards[idx]);
        }
    }
}

CoinNiuRoom.prototype.isRobMultipleEnd = function(){
    for (var uid in this.players) {
        if (uid != this.bankerId){
            var player = this.players[uid];
            if (player.readyStat == 1 && player.multiple < 0){
                return false;
            }
        }
    }
    return true;
}

CoinNiuRoom.prototype.isFlopEnd = function(){
    for (var uid in this.players) {
        var player = this.players[uid];
        if (player.readyStat == 1 && player.flopStat == 0){
            return false;
        }
    }
    return true;
}
///return   {闲家id: {type: "", win: 1, coin: 123, userId: ""}}
CoinNiuRoom.prototype.startScore = function(){
    var niuCardsFunc = null;
    var NIU_MULTI = null;
    if (this.roomLaw == constant.NIU_PLAY_TYPE.jingdian){
        niuCardsFunc = inspect.getJingDianNiuCards;
        NIU_MULTI = constant.NIU_JINGDIAN_MULTI;
    }else{
        niuCardsFunc = inspect.getWuHuaNiuCards;
        NIU_MULTI = constant.NIU_WUHUA_MULTI;
    }
    var scoreRet = {};
    var bankerCoinIncr = 0;
    var banker = this.players[this.bankerId];
    var bankerNiu = niuCardsFunc(banker.cardInHand);
    for(var uid in this.players){
        if(uid != this.bankerId){
            var player = this.players[uid];
            var otherNiu = niuCardsFunc(player.cardInHand);
            var ret = inspect.compareCards(bankerNiu, otherNiu);
            var incr = this.baseCoin * banker.multiple * player.multiple * NIU_MULTI[ret.type]* ret.win;
            banker.coinNum += incr;
            bankerCoinIncr += incr;
            player.coinNum -= incr;
            ret.coinNum = player.coinNum;
            ret.niuType = otherNiu.type;
            ret.coinIncr = -incr;
            scoreRet[uid] = ret;
        }
    }
    scoreRet[this.bankerId] = {niuType: bankerNiu.type, coinIncr: bankerCoinIncr, coinNum: banker.coinNum};
    return scoreRet;
}

CoinNiuRoom.prototype.getPlayerByUid = function(userId){
    return this.players[userId];
}
CoinNiuRoom.prototype.getWitnessPlayerByUid = function(userId){
    return this.witnessPlayers[userId];
}

CoinNiuRoom.prototype.isInRoom = function(userId){
    if (this.players[userId] || this.witnessPlayers[userId]){
        return true;
    }
    return false;
}

CoinNiuRoom.prototype.isNotInRoom = function(userId){
    if (this.players[userId] || this.witnessPlayers[userId]){
        return false;
    }
    return true;
}

CoinNiuRoom.prototype.isNotInSeat = function(userId){
    if (this.players[userId]){
        return false;
    }
    return true;
}

CoinNiuRoom.prototype.getPlayerNum = function(){
    return utils.objectSize(this.players);
}

CoinNiuRoom.prototype.getVacantSeatIdx = function(){
    for (var i = 1; i <= this.uplimitPersons; ++i){
        if (!this.isHavePlayerInSeat(i)){
            return i;
        }
    }
    return 0;
}

CoinNiuRoom.prototype.getMaxMultiAndEnd = function(){
    var maxMulti = -1;
    var isEnd = true;
    for (var uid in this.players){
        var player = this.players[uid];
        var multi = player.multiple;
        if (multi > maxMulti){
            maxMulti = multi;
        }
        if (multi == -1){
            isEnd = false;
        }
    }
    return [maxMulti, isEnd];
}

CoinNiuRoom.prototype.lookupBanker = function(maxMulti){
    var maxMultiUidArr = [];
    for (var uid in this.players){
        var player = this.players[uid];
        if (player.multiple == maxMulti){
            maxMultiUidArr.push(uid);
        }
    }
    var ram = Math.floor(Math.random() * maxMultiUidArr.length);
    return maxMultiUidArr[ram];
}

CoinNiuRoom.prototype.isBanker = function(userId){
    if (this.bankerId == userId){
        return true;
    }
    return false;
}

CoinNiuRoom.prototype.selectedSeat = function(userId, seatIdx){
    var player = this.witnessPlayers[userId];
    if(player){
        if (this.isHavePlayerInSeat(seatIdx)){
            return errcode.PLAYER_HAVE_IN_SEAT;
        }
        this.players[userId] = player;
        player.seatIdx = seatIdx;
        delete this.witnessPlayers[userId];
        return errcode.OK;
    }
    return errcode.NOT_IN_NIU_ROOM_WITNESS;
}

CoinNiuRoom.prototype.isHavePlayerInSeat = function(seatIdx){
    for (var uid in this.players){
        if (this.players[uid].seatIdx == seatIdx){
            return true;
        }
    }
    return false;
}

CoinNiuRoom.prototype.leaveRoom = function(userId){
    var player = this.players[userId];
    if (player){
        player.seatIdx = 0;
        player.roomId = "";
        player.readyStat = 0;
        player.flopStat = 0;
        player.cardInHand = [];
        player.multiple = -1;  //叫的倍数
        delete this.players[userId];
        return errcode.OK;
    }else{
        player = this.witnessPlayers[userId];
        if (player){
            player.seatIdx = 0;
            player.roomId = "";
            player.readyStat = 0;
            player.flopStat = 0;
            player.cardInHand = [];
            player.multiple = -1;  //叫的倍数
            delete this.witnessPlayers[userId];
            return errcode.OK;
        }else{
            return errcode.NOT_IN_NIU_ROOM;
        }
    }
}

CoinNiuRoom.prototype.clearRun= function(){
    this.bankerId = ""; //庄
    for (var uid in this.players){
        var player = this.players[uid];
        player.readyStat = 0;
        player.flopStat = 0;
        player.cardInHand = [];
        player.multiple = -1;  //叫的倍数
    }
}

CoinNiuRoom.prototype.getClientRoomData = function(userId){
    var room = this;
    var roomData = {};
    roomData.roomId = room.roomId;
    roomData.creatorId = room.creatorId;
    roomData.gamePlay = constant.GAME_PLAY.niu_niu;
    roomData.bankerId = room.bankerId;
    roomData.baseCoin = room.baseCoin;
    roomData.rule = {
        maxPersons: room.uplimitPersons,
        GPSActive: room.GPSActive,
        autoFlopStat: room.autoFlopStat,
        midJoinStat: room.midJoinStat,
        roomLaw: room.roomLaw
    };
    var isRobEnd = room.isRobMultipleEnd();
    roomData.players = {};
    for (var uid in room.players){
        var curPlayer = room.players[uid];
        var handCards;
        if (uid == userId){
            if (curPlayer.flopStat == 0){
                if (isRobEnd){
                    handCards = curPlayer.cardInHand;
                }else{
                    handCards = [];
                    for (var i = 0, len = curPlayer.cardInHand.length-1; i < len; ++i){
                        handCards[i] = curPlayer.cardInHand[i];
                    }
                }
            }else{
                handCards = curPlayer.cardInHand;
            }
        }else{
            if (curPlayer.flopStat == 0){
                if (curPlayer.cardInHand.length == 0){
                    handCards = [];
                }else{
                    if (isRobEnd){
                        handCards = [1000, 1000, 1000, 1000, 1000];
                    }else{
                        handCards = [1000, 1000, 1000, 1000];
                    }
                }
            }else{
                handCards = curPlayer.cardInHand;
            }
        }
        roomData.players[uid] = {
            userId: curPlayer.userId,
            seatIdx: curPlayer.seatIdx,
            sex: curPlayer.sex,
            location: curPlayer.location,
            userNo: curPlayer.userNo,
            nickname:  curPlayer.nickname,
            loginIp: curPlayer.loginIp,
            userIcon: curPlayer.userIcon,
            clientPlat: curPlayer.clientPlat,
            coinNum: curPlayer.coinNum,
            readyStat: curPlayer.readyStat,
            flopStat: curPlayer.flopStat,
            multiple: curPlayer.multiple,
            cardInHand: handCards,
            online: (curPlayer.frontServerId == "") ? 0 : 1
        }

    }
    roomData.witnessPlayers = {};
    for (var uid in room.witnessPlayers){
        var curPlayer = room.witnessPlayers[uid];
        roomData.witnessPlayers[uid] = {
            userId: curPlayer.userId,
            userNo: curPlayer.userNo,
            nickname: curPlayer.nickname,
            userIcon: curPlayer.userIcon,
            online: (curPlayer.frontServerId == "") ? 0 : 1
        }
    }
    return roomData;
}