var roomMgr = require('./roommgr');
var userList = {};
var userOnline = 0;

exports.bind = function(userId,socket){
    userList[userId] = socket;
    userOnline++;
};

exports.getSocket = function(userId){
    return userList[userId];
}

exports.del = function(userId,socket){
    delete userList[userId];
    userOnline--;
};

exports.get = function(userId){
    return userList[userId];
};

exports.isOnline = function(userId){
    var data = userList[userId];
    if(data != null){
        return true;
    }
    return false;
};

exports.getOnlineCount = function(){
    return userOnline;
}

exports.sendMsg = function(userId,event,msgdata){
    logger.error("sendMsg userId %d, event [%s]",userId, event);
    logger.info(msgdata);
    var userInfo = userList[userId];
    if(userInfo == null){
        logger.error("can't find user");
        return;
    }
    var socket = userInfo;
    if(socket == null){
        logger.error("socket is null ");
        return;
    }

    socket.emit(event,msgdata);
};

exports.kickAllInRoom = function(roomId){
    try{
        if(roomId == null){
            return;
        }
        var roomInfo = roomMgr.getRoom(roomId);
        if(roomInfo == null){
            return;
        }

        for(var i = 0; i < roomInfo.seats.length; ++i){
            var rs = roomInfo.seats[i];

            //如果不需要发给发送方，则跳过
            if(rs.userId > 0){
                var socket = userList[rs.userId];
                if(socket != null){
                    exports.del(rs.userId);
                    socket.disconnect();
                }
            }
        }
    }catch(e){
        logger.error('kickAllInRoom exception');
        logger.error(e);
    }
};

exports.broacastInRoom = function(event,data,sender,includingSender){
    try{
        var roomId = roomMgr.getUserRoomId(sender);
        if(roomId == null){
            return;
        }
        var roomInfo = roomMgr.getRoom(roomId);
        if(roomInfo == null){
            return;
        }

        for(var i = 0; i < roomInfo.seats.length; ++i){
            var rs = roomInfo.seats[i];

            //如果不需要发给发送方，则跳过
            if(rs.userId == sender && includingSender != true){
                continue;
            }
            var socket = userList[rs.userId];
            if(socket != null){
                logger.info("broacastInRoom userId %d, [event] %s",rs.userId, event);
                logger.info(data);
                socket.emit(event,data);
            }
        }
    }catch(e){
        logger.error('broacastInRoom exception');
        logger.error(e);
    }
};