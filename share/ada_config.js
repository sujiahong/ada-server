var LOCAL_HOST = "127.0.0.1";		// 对外
var REMOTE_HOST = "192.168.1.3";

//帐号服务器提供给客户端
var ACCOUNT_FOR_CLIENT_PORT = 9000;

// 大厅server提供给客户端访问的
var HALL_FOR_CLIENT_IP = REMOTE_HOST;
var HALL_FOR_CLIENT_PORT = 9001;

// 大厅服给gameserver注册用的,有可能不在一条机器上
var HALL_FOR_GAEM_IP = LOCAL_HOST;
var HALL_FOR_GAEM_PORT = 9002;

// game提供给客户端的
var GAME_FOR_CLIENT_IP = REMOTE_HOST;
var GAME_FOR_CLIENT_PORT = 9003;

// game为hall 提供的查询服务有可能不在一台机器上
var GAME_FOR_HALL_IP = LOCAL_HOST;
var GAME_FOR_HALL_PORT = 9005;

// data服务
var DATA_SERVER_IP = LOCAL_HOST;
var DATA_SERVER_PORT = 7000;


var ACCOUNT_PRI_KEY = "^&*#$%()@";
var ROOM_PRI_KEY = "~^*&^*())";

var gameType = require("./game_config");

exports.mysql = function(){
	return {
		HOST:'127.0.0.1',
		USER:'root',
		PSWD:'root',
		DB:'mj',
		PORT:3306
	}
};

exports.redis = function(){
	return {
		HOST: LOCAL_HOST,
		PORT: 6379,
		DB: 0
	}
}

//数据
exports.data_server = function(){
	return {
		DATA_SERVER_IP: DATA_SERVER_IP,
		DATA_SERVER_PORT: DATA_SERVER_PORT
	};
};


//账号服配置
exports.account_server = function(){
	return {
		CLIENT_PORT: ACCOUNT_FOR_CLIENT_PORT,
		HALL_IP: HALL_FOR_CLIENT_IP,		// 这个IP会返回给客户端
		HALL_CLIENT_PORT: HALL_FOR_CLIENT_PORT,
		ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
		DEALDER_API_IP: LOCAL_HOST,
		DEALDER_API_PORT: 12581,
	};
};

//大厅服配置
exports.home_server = function(){
	return {
		SERVER_ID: "home-server-1",

		HALL_IP: REMOTE_HOST,
		CLEINT_PORT: 9001,

		HALL_FOR_GAEM_IP: LOCAL_HOST,
		HALL_FOR_GAEM_PORT:	9002,

		ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
		ROOM_PRI_KEY: ROOM_PRI_KEY
	};
};

//游戏服配置
exports.coin_niu_server = function(){
	return [{
		SERVER_ID:"coin-niu-server-1",
		GAME_TYPE: gameType.game_type.niuniu,
		//暴露给大厅服的HTTP端口号
		GAME_FOR_HALL_PORT: 9010,
		GAME_FOR_HALL_IP: LOCAL_HOST,
		//HTTP TICK的间隔时间，用于向大厅服汇报情况
		HTTP_TICK_TIME:	5000,
		//大厅服IP
		HALL_FOR_GAEM_IP: LOCAL_HOST,
		HALL_FOR_GAEM_PORT: 9002,

		//与大厅服协商好的通信加密KEY
		ROOM_PRI_KEY: ROOM_PRI_KEY,

		//暴露给客户端的接口
		CLIENT_IP: REMOTE_HOST,
		CLIENT_PORT: 9100,
	},
	{
		SERVER_ID:"coin-niu-server-2",
		GAME_TYPE: gameType.game_type.niuniu,
		//暴露给大厅服的HTTP端口号
		GAME_FOR_HALL_PORT: 9011,
		GAME_FOR_HALL_IP: LOCAL_HOST,
		//HTTP TICK的间隔时间，用于向大厅服汇报情况
		HTTP_TICK_TIME:	5000,
		//大厅服IP
		HALL_FOR_GAEM_IP: LOCAL_HOST,
		HALL_FOR_GAEM_PORT: 9002,

		//与大厅服协商好的通信加密KEY
		ROOM_PRI_KEY: ROOM_PRI_KEY,

		//暴露给客户端的接口
		CLIENT_IP: REMOTE_HOST,
		CLIENT_PORT: 9101,
	},
	{
		SERVER_ID:"coin-niu-server-3",
		GAME_TYPE: gameType.game_type.niuniu,
		//暴露给大厅服的HTTP端口号
		GAME_FOR_HALL_PORT: 9012,
		GAME_FOR_HALL_IP: LOCAL_HOST,
		//HTTP TICK的间隔时间，用于向大厅服汇报情况
		HTTP_TICK_TIME:	5000,
		//大厅服IP
		HALL_FOR_GAEM_IP: LOCAL_HOST,
		HALL_FOR_GAEM_PORT: 9002,

		//与大厅服协商好的通信加密KEY
		ROOM_PRI_KEY: ROOM_PRI_KEY,

		//暴露给客户端的接口
		CLIENT_IP: REMOTE_HOST,
		CLIENT_PORT: 9102,
	}
	];
};
