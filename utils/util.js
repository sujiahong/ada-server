/**
 * Created by reedhong on 2017/3/18.
 */


var fs = require('fs');


exports.get_req_ip = function(req){
    var ip =  req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    if(ip.indexOf("::ffff:") != -1){
        ip = ip.substr(7);
    }
    return ip;
};

exports.randomArray = function(arr){
    for(var i = 0; i < arr.length; ++i){
        var lastIndex = arr.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = arr[index];
        arr[index] = arr[lastIndex];
        arr[lastIndex] = t;
    }
}
// 1 ~ n
exports.randomObject = function(obj, len){
    for(var k = 1; i <= len; ++k){
        var index = Math.ceil(Math.random() * len);
        var t = obj[index];
        obj[index] = obj[k];
        obj[k] = t;
    }
}

exports.contains = function(arr, obj){
    var i = arr.length;
    while (i--) {
        if (arr[i] === obj) {
            return true;
        }
    }
    return false;
}

exports.writeFile = function(file, content){
    // appendFile，如果文件不存在，会自动创建新文件
    // 如果用writeFile，那么会删除旧文件，直接写新文件
    fs.appendFile(file, content, function(err){
        if(err){
            logger.error("write File fail " + err);
        }else {
            logger.error("write File ok ");
        }
    });
}

exports.readFile =  function(file, callback){
    fs.readFile(file, function(err, data){
        if(err)
            logger.info("读取文件fail " + err);
        else{
            callback(data);
        }
    });
}

exports.setPrintFileLine = function(isNull){
    if(isNull) {
        global.__file_line = "";
    }else {
        Object.defineProperty(global, '__stack', {
            get: function () {
                var orig = Error.prepareStackTrace;
                Error.prepareStackTrace = function (_, stack) {
                    return stack;
                };
                var err = new Error;
                Error.captureStackTrace(err, arguments.callee);
                var stack = err.stack;
                Error.prepareStackTrace = orig;
                return stack;
            }
        });

        Object.defineProperty(global, '__file_line', {
            get: function () {
                return '['+__stack[1].getFileName().split('/').slice(-1)[0]+":"+  __stack[1].getLineNumber()+"]";
            }
        });

        Object.defineProperty(global, '__line', {
            get: function () {
                return __stack[1].getLineNumber()+" ";
            }
        });

        Object.defineProperty(global, '__file', {
            get: function () {
                return __stack[1].getFileName().split('/').slice(-1)[0]+":";
            }
        });
    }
}
/////
exports.generateDigitStr = function(len){
	var str = '';
	for (var i = 0; i < len; ++i) {
		str += Math.floor(Math.random() * 10);
	}
	return str;
}

exports.objectSize = function(obj) {
    var count = 0;
    for (var i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
};

exports.objectToJson = function (obj) {
	var jsonObj = {};
	for (var name in obj) {
		var type = typeof obj[name];
		if (type !== 'function') {
			if (Object.prototype.toString.call(obj[name]) === "[object Object]"){
				jsonObj[name] = exports.objectToJson(obj[name]);
			}else{
				jsonObj[name] = obj[name];
			}
		}
	}
	return jsonObj;
}

// Compare the two arrays and return the difference.
exports.arrayDiff = function(array1, array2){
	var o = {};
	for (var i=0, len = array2.length; i < len; ++i){
		o[array2[i]] = true;
	}
	var result = [];
	for (i = 0, len = array1.length; i < len; ++i){
		var v = array1[i];
		if (o[v]) continue;
		result.push(v);
	}
	return result;
}

exports.hasChineseChar = function(str){
	if (/.*[\u4e00-\u9fa5]+.*$/.test(str)){
		return true;
	} else {
		return false;
	}
};

exports.isObject = function(arg){
	return typeof arg === "object" && arg !== null;
};

//指定长度
exports.randNumberString = function (len) {
	var str = '';
	for (var i = 0; i < len; i += 1) {
		str += Math.floor(Math.random() * 10);
	}
	return str;
}

exports.genRoomUniqueId = function(isExistRoom, next){
    var cur = 0;
    var _genUniqueId = function(){
        var id = exports.randNumberString(6);
        isExistRoom(id, function(err, is){
            if (err){
                return next(err);
            }
            if (is == 1){
                cur++;
                if (cur < 10){
                    _genUniqueId();
                }else{
                    return next("超出生成id次数");
                }
            }else{
                return next(null, id);
            }
        });
    }
    _genUniqueId();
};