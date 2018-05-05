const redis = require("redis");

var client = null;

var exp = module.exports;

exp.init = function(config){
    client = redis.createClient(config.PORT, config.HOST, {});
    client.on("error", function(err){
        console.error("redis ======== error  error:  ", err);
    });
}

exp.setRoomIdGameType = function(roomId, gameType){
	client.hset("ROOMID_GAMETYPE", roomId, gameType);
};

exp.rmvUserIdServerId = function(roomId){
	client.hdel("ROOMID_GAMETYPE", roomId);
};

exp.existsRoomId = function(roomId, next){
    client.hexists("ROOMID_GAMETYPE", roomId, next);
}

////////////////////////////////////////
exp.setCoinRoom = function(roomId, roomData){
    client.set("COIN_ROOM_" + roomId, JSON.stringify(roomData));
    client.expire("COIN_ROOM_"  + roomId, 3600);
}

exp.getCoinRoom = function(roomId, next){
    client.get("COIN_ROOM_" + roomId, function(err, str){
        if (err){
            return next(err);
        }
        return next(null, JSON.parse(str));
    });
}

exp.existCoinRoom = function(roomId, next){
    client.exists("COIN_ROOM_" + roomId, next);
}

exp.delCoinRoom = function(roomId){
    client.del("COIN_ROOM_" + roomId);
}