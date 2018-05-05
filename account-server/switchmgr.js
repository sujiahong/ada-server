/**
 * Created by reedhong on 2017/3/28.
 */
'use strict';

var fs = require("fs");
var util = require('../utils/util');

// 一些开关的管理
class SwitchMgr {
    constructor() {
        this.config = {};
    };


    getConfig(game, platform, version){
        var gameConfig = this.config[game];
        if(gameConfig == null){
            return {};
        }
        //logger.info(gameConfig);

        var option = version+"_" + platform;
        logger.info('option='+option);
        var optionGame =  gameConfig[option];
        if(optionGame ==  null){
            optionGame =  gameConfig['default'];
        }
        try {
            var force_update = false;
            logger.info('version= %s, platform = %s',version ,platform);
            try{
                force_update = this.config['force_update'][version][platform];
            }catch (e){
                force_update = this.config['force_update']['default'][platform];
                logger.error('get force update');
                logger.error(e);
            }
            optionGame['force_update'] = force_update;
        }catch(e){
            logger.error(e);
        }
        optionGame['prize'] = this.config['prize'];
        return optionGame;

    };

    getBasicConfig(){
        return this.config['basic'];
    };

    getPrizeConfig(){
        return this.config['prize'];
    };

    isStopServer(){
        var stop_server_config =  this.config['basic']['stop_server'];
        var now_time_stamp = Date.parse(new Date());
        now_time_stamp = now_time_stamp / 1000;

        var start_time_stamp = Date.parse(new Date(stop_server_config['start_time']));
        start_time_stamp = start_time_stamp / 1000;

        var end_time_stamp = Date.parse(new Date(stop_server_config['end_time']));
        end_time_stamp = end_time_stamp / 1000;
        logger.info('now=%d, start %d, end %d', now_time_stamp, start_time_stamp, end_time_stamp);
        if( start_time_stamp <= now_time_stamp && now_time_stamp < end_time_stamp){
            return true;
        }

        return false;
    };

    isInWhitelist(user_id){
        var whitelist = this.config["prize_whitelist"];
        return util.contains(whitelist, user_id)
    };

    loadConfig(file){
        this.file = file;
        this.config = JSON.parse(fs.readFileSync(file));
        //logger.info(this.config)

    };

    reloadConfig(){
        this.loadConfig(this.file);
    }


}

module.exports = global.SwitchMgr = new SwitchMgr();