///////在手里的牌和打出去的牌
"use strict"
const TAG = "userHandCard.js";
const utils = require('../../util/utils');
const redis = require("../../redis/redisCoinDDZ");
const constant = require("../../shared/constant");
const landlord = require("./landlordCard");
const Code = require("../../shared/errcode");

const MAX_NUM = 3;
const pokerCardType = constant.POKER_CARD_TYPE;
var UserHandCard = module.exports;

UserHandCard.nextSeatIdx = function(seatIdx){
    return (seatIdx + 1) % MAX_NUM;
};

UserHandCard.getRobScoreDealerId = function(robArray){
    var max = 0;
    var robId = "";
    for (var i = 0; i < robArray.length; ++i){
        if (robArray[i].robScore > max){
            max = robArray[i].robScore;
            robId = robArray[i].userId;
        }
    }
    return robId;
}

UserHandCard.isHaveCallDealer = function(robArray){  //
    for (var i = 0; i < robArray.length; ++i){
        if (robArray[i].robScore == -1){
            return true;
        }
    }
    return false;
}

UserHandCard.getCallDealerId = function(robArray){
    for (var i = 0; i < robArray.length; ++i){
        if (robArray[i].robScore == -1){
            return robArray[i].userId;
        }
    }
    return "";
}

UserHandCard.getRobMultipleDealerId = function(robArray){
    for (var len = robArray.length, i = len-1; i >= 0 ; --i){
        if (robArray[i].robScore == -2){
            return robArray[i].userId;
        }
    }
    return "";
}

UserHandCard.removeCardFromHand = function(player, cardKeyId){
    for (var i in player.cardInHand){
        if (player.cardInHand[i] == cardKeyId){
            player.cardInHand.splice(i, 1);
            return;
        }
    }
};

UserHandCard.delCardsFromHand = function(player, cards){
    if (cards){
        for (var i in cards){
            UserHandCard.removeCardFromHand(player, cards[i]);
        }
    }
}

UserHandCard.appendGroupToDesk = function(player, group){
    if (group){
        player.cardInDesk.push(group);
    }
};

UserHandCard.addLandlordCard = function(player, cards){
    for (var i in cards){
        player.cardInHand.push(cards[i]);
    }
}

UserHandCard.comparePlayCard = function(playData, curData){
    if (playData && curData){
        if (curData.cardType == pokerCardType.kingBomb){
            return 2;
        }
        else if (curData.cardType == pokerCardType.bomb){
            if (playData.cardType == pokerCardType.kingBomb){
                return 0;
            }
            else if (playData.cardType == pokerCardType.bomb){
                return comparePokerValue(playData.cards, curData.cards, pokerCardType.bomb);
            }
            else{
                return 2;
            }
        }
        else{
            if (playData.cardType == pokerCardType.kingBomb || playData.cardType == pokerCardType.bomb){
                return 0;
            }
            else{
                if (curData.cardType == playData.cardType){
                    return comparePokerValue(playData.cards, curData.cards, curData.cardType);
                }
                else{
                    return 2;
                }
            }
        }
    }
    return 1;
}

var comparePokerValue = function(playCards, curCards, cardType){
    if (playCards.length > 0 && curCards.length > 0){
        if (pokerCardTypeCompareHandler[cardType](playCards, curCards)){
            return 0;
        }
        return 2;
    }
}

var pokerCardTypeCompareHandler = {
    [pokerCardType.singleCard]: function(tCard, tCur){
        var val1 = tCard[0];
        var val2 = tCur[0];
        return UserHandCard.getPokerValue(val1) > UserHandCard.getPokerValue(val2);
    },
    [pokerCardType.pairCard]: function(tCard, tCur){
        var val1 = tCard[0];
        var val2 = tCur[0];
        return UserHandCard.getPokerValue(val1) > UserHandCard.getPokerValue(val2);
    },
    [pokerCardType.threeCard]: function(tCard, tCur){
        var val1 = tCard[0];
        var val2 = tCur[0];
        return UserHandCard.getPokerValue(val1) > UserHandCard.getPokerValue(val2);
    },
    [pokerCardType.consecutivePair]: function(tCard, tCur){
        return compareWithShunzi.call(this, tCard, tCur, 2);
    },
    [pokerCardType.threeSequence]: function(tCard, tCur){
        return compareWithShunzi.call(this, tCard, tCur, 3);
    },
    [pokerCardType.singleSequence]: function(tCard, tCur){
        return compareWithShunzi.call(this, tCard, tCur, 1);
    },
    [pokerCardType.aircraftWithWings]: function(tCard, tCur){
        return compareWithShunzi.call(this, tCard, tCur, 3);
    },
    [pokerCardType.threeWithPair]: function(tCard, tCur){
        var val1 = getCardValByNum(tCard, 3);
        var val2 = getCardValByNum(tCur, 3);
        return val1 > val2;
    },
    [pokerCardType.threeWithOne]: function(tCard, tCur){
        var val1 = getCardValByNum(tCard, 3);
        var val2 = getCardValByNum(tCur, 3);
        return val1 > val2;
    },
    [pokerCardType.fourWithPair]: function(tCard, tCur){
        var val1 = getCardValByNum(tCard, 4);
        var val2 = getCardValByNum(tCur, 4);
        return val1 > val2;
    },
    [pokerCardType.bomb]: function(tCard, tCur){
        if (tCard.length > tCur.length){
            return true;
        }else if (tCard.length < tCur.length){
            return false;
        }else{
            var val1 = tCard[0];
            var val2 = tCur[0];
            return UserHandCard.getPokerValue(val1) > UserHandCard.getPokerValue(val2);
        }
    }
}

var compareWithShunzi = function(tCard, tCur, num){
    if (tCard.length == tCur.length){
        var cardSeqTab = getAppointSequence(tCard, num);
        var curSeqTab = getAppointSequence(tCur, num);
        // if (userSelectPlay == play_limit_type.A2Consecutive){
        //     if (!(isHaveKA(cardSeqTab))){
        //         pokerA2Convert(cardSeqTab);
        //     }
        //     if (!(isHaveKA(curSeqTab))){
        //         pokerA2Convert(curSeqTab);
        //     }
        // }
        var val1 = getMaxPokerVal(cardSeqTab);
        var val2 = getMaxPokerVal(curSeqTab);
        return val1 > val2;
    }else{
        return false;
    }
}

var getAppointSequence = function(tCard, num){
    if (tCard.length > 0){
        var pokValTab = landlord.prototype.getPokerValueArr(tCard);
        var valKeyTab = landlord.prototype.getPokerValNumMap(pokValTab);
        var tempTab = [];
        for (var k in valKeyTab){
            if (valKeyTab[k] >= num){
                tempTab.push(Number(k));
            }
        }
        return tempTab;
    }
    return [];
}

var getMaxPokerVal = function(tValCard){
    if (tValCard.length > 0){
        var maxVal = 0;
        for (var k in tValCard) {
            if (tValCard[k] > maxVal) {
                maxVal = tValCard[k];
            }
        }
        return maxVal;
    }
}

var getCardValByNum = function(tCard, num){
    if (tCard.length > 0){
        var keyArr = [];
        var pokValTab = landlord.prototype.getPokerValueArr(tCard);
        var valKeyTab = landlord.prototype.getPokerValNumMap(pokValTab);
        for (var k in valKeyTab){
            if (valKeyTab[k] == num){
                keyArr.push(Number(k));
            }
        }
        if (keyArr.length > 0){
            return keyArr[keyArr.length-1];
        }
    }
    return 0;
}

UserHandCard.getPokerCardType = function(tCard){
    if (tCard && typeof(tCard) == "object") {
        //console.log(landlord, landlord.prototype)
        var tab = landlord.prototype.getPokerValueArr(tCard);
        if (isSingleCard(tab)){
            return pokerCardType.singleCard;
        }
        else if (isPairCard(tab)){
            return pokerCardType.pairCard;
        }
        else if (isThreeCard(tab)){
            return pokerCardType.threeCard;
        }
        else if (isConsecutivePair(tab)){
            return pokerCardType.consecutivePair;
        }
        else if (sThreeWithOne(tab)){
            return pokerCardType.threeWithOne;
        }
        else if (isThreeWithPair(tab)){
            return pokerCardType.threeWithPair;
        }
        else if (isSingleSequence(tab)){ 
            return pokerCardType.singleSequence;
        }
        else if (isBomb(tab)){ 
            return pokerCardType.bomb;
        }
        else if (isKingBomb(tab)){
            return pokerCardType.kingBomb;
        }
        else if (isFourWithTwo(tab)){
            return pokerCardType.fourWithPair;
        }
        else if (isThreeSequence(tab)){
            return pokerCardType.threeSequence;
        }
        else if (isAircraftWithWings(tab)){
            return pokerCardType.aircraftWithWings;
        }
        else{
          return pokerCardType.invaild;
        }
    }
    return pokerCardType.invaild;
};

/////////////////各种牌型验证////////////////
UserHandCard.getPokerSuit = function(cardKeyId){
    if(cardKeyId){
        return Number(cardKeyId) / 100;
    }
    return 0;
};

UserHandCard.getPokerValue = function(cardKeyId){
    if(cardKeyId){
        return Number(cardKeyId) % 100;
    }
    return 0; 
};

UserHandCard.isSingleCard = function(tCard){
    if(tCard && typeof(tCard) == "object" ){
        if(tCard.length == 1){
            return true;
        }
    }
    return false;
};

UserHandCard.isPairCard = function(tCard){
    if( tCard && typeof(tCard) == "object" ){
        if(tCard.length == 2){
            if( this.isEqualValueInCardTab(tCard, 1)){
                return true;
            }
        }
    }
    return false;
};

UserHandCard.isThreeCard = function(tCard){
    if(tCard && typeof(tCard) == "object" ){
        if(tCard.length == 3){
            if( this.isEqualValueInCardTab(tCard, 1)){
                return true;
            }
        }
    }
    return false;
};

UserHandCard.isConsecutivePair = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length >= 6 && tCard.length % 2 == 0){
            if(this.isContinuousValueInCardTab(tCard, 2, 3)){
                return true;
            }
        }
    }
    return false;
};

UserHandCard.isThreeSequence = function(tCard){
    if(tCard && typeof(tCard) == "object" ){
        if(tCard.length >= 6 && tCard.length % 3 == 0 ){
            if(this.isHaveOnlyThree(tCard)){
                if(this.isContinuousValueInCardTab(tCard, 3, 2)){
                    return true;
                }
            }
        }
    }
    return false;
};

UserHandCard.isHaveOnlyThree = function(tCard){
    if (tCard){
        var valKeyTab = landlord.prototype.getPokerValNumMap(tCard);
        for (var k in valKeyTab){
            if (valKeyTab[k] != 3){
                return false;
            }
        }
        return true;
    }
    return false;
}

UserHandCard.isThreeWithPair = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length == 5){
            if (this.isHaveFixNum(tCard, 3)){
                if(this.isEqualValueInCardTab(tCard, 2)){
                    return true;
                }
            }
        }
    }
    return false;
};

UserHandCard.isHaveFixNum = function(tCard, num){
    if (tCard){
        var valKeyTab = landlord.prototype.getPokerValNumMap(tCard);
        for (var k in valKeyTab){
            if (valKeyTab[k] == num){
                return true;
            }
        }
    }
    return false;
};

UserHandCard.isThreeWithOne = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length == 4){
            if (this.isHaveFixNum(tCard, 3)){
                if(this.isEqualValueInCardTab(tCard, 2)){
                    return true;
                }
            }
        }
    }
    return false;
};

UserHandCard.isAircraftWithWings = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        var baseArr = [4, 5];
        for (var i in baseArr){
            if(tCard.length >= baseArr[i]*2 && tCard.length % baseArr[i] == 0){
                var seqNum = tCard.length / baseArr[i];
                var valNumMap = landlord.prototype.getPokerValNumMap(tCard);
                if (isAircraftSequence(valNumMap, seqNum, i)){
                    return true;
                }
            }
        }
    }
    return false;
};

var isAircraftSequence = function(valNumMap, seqNum, flag){
    var threeValMap = {};
    var otherValMap = [];
    for (var i in valNumMap){
        if (valNumMap[i] >= 3){
            threeValMap[i] = 3;
            if (valNumMap[i] == 4){
                otherValMap.push(i);
            }
        }else{
            if (flag == 0){ //带1
                for (let j = 0; j < valNumMap[i]; ++j){
                    otherValMap.push(i);
                }
            }else{
                otherValMap.push(i);
            }
        }
    }
    var threeLength = utils.objectSize(threeValMap);
    console.log(seqNum, threeLength, otherValMap.length)
    if (threeLength < otherValMap.length){
        return false;
    }
    else{
        if (isConsective(threeValMap, seqNum, otherValMap.length)){
            return true;
        }
    }
    return false;
}

var isConsective = function(valNumMap, length, withLength){
    if (utils.objectSize(valNumMap) == length){
        var count = 0;
        for(var i in valNumMap){
            if (Number(i) == 15){
                return false;
            }
            count++;
            if (count == length || length == 1){
                return true;
            }
            if(!valNumMap[Number(i)+1]){
                return false;
            }
        }
    }else{
        if (withLength == 0){
            var valArr = Object.keys(valNumMap);
            if(valArr[valArr.length-2] - valArr[0] == length - 1){
                if (valArr[valArr.length - 2] == 15 || valArr[0] == 15){
                    return false;
                }
                return true;
            }else if(valArr[valArr.length-1] - valArr[1] == length - 1){
                if (valArr[valArr.length - 1] == 15 || valArr[1] == 15){
                    return false;
                }
                return true; 
            }
        }
    }
    return false;
}

UserHandCard.isBomb = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length >= 4){
            if(this.isEqualValueInCardTab(tCard, 1)){
                return true;
            }
        }
    }
    return false;
};

UserHandCard.isKing = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        for (var k in tCard){
            if(tCard[k] != 17 && tCard[k] != 18){ //17 小王 18 大王
                return false;
            }
        }
        return true;
    }
    return false;
};

UserHandCard.isKingBomb = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length == 2 || tCard.length == 4) {
            if(this.isKing(tCard)){
                return true;
            }
        }
    }
    return false;
}

UserHandCard.isSingleSequence = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length >= 5){
            if(this.isContinuousValueInCardTab(tCard, 1, 5)){
                return true;
            }
        }
    }
    return false;
};

UserHandCard.isFourWithTwo = function(tCard){
    if(tCard && typeof(tCard) == "object"){
        if(tCard.length == 6 || tCard.length == 8){
            var valNumMap = landlord.prototype.getPokerValNumMap(tCard);
            if (utils.objectSize(valNumMap) <= 3){
                if((this.isHaveFixNum(tCard, 4) && !this.isHaveFixNum(tCard, 3))){
                    return true;
                }
            }
        }
    }
    return false;
};

UserHandCard.isContinuousValueInCardTab = function(tCard, valNum, conNum){  // AA 22 33能连吗 
    if (tCard && typeof(tCard) == "object") {
        var tempTab = landlord.prototype.getPokerValNumMap(tCard);
        var tValue = [];
        for(var k in tempTab){
            if(tempTab[k] == Number(valNum)){
                tValue.push(Number(k));
            }else{
                return false;
            } 
        }
        if (!(isHaveKA2.call(this, tValue))){
            return false;
        }
        // if (userSelectPlay == play_limit_type.none_shunzi) {
        //     if (valNum == 1) {
        //         return false
        //     }
        // }
        // else if(userSelectPlay == play_limit_type.classic_play){
        //     if (isHavePoker2(tValue)) {
        //         return false;
        //     }
        // }
        // else if(userSelectPlay == play_limit_type.A2Consecutive){
        //     if (!(isHaveKA(tValue))) {
        //         pokerA2Convert(tValue);
        //     }
        // }
        var num = tValue.length;
        if(num >= conNum){
            for(var k = 0; k < num - 1; ++k){
                if (!(tValue[k] + 1 == tValue[k + 1])){
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}

var isHaveKA2 = function(tValue){
    if (tValue) {
        var stTab = [];
        for (var k in tValue) {
            if (tValue[k] == 15){
                return false;
            }
            if (tValue[k] == 13 || tValue[k] == 14 || tValue[k] == 15) {
                stTab.push(tValue[k]);
            }
        }
        if (stTab.length < 3) {
            return true;
        }
    }
    return false;
}

UserHandCard.isEqualValueInCardTab = function(tCard, equalNum){
    equalNum = equalNum || 1;
    if (tCard && typeof(tCard) == "object") {
        var tempTab = landlord.prototype.getPokerValNumMap(tCard);
        var num = utils.objectSize(tempTab);
        if (num == equalNum) {
            return true;
        }
    }
    return false;
}