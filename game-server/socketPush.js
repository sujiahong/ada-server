const TAG = "socketPush.js";
const socketMgr = require("./userSocketMgr");


exports.sendMsg = function (userId, event, msgdata) {
    logger.error(TAG + " sendMsg userId %d, event [%s]", userId, event);
    logger.info(msgdata);
    var socket = g_gameCoinMgr.uidSocketMap[userId];
    if (socket == null) {
        logger.error(TAG, "socket is null!!!! ");
        return;
    }
    socket.emit(event, msgdata);
};

exports.kickAllInRoom = function (roomId) {
    try {
        if (roomId == null) {
            return;
        }
        var roomInfo = g_gameCoinMgr.getRoomById(roomId);
        if (roomInfo == null) {
            return;
        }
        for (var i = 0, len = roomInfo.userIdArr.length; i < len; ++i) {
            var userId = roomInfo.userIdArr[i];
            //如果不需要发给发送方，则跳过
            if (userId != "null") {
                var socket = g_gameCoinMgr.uidSocketMap[userId];
                if (socket != null) {
                    scoketMgr.unbind(userId);
                    socket.disconnect();
                }
            }
        }
    } catch (e) {
        logger.error('kickAllInRoom exception');
        logger.error(e);
    }
};

exports.broacastInRoom = function (event, data, sender, includingSender) {
    try {
        var roomId = roomMgr.getUserRoomId(sender);
        if (roomId == null) {
            return;
        }
        var roomInfo = roomMgr.getRoom(roomId);
        if (roomInfo == null) {
            return;
        }

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];

            //如果不需要发给发送方，则跳过
            if (rs.userId == sender && includingSender != true) {
                continue;
            }
            var socket = g_gameCoinMgr.uidSocketMap[rs.userId];
            if (socket != null) {
                logger.info("broacastInRoom userId %d, [event] %s", rs.userId, event);
                logger.info(data);
                socket.emit(event, data);
            }
        }
    } catch (e) {
        logger.error('broacastInRoom exception');
        logger.error(e);
    }
};