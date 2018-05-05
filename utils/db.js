var mysql=require("mysql");  
var crypto = require('./crypto');

var pool = null;

function nop(a,b,c,d,e,f,g){

}
  
function query(sql,callback){
    try {
    pool.getConnection(function(err,conn){
        if(err){
            callback(err,null,null);
        }else{
            logger.info("query sql: "+sql);
            try {
                conn.query(sql, function (qerr, vals, fields) {
                    //释放连接
                    conn.release();
                    //事件驱动回调
                    callback(qerr, vals, fields);
                });
            }catch (e){
                logger.error('db query error111');
                logger.error(e);
            }
        }
    });
    }catch (e){
        logger.error('db query error222');
        logger.error(e);
    }
};

exports.init = function(config){
    pool = mysql.createPool({  
        host: config.HOST,
        user: config.USER,
        password: config.PSWD,
        database: config.DB,
        port: config.PORT
    });
};

exports.is_account_exist = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(true);
            }
            else{
                callback(false);
            }
        }
    });
};

exports.create_account = function(account,password,callback){
    callback = callback == null? nop:callback;
    if(account == null || password == null){
        callback(false);
        return;
    }

    var psw = crypto.md5(password);
    var sql = 'INSERT INTO t_accounts(account,password) VALUES("' + account + '","' + psw + '")';
    query(sql, function(err, rows, fields) {
        if (err) {
            if(err.code == 'ER_DUP_ENTRY'){
                callback(false);
                return;         
            }
            callback(false);
            throw err;
        }
        else{
            callback(true);            
        }
    });
};

exports.get_account_info = function(account,password,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }  

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }
        
        if(rows.length == 0){
            callback(null);
            return;
        }
        
        if(password != null){
            var psw = crypto.md5(password);
            if(rows[0].password == psw){
                callback(null);
                return;
            }    
        }

        callback(rows[0]);
    }); 
};

exports.is_user_exist = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'SELECT userid FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });  
}


exports.get_user_data = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT userid,account,name,lv,exp,coins,gems,roomid, sex FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

exports.get_user_data_by_userid = function(userid,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT userid,account,name,lv,exp,coins,gems,roomid FROM t_users WHERE userid = ' + userid;
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

/**增加玩家房卡 */
exports.add_user_gems = function(userid,gems,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(false);
        return;
    }
    
    var sql = 'UPDATE t_users SET gems = gems +' + gems + ' WHERE userid = ' + userid;
    query(sql,function(err,rows,fields){
        if(err){
            logger.error(err);
            callback(false);
            return;
        }
        else{
            callback(rows.affectedRows > 0);
            return; 
        } 
    });
};

exports.add_card_consume =  function(userid, count, remain_count, callback){
    callback = callback == null? nop:callback;
    logger.info('add_card_consume userid=%d, count=%d, remain_count=%d',userid, count, remain_count);
    if( userid == null || count == null || remain_count == null || isNaN(count) || isNaN(remain_count) ){
        callback(false);
    }
    var create_time = Math.ceil(Date.now() / 1000);
    var sql = "INSERT INTO t_user_consume_cards(game_account_id, count, remain_count, create_time) \
                VALUES({0},{1},{2}, {3})";
    sql = sql.format(userid, count, remain_count, create_time);
    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });
};


exports.add_user_gems_by_account = function(account,gems,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'UPDATE t_users SET gems = gems +' + gems + ' WHERE account ="' + account +'"';
    query(sql,function(err,rows,fields){
        if(err){
            logger.error(err);
            callback(false);
            return;
        }
        else{
            callback(rows.affectedRows > 0);
            return;
        }
    });
};


exports.get_gems = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT gems FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};



exports.get_user_history = function(userId,type, callback){
    callback = callback == null? nop:callback;
    if(userId == null|| type == null){
        callback(null);
        return;
    }
    var sql = 'SELECT t_rooms_archive.base_info as conf, t_rooms_archive.users_info as seats, ' +
        't_rooms_archive.id as id,t_rooms_archive.create_time as time ,t_rooms_archive.uuid as uuid  FROM ' +
        't_rooms_archive join t_history on t_rooms_archive.uuid=t_history.room_uuid WHERE ' +
        't_history.user_id={0} and t_history.room_type="{1}" ORDER by t_history.create_time DESC';
    sql = sql.format(userId, type);
    logger.info('get_user_history sql '+sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        callback(rows);
    });
};

exports.get_games_of_room = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT game_index,create_time,result FROM t_games_archive WHERE room_uuid = "' + room_uuid + '"';
    //logger.info(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows);
    });
};

exports.get_detail_of_game = function(room_uuid,index,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null || index == null){
        callback(null);
        return;
    }
    var sql = 'SELECT base_info,action_records FROM t_games_archive WHERE room_uuid = "' + room_uuid + '" AND game_index = ' + index ;
    //logger.info(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        callback(rows[0]);
    });
}

exports.create_user = function(account,name, coins,gems,sex,headimg,callback){
    callback = callback == null? nop:callback;
    if(account == null || name == null || coins==null || gems==null){
        callback(false);
        return;
    }
    if(headimg){
        headimg = '"' + headimg + '"';
    }
    else{
        headimg = 'null';
    }
    name = crypto.toBase64(name);
    var createTime = Math.ceil(Date.now() / 1000);
    var sql = 'INSERT INTO t_users(account,name,coins,gems,sex,headimg,create_time, last_login_time) ' +
        'VALUES("{0}","{1}",{2},{3},{4},{5},{6},{7})';
    sql = sql.format(account,name,coins,gems,sex,headimg,createTime,createTime);
    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        callback(true);
    });
};

exports.update_login_time = function(userid, callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }

    var lastLoginTime = Math.ceil(Date.now() / 1000);
    var sql = 'UPDATE t_users SET  last_login_time={0} WHERE userid={1}';
    sql = sql.format(lastLoginTime, userid);
    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        callback(rows);
    });

};

exports.update_user_info = function(userid,name,headimg,sex,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }
 
    if(headimg){
        headimg = '"' + headimg + '"';
    }
    else{
        headimg = 'null';
    }
    name = crypto.toBase64(name);
    var lastLoginTime = Math.ceil(Date.now() / 1000);
    var sql = 'UPDATE t_users SET name="{0}",headimg={1},sex={2}, last_login_time={3} WHERE account="{4}"';
    sql = sql.format(name,headimg,sex, lastLoginTime, userid);
    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        callback(rows);
    });
};

exports.get_user_base_info = function(userid,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }
    var sql = 'SELECT name,sex,headimg FROM t_users WHERE userid={0}';
    sql = sql.format(userid);
    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

exports.is_room_exist = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.length > 0);
        }
    });
};

exports.cost_gems = function(userid,cost,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_users SET gems = gems -' + cost + ' WHERE userid = ' + userid;
    query(sql, function(err, rows, fields) {
        logger.info(err);
        logger.info(rows);
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows > 0);
        }
    });
};

exports.set_room_id_of_user = function(userId,roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId != null){
        roomId = '"' + roomId + '"';
    }
    var sql = 'UPDATE t_users SET roomid = '+ roomId + ' WHERE userid = "' + userId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            logger.error(err);
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows > 0);
        }
    });
};

exports.get_room_id_of_user = function(userId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT roomid FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(rows[0].roomid);
            }
            else{
                callback(null);
            }
        }
    });
};


//ip port: 是game server的
exports.create_room = function(roomId,conf,ip,port,create_time,callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time, is_closed) \
                VALUES('{0}','{1}','{2}','{3}',{4},{5}, 0)";
    var uuid = Date.now() + roomId;
    var baseInfo = JSON.stringify(conf);
    sql = sql.format(uuid,roomId,baseInfo,ip,port,create_time);
    query(sql,function(err,row,fields){
        if(err){
            callback(null);
            throw err;
        }
        else{
            callback(uuid);
        }
    });
};

exports.get_room_uuid = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT uuid FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            throw err;
        }
        else{
            callback(rows[0].uuid);
        }
    });
};

exports.update_seat_info = function(roomId,seatIndex,userId,icon,name,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET user_id{0} = {1},user_icon{0} = "{2}",user_name{0} = "{3}" WHERE id = "{4}"';
    name = crypto.toBase64(name);
    sql = sql.format(seatIndex,userId,icon,name,roomId);
    //logger.info(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
}

exports.update_num_of_turns = function(roomId,numOfTurns,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET num_of_turns = {0} WHERE id = "{1}"'
    sql = sql.format(numOfTurns,roomId);
    logger.info('update_num_of_turns sql: '+ sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
};

exports.update_room_user_info = function(roomId, users_info, callback){
    callback = callback == null? nop:callback;
    var sql = null;

    sql = "UPDATE t_rooms SET users_info = '{0}'  WHERE id = '{1}'"
    sql = sql.format(users_info, roomId);

    logger.info('update_room_user_info sql:'+sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
};


exports.update_room_info = function(roomId, nextButton, numOfGames, users_info, callback){
    callback = callback == null? nop:callback;
    nextButton = (nextButton == null || isNaN(nextButton)? -1:nextButton);
    var sql = null;
    logger.info("nextButton " + nextButton);
    logger.info(typeof nextButton);
    if(nextButton != null) {
        sql = "UPDATE t_rooms SET next_button = {0}, num_of_turns = {1}, users_info = '{2}'  WHERE id = '{3}'"
        sql = sql.format(nextButton, numOfGames, users_info, roomId);
    }else{
        sql = "UPDATE t_rooms SET  num_of_turns = {0}, users_info = '{1}'  WHERE id = '{2}'"
        sql = sql.format(numOfGames, users_info, roomId);
    }
    logger.info('update_room_info sql:'+sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
};

exports.update_next_button = function(roomId,nextButton,callback){
    callback = callback == null? nop:callback;
    nextButton = (nextButton == null? -1:nextButton);
    var sql = 'UPDATE t_rooms SET next_button = {0} WHERE id = "{1}"'
    sql = sql.format(nextButton,roomId);
    logger.info('update_next_button sql:'+sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
};

exports.get_room_addr = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false,null,null);
        return;
    }

    var sql = 'SELECT ip,port FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false,null,null);
            throw err;
        }
        if(rows.length > 0){
            callback(true,rows[0].ip,rows[0].port);
        }
        else{
            callback(false,null,null);
        }
    });
};

exports.get_room_data = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';
    logger.info('sql '+sql);
    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            throw err;
        }
        if(rows.length > 0){
            var is_closed = rows[0].is_closed;
            if( is_closed == 1){
                callback(null);
            }else{
                callback(rows[0]);
            }
        }
        else{
            callback(null);
        }
    });
};




exports.get_archive_room = function(uuid,callback){
    callback = callback == null? nop:callback;
    if(uuid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_rooms_archive WHERE uuid = "' + uuid + '"';
    logger.info('get_archive_room sql = ' +sql);
    logger.info('get_archive_room sql22222 = ' +sql);
    query(sql, function(err, rows, fields) {
        logger.info('fuck');
        if(err){
            callback(null);
            throw err;
        }
        if(rows.length > 0){
            callback(rows[0]);
        }else{
            callback(null);
        }
    });
};


exports.archive_room = function(room_id,callback){
    callback = callback == null? nop:callback;
    if(room_id == null){
        callback(false);
    }
    var sql = "INSERT INTO t_rooms_archive(SELECT * FROM t_rooms WHERE id = '{0}')";
    sql = sql.format(room_id);
    logger.info('archive_room=' + sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            exports.delete_room(room_id,function(ret){
                callback(ret);
            });
        }
    });
};


exports.delete_room = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false);
    }
    var sql = "DELETE FROM t_rooms WHERE id = '{0}'";
    sql = sql.format(roomId);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });
};


exports.insert_history = function(userid, roomUuid, roomId, roomType, callback){
    callback = callback == null? nop:callback;
    if( roomUuid == null || userid == null || roomId == null ){
        callback(false);
    }
    var create_time = Math.ceil(Date.now() / 1000);
    var sql = "INSERT INTO t_history(user_id, room_uuid, room_id, room_type, create_time) \
                VALUES({0},'{1}','{2}', '{3}', {4})";
    sql = sql.format(userid, roomUuid, roomId, roomType, create_time);
    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });
};

exports.create_game = function(room_uuid, room_id, room_type, index, base_info, callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_games(room_uuid,game_index,base_info,room_id,room_type,create_time) VALUES('{0}',{1},'{2}','{3}','{4}',unix_timestamp(now()))";
    sql = sql.format(room_uuid, index, base_info, room_id, room_type);
    //logger.info(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            throw err;
        }
        else{
            callback(rows.insertId);
        }
    });
};

exports.delete_games = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }    
    var sql = "DELETE FROM t_games WHERE room_uuid = '{0}'";
    sql = sql.format(room_uuid);
    //logger.info(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });
};

exports.archive_games = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }
    var sql = "INSERT INTO t_games_archive(SELECT * FROM t_games WHERE room_uuid = '{0}')";
    sql = sql.format(room_uuid);
    logger.info('archive_games=' + sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            exports.delete_games(room_uuid,function(ret){
                callback(ret);
            });
        }
    });
};

exports.update_game_action_records = function(room_uuid,index,actions,callback){
    callback = callback == null? nop:callback;
    var sql = "UPDATE t_games SET action_records = '"+ actions +"' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index ;
    logger.info('update_game_action_records' + sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
};

exports.update_game_result = function(room_uuid,index,result,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null || result){
        callback(false);
    }
    
    result = JSON.stringify(result);
    var sql = "UPDATE t_games SET result = '"+ result +"' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index ;
    logger.info('update_game_result' + sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(rows.affectedRows);
        }
    });
};

exports.get_message = function(type,version,callback){
    callback = callback == null? nop:callback;
    
    var sql = 'SELECT * FROM t_message WHERE type = "'+ type + '"';
    
    if(version == "null"){
        version = null;
    }
    
    if(version){
        version = '"' + version + '"';
        sql += ' AND version != ' + version;   
    }
     
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(rows[0]);    
            }
            else{
                callback(null);
            }
        }
    });
};

exports.recyle_room = function(time, callback){
    callback = callback == null? nop:callback;
    if(time == null){
        callback(false);
    }
    var sql = "INSERT INTO t_rooms_archive(SELECT * FROM t_rooms WHERE create_time < {0})";
    sql = sql.format(time);
    logger.info('t_rooms_archive=' + sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            var deleteSql = "DELETE FROM t_rooms WHERE create_time < {0}";
            deleteSql = deleteSql.format(time);
            query(deleteSql,function(err,rows,fields){
                if(err){
                    callback(false);
                    throw err;
                }else{
                    callback(true);
                }

            });
        }
    });
};



exports.update_history_room_type = function(callback){
    callback = callback == null? nop:callback;
    var sql = "SELECT user_id, room_uuid FROM t_history";
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            if(rows.length > 0){
                for(var i = 0; i < rows.length; i++){
                    var user_id = rows[i].user_id;
                    var room_uuid = rows[i].room_uuid;
                    logger.info('user_id %d, room_uuid %s', user_id, room_uuid);
                    var sql_room_archive = 'SELECT * FROM t_rooms_archive WHERE uuid = "' + room_uuid + '"';
                    query(sql_room_archive, function(err, room_rows, fields) {
                        if(err){
                            callback(false);
                            throw err;
                        }
                        else{
                            if(room_rows.length > 0){
                                var conf = JSON.parse(room_rows[0].base_info);
                                var room_type = conf.type;
                                var update_sql = "UPDATE t_history SET room_type='{0}' WHERE user_id={1} and room_uuid='{2}'";
                                update_sql = update_sql.format(room_type, user_id, room_uuid);
                                logger.info('update_sql = '+sql);
                                query(update_sql,function(err,rows,fields){
                                    if(err){
                                        callback(false);
                                        throw err;
                                    }
                                    else{
                                        callback(true);
                                    }
                                });
                            }else{
                                callback(false);
                            }
                        }
                    });
                }
            }
            else{
                callback(false);
            }
        }
    });
};

var is_today = function(time)
{
    var today = new Date();
    var today_begin = new Date(today.getFullYear(),today.getMonth(),today.getDate(),0,0,0);
    var today_end = new Date(today.getFullYear(),today.getMonth(),today.getDate(),23,59,59);
    var today_begin_time = Math.ceil(today_begin.getTime() / 1000);
    var today_end_time = Math.ceil(today_end.getTime() / 1000);

    return today_begin_time <= time && time <= today_end_time;
};


exports.get_prize_count = function(userid, callback)
{
    callback = callback == null? nop:callback;
    var sql = "SELECT * FROM t_prize_user_info WHERE userid = "+userid;
    query(sql, function(err, rows, fields) {
        logger.info('fuck');
        if(err){
            callback(-1);
            throw err;
        }
        if(rows.length > 0){
            logger.info('fuck get_prize_count11111111111111');
            var last_free_prize_time = rows[0].last_free_prize_time;

            // check is today
            var count = 0;
            if(is_today(last_free_prize_time) == false){
                logger.info('fuck get_prize_count12222222');
                count += 1;
            }

            var share_time = rows[0].share_time;
            var last_share_prize_time = rows[0].last_share_prize_time;
            if( is_today(share_time) && is_today(last_share_prize_time) == false){
                count += 1;
            }
            callback(count);
        }else{
            // insert
            var insert_sql = 'INSERT INTO t_prize_user_info(userid) VALUES("' + userid  + '")';
            query(insert_sql, function(err, rows, fields) {
                if (err) {
                    callback(-1);
                    throw err;
                }
                else{
                    callback(1);
                }
            });
        }
    });

};

exports.has_prize_count = function(userid, callback){
    var select_sql = "SELECT * FROM t_prize_user_info WHERE userid = "+userid;
    query(select_sql, function(err, rows, fields) {
        logger.info('fuck');
        if(err){
            logger.info('fuck dddd');
            callback(false);
            //throw err;
        }
        if(rows.length > 0){
            logger.info('fuck ddddeeee');
            var last_free_prize_time = rows[0].last_free_prize_time;
            // check is today
            if(is_today(last_free_prize_time) == false){
                logger.info('fuck fffffff');
                var now = Math.ceil(Date.now() / 1000);
                var info_update_sql = 'UPDATE t_prize_user_info SET last_free_prize_time={0} WHERE userid={1}';
                info_update_sql = info_update_sql.format(now, userid);
                query(info_update_sql, function(err, rows, fields) {
                    if (err) {
                        throw err;
                        callback(false);
                    }else {
                        callback(true);
                    }
                });
            }else {
                var share_time = rows[0].share_time;
                var last_share_prize_time = rows[0].last_share_prize_time;
                if (is_today(share_time) && is_today(last_share_prize_time) == false) {
                    var now = Math.ceil(Date.now() / 1000);
                    var info_update_sql = 'UPDATE t_prize_user_info SET last_share_prize_time={0} WHERE userid={1}';
                    info_update_sql = info_update_sql.format(now, userid);
                    query(info_update_sql, function(err, rows, fields) {
                        if (err) {
                            throw err;
                            callback(false);
                        }else {
                            callback(true);
                        }
                    });

                }else{
                    callback(false);
                }
            }
        }else{
            callback(false);
        }
    });
}

exports.share_prize = function(userid, callback)
{
    callback = callback == null? nop:callback;
    var lastLoginTime = Math.ceil(Date.now() / 1000);
    var sql = 'UPDATE t_prize_user_info SET share_time={0} WHERE userid={1}';
    sql = sql.format(lastLoginTime, userid);
    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        callback(rows);
    });
};


exports.get_prize_data = function(callback)
{
    callback = callback == null? nop:callback;
    var sql = "SELECT * FROM t_prize_count ";
    logger.info('fuck !!!!!!!!!!!!!!!!!!!');
    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            throw err;
        }
        if(rows.length > 0){
            callback(rows[0]);
        }else{
            callback(null);
        }
    });
};




exports.prize_settle = function(userid, username, prize_type, prize_name, callback){
    callback = callback == null? nop:callback;
    // 1.存储抽奖记录
    var insert_sql = "INSERT INTO t_prize_record(userid,name,  prize_type, prize_name, create_time) VALUES({0},'{1}',{2},'{3}',{4})";
    var createTime = Math.ceil(Date.now() / 1000);
    insert_sql = insert_sql.format(userid, username, prize_type, prize_name, createTime);
    query(insert_sql, function(err, rows, fields) {
        if (err) {
            logger.info(err);
            callback(false);
        }
        else {
            // 2. 减库存
            var item_name = "item" + prize_type;
            var update_sql = 'UPDATE t_prize_count SET ' + item_name + '=' + item_name + '-1';
            query(update_sql, function (err, rows, fields) {
                if (err) {
                    logger.info(err);
                    callback(false);
                }else {
                    callback(true);
                }
            });
        }
    });


};

exports.get_prize_record = function(callback)
{
    
};


exports.query = query;