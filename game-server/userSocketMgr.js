var roomMgr = require('./roommgr');

exports.bind = function(userId, socket){
    g_gameCoinMgr.uidSocketMap[userId] = socket;
    g_gameCoinMgr.onlineCount++;
};

exports.getSocket = function(userId){
    return g_gameCoinMgr.uidSocketMap[userId];
}

exports.unbind = function(userId, socket){
    delete g_gameCoinMgr.uidSocketMap[userId];
    g_gameCoinMgr.onlineCount--;
};

exports.isOnline = function(userId){
    var socket = g_gameCoinMgr.uidSocketMap[userId];
    if(socket != null){
        return true;
    }
    return false;
};

exports.getOnlineCount = function(){
    return g_gameCoinMgr.onlineCount;
}
