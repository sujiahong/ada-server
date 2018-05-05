"use_strict";
const TAG = "coinRoom.js";
const async = require("async");
const utils = require('../../util/utils');
const ddzRedis = require("../../redis/redisCoinDDZ");
const shuffleLandlord = require('./landlordCard');
const constant = require("../../shared/constant");
const Code = require("../../shared/errcode");
const coinPlayer = require("./gameCoinPlayer");

function CoinRoom(opts) {
    this.roomId = "";
    this.areaIdx = 0;
    this.useIdArr = [];
    this.players = {};
    this.curRunCount = 0;
    this.isRoomEnd = false; //每一局游戏是否结束
    this.startStamp = 0; //开始时间戳
    this.endStamp = 0; //结束时间戳
    
    this.baseCards = [];
    this.firstRobSeatIdx = 0; //
    this.robMultiple = 1;  //倍数/分数,默认是1倍
    this.dealerId = "";
    this.robArray = [];   //叫地主存放的数据
    this.nextSeatIdx = 0;
    this.curPlayData = {};//但前出牌数据{userId: "", seatIdx: 1, cards: [], cardType: 7}
    this.totalBombNum = 0;

    this.winnerId = ""; //每局里的赢家
    this.endData = {};//每局结束的数据

    if (opts) {
        this.roomId = opts.roomId;
        this.areaIdx = opts.areaIdx;
        this.useIdArr = opts.playerArr;
        this.curRunCount = opts.curRunCount;
        this.isRoomEnd = opts.isRoomEnd;
        this.startStamp = opts.startStamp;
        this.endStamp = opts.endStamp;
        this.winnerId = opts.winnerId;
        this.baseCards = opts.baseCards;
        this.firstRobSeatIdx = opts.firstRobSeatIdx;
        this.robMultiple = opts.robMultiple;
        this.dealerId = opts.dealerId;
        this.robArray = opts.robArray;
        this.nextSeatIdx = opts.nextSeatIdx;
        this.curPlayData = opts.curPlayData;
        this.totalBombNum = opts.totalBombNum;
        this.endData = opts.endData;
        for (var i in opts.players){
            this.players[i] = new coinPlayer(opts.players[i]);
        }
    }
}

module.exports = CoinRoom;

CoinRoom.prototype.init = function (index, playerArr, callback) {
    var self = this;
    genRoomUniqueId(function(err, id){
        if (err) {
            return callback(Code.ROOMID_ERR, err);
        }
        self.roomId = id;
        self.areaIdx = index;
        self.useIdArr = playerArr;
        self.startStamp = Date.now();
        callback();
    });
}

var genRoomUniqueId = function(next){
    var cur = 0;
    var _genUniqueId = function(){
        var id = util.RandNumber(6);
        ddzRedis.existCoinRoom(id, function(err, is){
            if (err){
                return next(err);
            }
            if (is == 1){
                cur++;
                if (cur < 10){
                    _genUniqueId();
                }else{
                    return next("超出生成id次数");
                }
            }else{
                return next(null, id);
            }
        });
    }
    _genUniqueId();
}

CoinRoom.prototype.clearRoom = function(){
    this.baseCards = [];
    this.firstRobSeatIdx = 0; //
    this.robMultiple = 1;  //倍数/分数,默认是1倍
    this.dealerId = "";
    this.robArray = [];   //叫地主存放的数据
    this.nextSeatIdx = 0;
    this.curPlayData = {};//但前出牌数据{userId: "", seatIdx: 1, cards: [], cardType: 7}
    this.totalBombNum = 0;
    for(var uid in this.players){
        var player = this.players[uid];
        player.robScore = -4;
        player.cardInHand = [];
        player.cardInDesk = [];
        player.bombNum = 0;
    }
}

CoinRoom.prototype.isCanStartRun = function () {
    var allReady = 1;
    for (var i in this.players) {
        allReady &= this.players[i].readyStat;
    }
    if (allReady == 1 && this.userArr.length == 3) {
        return true;
    }
    return false;
}

CoinRoom.prototype.startOneRun = function () {
    this.clearRoom();
    var fee = constant.COIN_AREA[this.areaIdx].roomFee;
    var shuffleCard = new shuffleLandlord();
    shuffleCard.shuffle();
    var assignCardArr = shuffleCard.assignCard();
    for (var uid in this.players) {
        var player = this.players[uid];
        player.intiHandCard(assignCardArr[player.seatIdx-1]);
        if (this.winnerId != "流局"){
            player.coinNum -= fee;   //扣费
            player.hadUseCoin += fee;
        }
    }
    this.firstRobSeatIdx = getRandom() % 3 + 1;
    this.baseCards = assignCardArr[assignCardArr.length - 1];
    this.isRoomEnd = false;
    this.winnerId = "";
    this.curRunCount++;
}

function getRandom() {
    return Math.floor(Math.random() * 10000);
}

CoinRoom.prototype.enterRoomWithCoin = function (userDataArr, callback) {
    var self = this;
    var coinNum = constant.COIN_AREA[this.areaIdx].highestCoin;
    var downLimit = constant.COIN_AREA[this.areaIdx].downLimit;
    var userDataStrArr = [];
    function _deduceCoin(i) {
        if (i < self.playerArr.length) {
            var userData = userDataArr[i];
            console.log(TAG, "!!!!!!!!!!!!!   带币入场  带币入场    ", coinNum, userData.restCard)
            coinController.queryUserCoin(userData.userId, function(err, queryData){
                if (err || !queryData || queryData.code != "ok"){
                    enterRoomErrorBackCoin(self, i);
                    return callback(7);
                }
                console.log(TAG, queryData, "   ()))(((  ", userData.restCard)
                userData.roomId = self.roomId; /////用户房间状态
                userData.areaIdx = self.areaIdx;////用户场次状态
                var buyNum = coinNum;
                userData.restCard = queryData.data.gameCoin;
                if (userData.restCard < coinNum && userData.restCard >= downLimit) {
                    buyNum = userData.restCard;
                }else if (userData.restCard < downLimit){
                    //归还金币
                    enterRoomErrorBackCoin(self, i);
                    return callback(4, userDataArr);
                }
                userData.restCard -= buyNum;
                buyCoinFromLivePlat(userData.userId, buyNum, function (errcode) {
                    if (errcode == 0) {
                        self.totalScore.push(buyNum);
                        userDataStrArr.push(JSON.stringify(userData));
                        _deduceCoin(i + 1);
                    } else {
                        //归还金币
                        enterRoomErrorBackCoin(self, i);
                        return callback(errcode, userDataArr);
                    }
                });
            });
        } else {
            redis.setMUserInfo(self.playerArr, userDataStrArr);
            self.anchorId = userDataArr[0].anchorId;
            self.liveId = userDataArr[0].liveId;
            return callback(0, userDataArr);
        }
    }
    _deduceCoin(0);
}

CoinRoom.prototype.isHaveEnoughCoin = function(userId){
    if (this.getPlayerScoreByUid(userId) >= constant.COIN_AREA[this.areaIdx].downLimit){
        return true;
    }
    return false;
}

CoinRoom.prototype.getHaveReadyUserId = function () {
    var arr = [];
    for (var i in this.playerArr) {
        if (this.readyStateArr[i] == 1) {
            arr.push(this.playerArr[i]);
        }
    }
    return arr;
}

CoinRoom.prototype.calculateRoomResult = function (winnerId) {
    var self = this;
    this.endStamp = Date.now();
    this.isRoomEnd = true;
    this.winnerId = winnerId;
    var runData = {};
    runData.isSpring = true;
    runData.playerMap = {};
    runData.dealerId = this.dealerId;
    runData.multiple = this.robMultiple;
    runData.bombNum = this.totalBombNum;
    calculateScore.call(this, runData);
    for (var uid in runData.playerMap){
        this.players[uid].coinNum += runData.playerMap[uid].score;
    }
    this.endData = runData;
    addRunRecord.call(self, runData);
}

var calculateScore = function (runData) {
    var baseScore = constant.COIN_AREA[self.areaIdx].baseScore;
    var winnerId = this.winnerId;
    var dealerId = runData.dealerId;
    var num = runData.bombNum;
    var multiple = runData.multiple;
    for (var uid in this.players){
        runData.playerMap[uid] = {startScore: this.players[uid].coinNum};
    }
    if (winnerId == "流局") {
        runData.isSpring = false;
        for (var uid in this.players){
            runData.playerMap[uid].score = 0;
            runData.playerMap[uid].bombNum = 0;
            runData.playerMap[uid].startScore = this.players[uid].coinNum;
        }
    } else {
        for (var uid in this.players){
            var player = this.players[uid];
            runData.playerMap[uid].startScore = player.coinNum;
            runData.playerMap[uid].bombNum = player.bombNum;
            if (dealerId == winnerId){
                if (player.userId != dealerId){
                    if (!isFarmerSpringed(player.cardInDesk)) {
                        runData.isSpring = false;
                    }
                }
            }else{
                if (player.userId == dealerId){
                    if (!isDealerSpringed(player.cardInDesk)) {
                        runData.isSpring = false;
                    }
                }
            }
        }
        var winScore = multiple * Math.pow(2, num) * baseScore;
        if (runData.isSpring) {
            winScore *= 2; 
        }
        var dealerCoinNum = this.getPlayerByUId(dealerId).coinNum;
        var score = 2 * winScore;
        if (score > dealerCoinNum){
            winScore = Math.floor(dealerCoinNum/2); //控制上限
        }
        console.log(winnerId, dealerId, runData.isSpring, winScore)
        let sumScore = 0;
        for (let uid in this.players){ //下限
            if (uid != dealerId){
                if (this.players[uid].coinNum < winScore){
                    sumScore += this.players[uid].coinNum; 
                }else{
                    sumScore += winScore;
                }
            }
        }
        for (let uid in this.players){
            let userId = uid;
            var player = this.players[uid];
            if (dealerId == winnerId){ //地主赢
                if(userId == dealerId){
                    runData.playerMap[userId].score = sumScore;
                }else{
                    var myScore = player.coinNum;
                    if (myScore > winScore){
                        myScore = winScore;
                    }
                    runData.playerMap[userId].score = -myScore;
                }
            }else{//地主输
                if(userId == dealerId){
                    runData.playerMap[userId].score = -sumScore;
                }else{
                    var myScore = player.coinNum;
                    if (myScore > winScore){
                        myScore = winScore;
                    }
                    runData.playerMap[userId].score = myScore;
                }
            }
        }
    }
}

var isFarmerSpringed = function (cardInDesk) {
    for (let i in cardInDesk) {
        if (cardInDesk[i].length > 0) {
            return false;
        }
    }
    return true;
}

var isDealerSpringed = function (cardInDesk) {
    for (var i = 1; i < cardInDesk.length; ++i) {
        if (cardInDesk[i].length > 0) {
            return false;
        }
    }
    return true;
}

function addRunRecord(runData){
	var data = {
        roomId: this.roomId,
        areaIdx: this.areaIdx,
		gameType: this.roomRule.gameType,
        gameId: pomelo.app.get("MyConfig").gameid,
		totalConsume: constant.COIN_AREA[this.areaIdx].roomFee,
		playerCount: this.playerArr.length,
        playerMap: {},
        startAt: this.startStamp,
        endAt: this.endStamp,
        multiple: runData.multiple*Math.pow(2, runData.bombNum),
        isSpring: runData.isSpring,
        anchorId: this.anchorId,
        liveId: this.liveId,
        isFlow: (runData.winnerId == "流局")
	};
	for (var i in this.playerArr){
		let scoreData = {};
        scoreData.userId = this.playerArr[i];
        scoreData.startScore = runData.playerData[this.playerArr[i]].startScore;
        scoreData.winScore = runData.playerData[this.playerArr[i]].score;
		data.playerMap[scoreData.userId] = scoreData;
	}
	parse.CoinRunRecord.addCoinRecord(data, function(){});
}

CoinRoom.prototype.getPlayerByUId = function(userId){
    return this.players[userId];
}
//退房还币
CoinRoom.prototype.exitAreaRoomBackCoin = function(userId, areaIdx, callback){
    var self = this;
    redis.getMUserInfo(self.playerArr, function(err, dataArr){
        if (err){
            return callback(Code.DATABASE_ERR);
        }
        var userArr = [];
        var userDataArr = [];
        for (var i in dataArr){
            if (dataArr[i]){
                var userData = JSON.parse(dataArr[i]);
                userData.restCard += self.totalScore[i];
                if (userData.userId == userId){
                    userData.roomId = "";  ////清空用户房间状态
                    userData.areaIdx = areaIdx;
                }
                if (userId == "all"){
                    userData.roomId = "";  ////清空用户房间状态
                    if (self.readyStateArr[i] == 0){ //没准备
                        userData.areaIdx = areaIdx;
                    }
                }
                dataArr[i] = JSON.stringify(userData);
                userDataArr.push(userData);
            }
            userArr.push({userId: self.playerArr[i], coinNum: self.totalScore[i]});
        }
        console.log(userArr)
        restoreCoinToLivePlat(userArr, function (errcode) {
            if (errcode == Code.OK) {
                redis.setMUserInfo(self.playerArr, dataArr);
                return callback(Code.OK, userDataArr);
            }else{
                return callback(errcode);
            }
        });
    });
}

CoinRoom.prototype.objectToJson = function () {
    return utils.objectToJson(this);
};