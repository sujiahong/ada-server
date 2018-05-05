"use_strict";
const TAG = "coinNiuPlayer.js";
const errcode = require("../../shared/errcode");
const userRecord = require("../../parse/UserRecord");
const util = require("../../util/utils");
const constant = require("../../shared/constant");
const pokerCardType = constant.POKER_CARD_TYPE;

var CoinNiuPlayer = function(opts){
    this.roomId = "";
    this.seatIdx = 0;
    this.userId = "";

    this.frontServerId = "";
    this.location = "";
    this.userNo = "";
    this.nickname = "";
    this.loginIp = "";
    this.userIcon = "";
    this.sex = 0;
    this.clientPlat = "";
    this.coinNum = 0;
    this.hadUseCoin = 0;
    this.readyStat = 0;
    this.flopStat = 0;
    this.multiple = -1;  //叫的倍数
    this.cardInHand = [];  //手里的牌
    //this.trusteeship = 0;  //托管 0不托管  1托管

    if (opts){
        this.roomId = opts.roomId;
        this.seatIdx = opts.seatIdx;
        this.userId = opts.userId;
    
        this.frontServerId = opts.frontServerId;
        this.location = opts.location;
        this.userNo = opts.userNo;
        this.nickname = opts.nickname;
        this.loginIp = opts.loginIp;
        this.userIcon = opts.userIcon;
        this.sex = opts.sex;
        this.clientPlat = opts.clientPlat;
        this.coinNum = opts.coinNum;
        this.hadUseCoin = opts.hadUseCoin;
        this.readyStat = opts.readyStat;
        this.flopStat = opts.flopStat;
        //this.trusteeship = opts.trusteeship;
        this.cardInHand = opts.cardInHand;
        this.multiple = opts.multiple;  //叫的倍数
    }
}

module.exports = CoinNiuPlayer;

CoinNiuPlayer.prototype.init = function(userId, serverId, next){
    var self = this;
    self.userId = userId;
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
        self.sex = record.get("sex");
        self.clientPlat = record.get("clientPlat");
        next(errcode.OK, record);
    });
}

CoinNiuPlayer.prototype.setRoomId = function(roomId){
    this.roomId = roomId;
}

CoinNiuPlayer.prototype.setSeatIdx = function(idx){
    this.seatIdx = idx;
}

CoinNiuPlayer.prototype.setHandCard = function(handCard){
    this.cardInHand = handCard;
}

CoinNiuPlayer.prototype.robMultiple = function(multi){
    this.multiple = multi;
}

CoinNiuPlayer.prototype.setReady = function(stat){
    this.readyStat = stat;
}

CoinNiuPlayer.prototype.setFlopStat = function(stat){
    this.flopStat = stat;
}

CoinNiuPlayer.prototype.getClientPlayerData = function(){
    var curPlayer = this;
    return {
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
        cardInHand: curPlayer.cardInHand
    };
}