
var ErrorCode = require("../share/error_code");
var fs = require("fs");


// 游戏的配置开关,可以方便自动刷新
class GameConfigMgr {
    constructor() {
        this.config = {};
        this.path = "";
        this.types = ['common', 'erwuba','hongzhong','kouzhang','tuidaohu', "shishoulaizi", "shishouaihuang"];
    };


    get(type){
        if( type == null){
            return null;
        }

        try {
            var gameConfig = this.config[type];
            return gameConfig;
        }catch(e){
            logger.error(e);
            return null;
        }
    };

    loadAllConfig(path){
        this.path = path;
        logger.info('path = '+path);
        for(var i = 0; i < this.types.length; ++i){
            this.loadConfig(this.types[i]);
        }
    }

    loadConfig(type){
        var isValid = false;
        for(var i = 0; i < this.types.length; ++i){
            if( this.types[i] == type){
                isValid = true;
            }
        }
        if( isValid == false){
            return ErrorCode.CONFIG_PATH_NOT_EXIST;
        }
        var path = this.path + type+'.json';
        //logger.info('path = '+path);
        this.config[type] = JSON.parse(fs.readFileSync(path));
        //logger.info('after load config');
        //logger.info(this.config[type]);
        return ErrorCode.SUCCESS;
    };
}

module.exports = global.GameConfigMgr = new GameConfigMgr();
