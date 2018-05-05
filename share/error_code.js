/**
 * Created by reedhong on 17/3/10.
 */
module.exports = {
    SUCCESS:{
        code:0,
        msg:"success"
    },
    UNKOWN_ERR: {
        code:1,
        msg:"未知错误"
    },
    STOP_SERVER: {
        code: 2,
        msg: "已停服！"
    },
    PARM_ERR: {
        code: 3,
        msg: "参数错误"
    },
    HTTP_ERR: {
        code: 4,
        msg: "http错误！！"
    },
    ROOM_TYPE_NULL: {
        code:100,
        msg:"必须指定房间类型"
    },
    ROOM_TYPE_ERR:{
        code:101,
        msg:"不存在的房间类型"
    },
    ROOM_ARG_NULL:{
        code:103,
        msg:"参数有为空的情况"
    },
    ROOM_ARG_ERR:{
        code:104,
        msg:"参数错误"
    },
    ROOM_FANGKA_NOT_ENOUGH:{
        code:105,
        msg:"房卡不足"
    },
    ROOM_CREATE_NULL:{
        code:106,
        msg:"创建房卡失败"
    },
    ROOM_FULL:{
        code:107,
        msg:"房间已满"
    },
    ROOM_NOT_EXIST:{
        code:108,
        msg:"房间不存在"
    },
    ROOM_CREATE_FORM_DB_ERR:{
        code:109,
        msg:"房间已经不存在"
    },
    ROOM_DB_CREATE_NULL:{
        code:109,
        msg:"插入房间数据失败"
    },

    ROOM_HAS_IN:{
        code:110,
        msg:"已经在房间中"
    },

    NEED_ACCOUNT_INFO:{
        code:111,
        msg:"没有账户信息"
    },

    ERROR_SIGN:{
        code:112,
        msg:"签名出错"
    },

    ADD_GMES_FAILED:{
        code:113,
        msg:"增加房卡失败"
    },

    GET_GMES_FAILED:{
        code:114,
        msg:"获取房卡失败"
    },

    IAP_REFUSED:{
        code:115,
        msg:"购买房卡失败"
    },

    NO_GAME_SERVER: {
        code:116,
        msg:"没有找到游戏服务"
    },

    GET_USER_GEMS_ERROR: {
        code:117,
        msg:"获取用户房卡信息失败"
    },

    REQ_CREATE_ROOM_ERROR: {
        code:118,
        msg:"请求创建房间失败"
    },

    LOGIN_FAILED: {
        code:119,
        msg:"进入游戏服务失败"
    },


    INVALID_ARG: {
        code:120,
        msg:"参数错误"
    },

    SIGN_ERR: {
        code:121,
        msg:"签名错误"
    },

    NO_GAME_SERVER: {
        code:122,
        msg:"找不到游戏服务"
    },

    GET_ROOM_DATA_ERR: {
        code:123,
        msg:"该房间已解散"
    },

    GET_USER_DATA_ERR:{
        code:124,
        msg:"获取用户数据失败"
    },

    CONFIG_PATH_NOT_EXIST:{
        code:125,
        msg:"配置文件不存在"
    },

    CONFIG_LOAD_ERROR:{
        code:126,
        msg:"配置文件加载失败"
    }
};