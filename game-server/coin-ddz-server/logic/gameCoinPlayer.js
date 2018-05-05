"use_strict";
const TAG = "coinPlayer.js";
const errcode = require("../../shared/errcode");
const userRecord = require("../../parse/UserRecord");
const util = require("../../util/utils");
const handCard = require("./handCard");
const constant = require("../../shared/constant");
const pokerCardType = constant.POKER_CARD_TYPE;

var CoinPlayer = function(opts){
    this.roomId = "";
    this.seatIdx = 0;
    this.userId = "";
    this.areaIdx = 0;

    this.frontServerId = "";
    this.location = "";
    this.userNo = "";
    this.nickname = "";
    this.loginIp = "";
    this.userIcon = "";
    this.coinNum = 0;
    this.hadUseCoin = 0;
    this.readyStat = 0;
    
    this.trusteeship = 0;  //托管 0不托管  1托管
    this.robScore = -4;     //大于0叫分，小于0叫地主

    this.cardInHand = [];  //手里的牌
    this.cardInDesk = [];  //打出去的牌
    this.bombNum = 0;  //出去的炸弹数量

    if (opts){
        this.roomId = opts.roomId;
        this.seatIdx = opts.seatIdx;
        this.userId = opts.userId;
        this.areaIdx = opts.areaIdx;
    
        this.frontServerId = opts.frontServerId;
        this.location = opts.location;
        this.userNo = opts.userNo;
        this.nickname = opts.nickname;
        this.loginIp = opts.loginIp;
        this.userIcon = opts.userIcon;
        this.coinNum = opts.coinNum;
        this.hadUseCoin = opts.hadUseCoin;
        this.readyStat = opts.readyStat;

        this.trusteeship = opts.trusteeship;
        this.robScore = opts.robScore;
        this.cardInHand = opts.cardInHand;
        this.cardInDesk = opts.cardInDesk;
        this.bombNum = opts.bombNum;
    }
}

module.exports = CoinPlayer;

CoinPlayer.prototype.init = function(roomId, seatIdx, userId, areaIdx, serverId, next){
    var self = this;
    self.roomId = roomId;
    self.seatIdx = seatIdx;
    self.userId = userId;
    self.areaIdx = areaIdx;
    self.readyStat = 1;  //准备
    self.frontServerId = serverId;
    userRecord.getRecord(userId, function(err, record){
        if (err){
            return next(errcode.MONGO_DATABASE_ERR, err);
        }
        self.userNo = record.get("userNo");
        self.nickname = record.get("nickname");
        self.loginIp = record.get("loginIp");
        self.userIcon = record.get("userIconUrl");
        self.coinNum = record.get("coinNum");
        self.hadUseCoin = record.get("hadUseCoin");
        next(null, record);
    });
}

CoinPlayer.prototype.intiHandCard = function(handCard){
    this.cardInHand = handCard;
}

CoinPlayer.prototype.getPlayerRoomId = function(){
    return this.roomId;
}

CoinPlayer.prototype.getPlayerUserId = function(){
    return this.userId;
}

CoinPlayer.prototype.setRoomReadyStat = function(stat){
    this.readyStat = stat;
}

CoinPlayer.prototype.robLandlord = function(room, robScore){
    this.robScore = robScore;
    if (room.robArray.length > 0){
        var robLastData = room.robArray[room.robArray.length-1];
        if (robLastData.userId == this.getPlayerUserId()){
            return {errcode: Code.HAVE_ROBED, message: "你已经叫过了！"};
        }
    }
    room.robArray.push({robScore: robScore, userId: this.userId});
    if (robScore >= 0){
        if (robScore == 3){
            room.robMultiple = 3;
            room.dealerId = this.userId;
            room.nextSeatIdx = this.seatIdx;
            room.curPlayData = {userId: this.userId, seatIdx: this.seatIdx, cards: [], cardType: pokerCardType.invaild};
            return {errcode: Code.OK, dealerId: this.userId, nextIdx: this.seatIdx, isRestart: false};
        }else{
            room.robMultiple = robScore;
            if (handCard.nextSeatIdx(this.seatIdx) == room.firstRobSeatIdx){
                var dealerId = handCard.getRobScoreDealerId(room.robArray);
                if (dealerId != ""){
                    room.dealerId = dealerId;
                    room.nextSeatIdx = room.getPlayerByUId(room.dealerId).seatIdx;
                    room.curPlayData = {userId: dealerId, seatIdx: room.nextSeatIdx, cards: [], cardType: pokerCardType.invaild};
                    return {errcode: Code.OK, dealerId: dealerId, nextIdx: room.nextSeatIdx, isRestart: false};
                }else{
                    return {errcode: Code.OK, dealerId: "", nextIdx: -1, isRestart: true};
                }
            }else{
                room.nextSeatIdx = handCard.nextSeatIdx(this.seatIdx);
                return {errcode: Code.OK, dealerId: "", nextIdx: room.nextSeatIdx, isRestart: false};
            }
        }
    }else{/////////叫地主
        if (robScore == -2){
            if (!handCard.isHaveCallDealer(room.robArray)){
                return {errcode: Code.NO_USER_CALL_DEALER, message: "没有玩家叫地主！"}
            }
            room.robMultiple *= 2;
        }
        if (room.robArray.length >= 3){
            var dealerId = handCard.getRobMultipleDealerId(room.robArray);
            if (dealerId != ""){
                room.dealerId = dealerId;
                room.nextSeatIdx = room.getPlayerByUId(dealerId).seatIdx;
                room.curPlayData = {userId: dealerId, seatIdx: room.nextSeatIdx, cards: [], cardType: pokerCardType.invaild};
                return {errcode: Code.OK, dealerId: dealerId, nextIdx: room.nextSeatIdx, isRestart: false};
            }else{
                dealerId = handCard.getCallDealerId(room.robArray);
                if (dealerId != ""){
                    room.dealerId = dealerId;
                    room.nextSeatIdx = room.getPlayerByUId(dealerId).seatIdx;
                    room.curPlayData = {userId: dealerId, seatIdx: room.nextSeatIdx, cards: [], cardType: pokerCardType.invaild};
                    return {errcode: Code.OK, dealerId: dealerId, nextIdx: room.nextSeatIdx, isRestart: false};
                }else{
                    return {errcode: Code.OK, dealerId: "", nextIdx: -1, isRestart: true};
                }
            }
        }
        room.nextSeatIdx = handCard.nextSeatIdx(this.seatIdx);
        return {errcode: Code.OK, dealerId: "", nextIdx: room.nextSeatIdx, isRestart: false};
    }
}

CoinPlayer.prototype.playCard = function(room, cards){
    if (cards.length > 0){ //
        var cardType = handCard.getPokerCardType(cards);
        console.log(TAG, "card type:   ", cardType);
        if (cardType == pokerCardType.invaild){
            return {errcode: Code.CARD_TYPE_ERR, message: "牌型错误！"};
        }
        if (room.nextSeatIdx == this.seatIdx){
            if (room.nextSeatIdx == room.curPlayData.seatIdx){
                savePlayData(this, cards, cardType, room);
                return {errcode: Code.OK, nextIdx: handCard.nextSeatIdx(this.seatIdx), 
                remainderNum: this.cardInHand.length, isPass: true};
            }else{
                var playData = {cards: cards, cardType: cardType};
                if (handCard.comparePlayCard(playData, room.curPlayData) == 0){
                    savePlayData(this, cards, cardType, room);
                    return {errcode: Code.OK, nextIdx: handCard.nextSeatIdx(this.seatId), 
                    remainderNum: this.cardInHand.length, isPass: true};
                }else{
                    return {errcode: Code.PRESS_CARD_ERR, message: "压牌错误！"};
                }
            }
        }else{
            return {errcode: Code.NOT_PLAYING, message: "不是你出牌！"};
        }
    }else{//////不出
        var isPass = true;
        var nextIdx = handCard.nextSeatIdx(this.seatIdx);
        if (this.seatIdx == room.nextSeatIdx){
            handCard.appendGroupToDesk(this, cards);
            room.nextSeatIdx = nextIdx;
            if (nextIdx == room.curPlayData.seatIdx){
                isPass = false;
            }
        }else{
            console.log("不是你牌权！::::::  ", self.userId);
            return {errcode: Code.NOT_PLAYING, message: "不是你出牌！"};
        }
        return {errcode: Code.OK, nextIdx: nextIdx, 
        remainderNum: this.cardInHand.length, isPass: isPass};
    }
}

var savePlayData = function(self, cards, cardType, room){
    if (cardType == pokerCardType.bomb || cardType == pokerCardType.kingBomb){
        self.bombNum++;
        room.totalBombNum++;
    }
    UserHandCard.delCardsFromHand(self, cards);
    UserHandCard.appendGroupToDesk(self, cards);
    var data = {
        userId: self.userId,
        seatIdx: self.seatIdx,
        cards: cards,
        cardType: cardType,
    };
    room.curPlayData = data;
}

CoinPlayer.prototype.setPlayerServerId = function(serverId){
    if (serverId){
        this.frontServerId = serverId;
    }
}

CoinPlayer.prototype.getPlayerServerId = function(){
    return this.frontServerId;
}

CoinPlayer.prototype.setLoginIp = function(ip){
    this.loginIp = ip;
}