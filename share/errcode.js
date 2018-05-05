module.exports = {
	OK: 0,						//成功
	FAIL: 1,        			//服务器错误
	TIMEOUT: 2,				    //超时
	HAVE_FROZEN: 3,				//帐号已被冻结
	BIND_UID_FAIL: 8,			//绑定用户id失败
	REGISTER_FAIL: 9,			//注册失败
	WXOPNEID_NULL:10,			//微信openid为空
	LOGIN_ERR: 11,   			//登录失败
	LOGINED: 12,     			//你的账号已登录！
	LOGINED_INVALID: 13,		//登录信息失效
	LOGIN_USERID_NULL: 14,		//登录用户Id为空

	REDIS_DATABASE_ERR: 15,		//redis数据库错误
	MONGO_DATABASE_ERR: 16,		//mongo数据库错误
	PUSH_MESSAGE_ERR: 20,		//推送消息错误
	PARM_ERR: 21,				//参数错误
///////////////////////////niuniu//////////////////////////////////////

	NOT_IN_NIU_ROOM_WITNESS: 100,//不在观战中
	NOT_IN_NIU_ROOM_SEAT: 101,	 //不在座位上

	NIU_ROOM_NOT_EXIST: 110,	//牛牛房间不存在
	NIU_ROOMID_ERR: 111,		//牛牛房间Id错误
	NOT_IN_NIU_ROOM: 112,		//不在牛牛房间里
	NIU_ROOM_HAVE_READYED: 113,	//已经准备了
	HAVE_IN_NIU_ROOM: 114,		//已经在牛牛房间里了
	PLAYER_HAVE_IN_SEAT: 115, 	//座位上已经有玩家了

	NIU_ROOM_HAVE_ROBED: 120,			//已经抢过地主了
	NIU_ROOM_HAVE_CALL_MULTI: 121,		//已经叫过分了
	NIU_ROOM_HAVE_FLOPED: 122,			//已经亮过牌了

////////////////////////////douzizhu////////////////////////////////////////
	ADD_AREA_ERR: 540,			//加入场次失败
	EXIT_AREA_ERR: 541,			//退出场次失败

	MATCH_ERR: 550,				//匹配失败
	HAVE_IN_AREA: 551,			//已经在场次里面
	NOT_IN_AREA: 552,			//你不在该场次里
	ROOM_WITH_COIN_ERR: 553,	//带币入场失败
	ROOM_BACK_COIN_ERR: 554,	//出房退币失败
	COIN_NOT_ENOUGH: 555,       //金币不足
	SAME_USERID: 556,			//匹配到相同userId
	SESSION_NULL: 557,			//session为空
	MATCHING: 558,				//正在匹配中
	MATCHED: 559,				//已经匹配到了
	IN_ROOM_NOT_IN_AREA: 560,	//已经在房间里不应该加入场次

	ROB_ERR: 600,				//抢地主错误
	NOT_ROBING: 601,			//不是你抢地主
	ROB_END: 602,				//抢地主结束
	HAVE_ROBED: 603,			//已经叫过了
	NO_USER_CALL_DEALER: 604,	//没有玩家叫地主
	HAVE_CALL_ONE_SCORE: 605,	//已经叫过1分了
	HAVE_CALL_TWO_SCORE: 606,	//已经叫过2分了
	HAVE_CALL_THREE_SCORE: 607,	//已经叫过3分了


	PLAY_CARD_ERR: 620,			//打牌错误
	NOT_PLAYING: 621,     		//不是你出牌
	CARD_TYPE_ERR: 622,         //牌型错误
	PRESS_CARD_ERR: 623, 		//压牌错误


	ABROGATE_TRUSTEE_ERR: 630,	//取消托管失败
	HAVE_ABROGATED: 631,		//已经取消托管

	CHANGE_ROOM_ERR: 650,		//换桌失败

	READY_GAME_ERR: 660,		//继续游戏失败

	CODE_MSG:{
        0 : "成功",
        
        1: "服务器错误",
		2: "超时",
		3: "帐号已被冻结",

		8: "绑定用户id失败",
		9: "注册失败",
		10: "微信openid为空",
		11: "登录失败",
		12: "你的账号已登录！",
		13: "登录信息失效",
		14: "登录用户Id为空",
		15: "redis数据库错误",
		16: "mongo数据库错误",
		20: "推送消息错误",

		100: "不在观战中",
		101: "不在座位上",
		110: "牛牛房间不存在",
		111: "",
		112: "",
		113: "",

		540: "加入场次失败",
		541: "退出场次失败",

		550: "匹配失败",
		551: "已经在场次里面",
		552: "你不在该场次里",
		553: "带币入场失败",
		554: "出房退币失败",
		555: "金币不足",
		556: "匹配到相同userId",
		557: "session为空",
		558: "正在匹配中",
		559: "已经匹配到了",
		560: "已经在房间里不应该加入场次",

		580: "房间不存在",
		581: "房间Id错误",
		582: "不在房间里",
		583: "已经准备了",

		600: "抢地主错误",
		601: "不是你抢地主",
		602: "抢地主结束",
		603: "已经叫过了",
		604: "没有玩家叫地主",
		605: "已经叫过1分了",
		606: "已经叫过2分了",
		607: "已经叫过3分了",

		620: "打牌错误",
		621: "不是你出牌",
		622: "牌型错误",
		623: "压牌错误",

		630: "取消托管失败",
		631: "已经取消托管",

		650: "换桌失败",

		660: "继续游戏失败",
	},


};