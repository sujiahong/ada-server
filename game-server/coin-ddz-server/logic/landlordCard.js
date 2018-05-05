"use strict";
const TAG = "landlordCard.js";
const util = require("../util/utils");
const constant = require("../../shared/constant");
const CARD_LANDLORD = constant.CARD_POKER;

function landlordCard(opts){
    this.shuffleCard = [];
    this.adjustCard = [];
}

module.exports = landlordCard;

landlordCard.prototype.shuffle = function(){
    for (var i in CARD_LANDLORD){
        if (this.adjustCard.length > 0){
            if (!this.isInAdjustCard(CARD_LANDLORD[i])){
                this.shuffleCard.push(CARD_LANDLORD[i]);
            }
        }else{
            this.shuffleCard.push(CARD_LANDLORD[i]);
        }
    }
    for (var j=0; j < this.shuffleCard.length; ++j){
        var ram = getRandom() % this.shuffleCard.length;
        var card = this.shuffleCard[j];
        this.shuffleCard[j] = this.shuffleCard[ram];
        this.shuffleCard[ram] = card;
    }
};

landlordCard.prototype.isInAdjustCard = function(keyId){
    for (var i in this.adjustCard){
        for (var ii in this.adjustCard[i]){
            if (this.adjustCard[i][ii] == keyId){
                return true;
            }
        }
    }
    return false;
};

function getRandom() {
	return Math.floor(Math.random() * 10000);
}
// var testCard = [103,204,303,403,104,104,304,404,105,205,305,405,106,206,306,406,117,
// 107,207,307,407,108,208,308,408,109,209,309,409,110,210,310,410,118,
// 111,211,311,411,112,212,312,412,113,213,313,413,114,214,314,414,115,215,315,415];
landlordCard.prototype.assignCard = function(level){
    var assignData = [];
    var len = 0;
    var arr = [];
    var row = 0;
    if (this.adjustCard.length > 0){
        len = this.adjustCard[row].length;
        arr = this.adjustCard[row];
    }
    for (var i = 0; i < this.shuffleCard.length; ++i){
        arr.push(this.shuffleCard[i]);
        len ++;
        if (len == 17){
            assignData.push(arr);
            row++;
            arr = [];
            len = 0;
            if (this.adjustCard.length > 0){
                len = this.adjustCard[row].length;
                arr = this.adjustCard[row];
            }
        }
    }
    assignData.push(arr); //地主牌
    if(this.adjustCard.length == 0){
        this.matchingCard(assignData);  //配牌
    }
    return assignData;
};

landlordCard.prototype.matchingCard = function(assignCard){
    var self = this;
    var span = 1;
    var _matching = function (index){
        //console.log(index);
        if (index == 3){
            return;
        }
        var changeCards = [];
        var valueArr = self.getPokerValueArr(assignCard[index]);
        var valNumMap = self.getPokerValNumMap(valueArr);
        var singleValNumMap = {};
        var pairValNumMap = {};
        var otherValNumMap = {};
        for (let i in valNumMap){
            if (valNumMap[i] == 1 && Number(i) < 13){//小于13=K
                singleValNumMap[i] = valNumMap[i];
            }else if(valNumMap[i] == 2 && Number(i) < 13){
                pairValNumMap[i] = valNumMap[i];
            }else{
                otherValNumMap[i] = valNumMap[i];
            }
        }
       // console.log(singleValNumMap, "fdi    ", pairValNumMap)
        var singleNum = util.objectSize(singleValNumMap);
        var pairNum = util.objectSize(pairValNumMap);
        if (singleNum >= 3){
            var count = 0;
            for (let i in singleValNumMap){
                if (count == 3){
                    break;
                }
                changeValue(assignCard[index], changeCards, Number(i));
                count++;
            }
        }else if (singleNum > 0 && singleNum < 3 && pairNum > 0){
            changeValue(assignCard[index], changeCards, Number(Object.keys(singleValNumMap)[0]));
            let valArr = Object.keys(pairValNumMap);
            changeValue(assignCard[index], changeCards, Number(valArr[0]));
            changeValue(assignCard[index], changeCards, Number(valArr[0]));
        }else{
            console.log("不够交换", index, "span: ", span);
            if (assignCard[index].length == 20){
                if(pairNum > 0){
                    let valArr = Object.keys(pairValNumMap);
                    changeValue(assignCard[index], changeCards, Number(valArr[0]));
                    changeValue(assignCard[index], changeCards, Number(valArr[0]));
                    var lastVal = getPokerValue(assignCard[index][assignCard[index].length-1]);
                    changeValue(assignCard[index], changeCards, lastVal);
                }else{
                    let valArr = Object.keys(otherValNumMap)
                    changeValue(assignCard[index], changeCards, Number(valArr[0]));
                    changeValue(assignCard[index], changeCards, Number(valArr[0]));
                    changeValue(assignCard[index], changeCards, Number(valArr[0]));
                }
            }else if (assignCard[index].length == 17){
                span++;
                return _matching(index + 1);
            }
        }
        var nextIdx = (index + 1) % 3;
        if (index == 2){
            nextIdx = (index + span) % 3;
        }
        addToAssignCard(assignCard[nextIdx], changeCards);
        _matching(index + 1);
    };
    _matching(0);
};

landlordCard.prototype.getPokerValueArr = function(tCard){
    if (tCard && typeof(tCard) == "object") {
        var tempTab = [];
        for (var k in tCard) {
            var val = getPokerValue(tCard[k]);
            tempTab.push(val);
        }
        return tempTab;
    }
    return [];
};

var getPokerValue = function(cardKeyId){
    if(cardKeyId){
        return Number(cardKeyId) % 100;
    }
    return 0; 
};

landlordCard.prototype.getPokerValNumMap = function(tCard){
    if (tCard && typeof(tCard) == "object") {
        var tempTab = {};
        for (var k in tCard) {
            var v = tCard[k];
            if (!(tempTab[v])) {
                tempTab[v] = 1;
            }
            else{
                tempTab[v] = tempTab[v] + 1;
            }
        }
        return tempTab;
    }
    return {};
};

var changeValue = function(cardArr, exchangeArr, val){
    for (var i in cardArr){
        if (getPokerValue(cardArr[i]) == val){
            //console.log(getPokerValue(cardArr[i]))
            exchangeArr.push(cardArr[i]);
            cardArr.splice(i, 1);
            return;
        }
    }
};

var addToAssignCard = function(cardArr, exchangeArr){
    for (var i in exchangeArr){
        cardArr.push(exchangeArr[i]);
    }
};

landlordCard.prototype.setAdjustCard = function(cards1, cards2, cards3){
    for (var i = 0; i < cards1.length; ++i){
        cards1[i] = Number(cards1[i]);
    }
    for (var i = 0; i < cards2.length; ++i){
        cards2[i] = Number(cards2[i]);
    }
    for (var i = 0; i < cards3.length; ++i){
        cards3[i] = Number(cards3[i]);
    }
    this.adjustCard.push(cards1);
    this.adjustCard.push(cards2);
    this.adjustCard.push(cards3);
}