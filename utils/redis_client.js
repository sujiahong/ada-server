'use strict';

var EventEmitter = require('events');
var redis = require('redis');

function default_func() {
}

class RedisClient extends EventEmitter {
	constructor(options) {
		super();

		if (!options || !(options instanceof Object)) {
			options = {
				host: "127.0.0.1",
				port: 6379
			};
		}
		this.RedisHost = options.host || "127.0.0.1";
		this.RedisPort = options.port || 6379;
		this.RedisPassword = options.password || "";
		this.tableindex = options.tableindex || 1;
		this.RedisPassword = options.password || "";
		this.RedisNoReadyCheck = options.no_ready_check || false;

		this.available = false;
		this.last_available = false;
		this.get_available = false;
		this.set_available = false;
		var self = this;
		var retry_strategy = function (options) {
			if (options.error) {
				self.available = false;
				if (this["name"] == "clientGet") {
					self.get_available = false;
				}
				if (this["name"] == "clientSet") {
					self.set_available = false;
				}
				console.error((new Date).toLocaleString() + " " + this["name"] + " connecting to redis error : ", options.error.code, options.attempt);
			}
			if (self[this["name"]]["retry_totaltime"] === self[this["name"]]["connect_timeout"]) {
				self[this["name"]]["retry_totaltime"] = 0;
			}
			//delete options["error"];
			// logger.info(this["name"], self[this["name"]]["retry_totaltime"],
			// 	self[this["name"]]["connect_timeout"], Math.min(options.attempt * 1000 + 1000, 30000), "options : ", options);
			return Math.min(options.attempt * 1000 + 1000, 30000);
		};
		var setOption = {
			name: "clientSet",
			no_ready_check: this.RedisNoReadyCheck,
			retry_strategy: retry_strategy
		};
		var getOption = {
			name: "clientGet",
			detect_buffers: true,
			no_ready_check: this.RedisNoReadyCheck,
			retry_strategy: retry_strategy
		};
		if (this.RedisPassword) {
			setOption["password"] = this.RedisPassword;
			getOption["password"] = this.RedisPassword;
		}
		this.clientSet = redis.createClient(this.RedisPort, this.RedisHost, setOption);
		this.clientGet = redis.createClient(this.RedisPort, this.RedisHost, getOption);
		this.client = this.clientGet;

		self.clientGet.on("ready", function () {
			self.get_available = true;
			self.clientGet["name"] = "clientGet";
			self.last_available = self.available;
			self.available = (self.set_available && self.get_available);
			if (global.SERVER && !self.last_available) {
				global.SERVER.emit("available");
			}
			if (!self.last_available && self.available == true) logger.error((new Date).toLocaleString() + " success init redis at " + self.RedisHost + ":" + self.RedisPort);
			//logger.info("clientGet_ready", self.available, self.set_available, self.get_available);
		});
		self.clientSet.on("ready", function () {
			self.set_available = true;
			self.clientGet["name"] = "clientSet";
			self.last_available = self.available;
			self.available = (self.set_available && self.get_available);
			if (global.SERVER && !self.last_available) {
				global.SERVER.emit("available");
			}
			if (!self.last_available && self.available == true) logger.error((new Date).toLocaleString() + " success init redis at " + self.RedisHost + ":" + self.RedisPort);
			//logger.info("clientSet_ready", self.available, self.set_available, self.get_available);
		});
		self.clientGet.on("error", function (err) {
			logger.error((new Date).toLocaleString() + " RedisClient.clientGet catch Error : " + err);
			self.available = false;
			self.get_available = false;
		});
		self.clientSet.on("error", function (err) {
			logger.error((new Date).toLocaleString() + " RedisClient.clientSet catch Error : " + err);
			self.available = false;
			self.set_available = false;
		});

		self.on("error", function (err) {
			logger.error((new Date).toLocaleString() + " RedisClient Error : " + err);
		});

		self.on("uncaughtException", function (err) {
			logger.error((new Date).toLocaleString() + " RedisClient uncaughtException : " + err);
		});
	}

	//judge the key exist in redis
	keyExist(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.exists(key, function (err, isExist) {
				if (err) {
					reject(err);
				} else {
					resolve(isExist == 1);
				}
			});
		});
	}

	//set second expirationTime to a key
	keyExpire(key, expirationTime) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.expire([key, expirationTime], function (err, reply) {
				// logger.info("keyExpire, err:" + err + "," + JSON.stringify(reply));
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//set millisecond time to a key
	keyPexpireat(key, millisecond) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.pexpireat([key, millisecond], function (err, reply) {
				// logger.info("keyExpireat, err:" + err + "," + JSON.stringify(reply));
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//incr a key
	keyIncrease(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.incr(key, function (err, reply) {
				// logger.info("keyIncrease, err:" + err + "," + JSON.stringify(reply));
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//get keys about keyPattern
	getKeys(keyPattern) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.keys(keyPattern, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//delete a key
	keyDelete(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.del(key, function (err, reply) {
				if (err) {
					//logger.info("err:" + err + "," + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//delete all keyword
	keysDelete(keyPattern) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.keys(keyPattern, function (err, reply) {
				if (err || !(reply instanceof Array)) {
					reject(err);
				} else {
					var plist = [];
					reply.forEach(function (k) {
						plist.push(self.keyDelete(k));
					});
					return Promise.all(plist).then(function (list) {
						if (!(list instanceof Array)) {
							resolve(0);
						} else {
							var count = 0;
							list.forEach(function (i) {
								i = parseInt(i);
								if (!isNaN(i) && i > 0) {
									count += i;
								}
							});
							resolve(count);
						}
					}).catch(reject);
				}
			});
		});
	}

	//set the string using the key
	stringSet(key, value) {
		var self = this;
		return new Promise(function (resolve, reject) {
			if ((typeof value) != 'string') {
				value = JSON.stringify(value);
			}
			self.clientSet.set(key, value, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//get the string using the key
	stringGet(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.get(key, function (err, reply) {
				// logger.info("stringGet", key, err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap set
	hset(key, hkey, hvalue) {
		var self = this;
		return new Promise(function (resolve, reject) {
			if ((typeof hkey) == 'number') {
				hkey = "" + hkey;
			}
			if ((typeof hvalue) != 'string') {
				hvalue = JSON.stringify(hvalue);
			}
			self.clientSet.hset(key, hkey, hvalue, function (err, reply) {
				// logger.info("hset", key, hkey, hvalue, err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap multi set
	hmset(key, param) {
		var self = this;
		if (!(param instanceof Array) && param instanceof Object) {
			var list = [];
			for (var k in param) {
				if (k) {
					if (param[k] instanceof Object || param[k] instanceof Array) {
						list.push(k, JSON.stringify(param[k]));
					} else {
						list.push(k, "" + param[k]);
					}
				}
			}
			param = list;
		}
		return new Promise(function (resolve, reject) {
			if (param instanceof Array) {
				self.clientSet.hmset(key, param, function (err, reply) {
					if (err) {
						reject(err);
					} else {
						resolve([reply]);
					}
				});
			} else {
				reject(new Error("hmset error ...... "));
			}
		});
	}

	//hashmap get a key
	hget(key, hkey) {
		var self = this;
		return new Promise(function (resolve, reject) {
			if ((typeof hkey) == 'number') {
				hkey = "" + hkey;
			}
			self.clientSet.hget(key, hkey, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap delete a key
	hdel(key, hkey) {
		// logger.info("hdel", key, hkey);
		var self = this;
		return new Promise(function (resolve, reject) {
			if ((typeof hkey) == 'number') {
				hkey = "" + hkey;
			}
			if (!hkey) {
				resolve();
				return;
			}
			self.clientGet.hdel(key, hkey, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap delete more key
	hmdel(key, hkeys) {
		// logger.info("hmdel", key, hkeys);
		var self = this;
		if (!(hkeys instanceof Array)) {
			return self.hdel(key, hkeys);
		}
		if (hkeys.length == 0) {
			return Promise.resolve();
		}
		return new Promise(function (resolve, reject) {
			self.clientGet.hdel(key, hkeys, function (err, reply) {
				// logger.info("hmdel, Error : " + err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap get more key
	hmget(hkey, vkeys) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.hmget(hkey, vkeys, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap get all key
	hgetall(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.hgetall(key, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//hashmap get length
	hlen(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.hlen(key, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	hscan(key, cursor, count, hkeyPattern) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var param = [key];
			param.push(cursor || 0);
			if (hkeyPattern) {
				param.push("MATCH");
				param.push(hkeyPattern);
			}
			if (count) {
				param.push("COUNT");
				param.push(count || 0);
			}
			// logger.info("hscan", param);
			self.client.hscan(param, function (err, reply) {
					// logger.info("hscan, Error : " + err, reply);
					if (err) {
						logger.error("hscan, Error : " + err);
						reject(err);
					} else {
						resolve(reply);
					}
				}
			);
		});
	}

	//hashmap exists ?
	hExists(key, hkey, callback) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.hscan([key, hkey], function (err, reply) {
					// logger.info("hExists, Error : " + err, reply);
					if (err) {
						logger.error("hscan, Error : " + err);
						reject(err);
					} else {
						resolve(reply);
					}
				}
			);
		});
	}

	//hashmap account
	hValues(key, callback) {
		var param = ['hvals ', key, default_func];
		this.client.multi([param]).exec(
			function (err, data) {
				if (err) logger.error("err:" + err + ":data:" + JSON.stringify(data));
				if (callback && callback instanceof Function) callback(data);
			}
		);
	}

	//set add
	sadd(key, param) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.hmset(key, param, function (err, reply) {
				if (err) {
					console.error("sadd, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//sorted set add
	zadd(key, param) {
		if (!(param instanceof Object) || Object.keys(param).length == 0) {
			return Promise.resolve();
		}
		var self = this;
		var dataParams = [];
		dataParams.push(key);
		for (var id in param) {
			if (id == "" || param[id] == "") continue;
			dataParams.push(param[id]);
			dataParams.push(id);
		}
		if (dataParams.length <= 1) {
			return Promise.resolve();
		}
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zadd(dataParams).exec(function (err, reply) {
				if (err) {
					console.error("zadd " + JSON.stringify(dataParams) + ", err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//sorted set del
	zrem(key, skey) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zrem(key, skey).exec(function (err, reply) {
				if (err) {
					console.error("zrem, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//sorted set get
	zscore(key, ukey) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.multi().zscore(key, ukey).exec(function (err, reply) {
				if (err) {
					console.error("zscore, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply[0] === null ? 0 : parseInt("" + reply[0]));
				}
			});
		});
	}

	//sorted set get range
	zrevrange(key, begin, end) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.multi().zrevrange(key, begin, end, "withscores").exec(function (err, reply) {
				if (err) {
					console.error("zrevrange, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					if (reply && reply instanceof Array && reply[0] instanceof Array && reply[0].length > 0) {
						var replyData = reply[0];
						var rankData = [];
						for (var i = 0; (i + 1) < replyData.length; i += 2) {
							rankData.push({"index": replyData[i], "value": replyData[i + 1]});
						}
						resolve(rankData);
					} else {
						resolve([]);
					}
				}
			});
		});
	}

	//sorted set copy (if data too much ,need to split it)
	zcopy(key, newKey, begin, end) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.keyDelete(newKey, function () {
				self.client.multi().zrevrange(key, begin, end, "withscores").exec(function (err, reply) {
					if (err) {
						console.error("zcopy, err" + err + ":" + JSON.stringify(reply));
						reject(err);
						return;
					}
					if (reply && reply instanceof Array && reply.length > 0) {
						var oldData = reply[0].split(",");
						var rankData = [];
						rankData.push(newKey);
						for (var i = 0; (i + 1) < oldData.length; i += 2) {
							rankData.push(oldData[i + 1]);
							rankData.push(oldData[i]);
						}
						//logger.info("zcopy,reply:",newKey,reply,oldData,rankData);
						self.clientSet.multi().zadd(rankData).exec(function (newErr, newReply) {
							if (err) logger.error("err:" + newErr + ",reply:" + JSON.stringify(newReply));
							resolve();
						});
					} else {
						resolve();
					}
				});
			});
		});
	}

	//sorted set zcard
	zcard(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zcard(key).exec(function (err, reply) {
				if (err) {
					console.error("zcard, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply[0]);
				}
			});
		});
	}

	//sorted set zrank
	zrank(key, mem) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zrank(key, mem).exec(function (err, reply) {
				if (err) {
					console.error("zrank, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply[0]);
				}
			});
		});
	}

	//sorted set zrevrank
	zrevrank(key, mem) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zrevrank(key, mem).exec(function (err, reply) {
				if (err) {
					console.error("zrevrank, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply[0]);
				}
			});
		});
	}

	//remove sortedset with score
	zremrangebyscore(key, min, max) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zremrangebyscore(key, min, max).exec(function (err, reply) {
				if (err) {
					console.error("zremrangebyscore, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply[0]);
				}
			});
		});
	}

	//remove sortedset with rank
	zremrangebyrank(key, min, max) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.clientSet.multi().zremrangebyrank(key, min, max).exec(function (err, reply) {
				if (err) {
					console.error("zremrangebyrank, err" + err + ":" + JSON.stringify(reply));
					reject(err);
				} else {
					resolve(reply[0]);
				}
			});
		});
	}

	//list lpush
	lpush(key, memList) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var pushParams = [];
			pushParams.push(key);
			if (!(memList instanceof Array)) {
				if ((typeof memList) != 'string') {
					pushParams.push(JSON.stringify(memList));
				} else {
					pushParams.push(memList);
				}
			} else {
				if (memList.length === 0) {
					resolve();
				}
				for (var i = 0; i < memList.length; i++) {
					if (memList[i] !== undefined || memList[i] !== null || !isNaN(memList[i])) {
						if ((typeof memList[i]) == 'object') {
							pushParams.push(JSON.stringify(memList[i]));
						} else {
							pushParams.push(memList[i]);
						}
					} else {
						pushParams.push("");
					}
				}
			}
			// logger.info("lpush, pushParams : ", pushParams);
			self.client.lpush(pushParams, function (err, reply) {
				//logger.info(err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//list rpush
	rpush(key, memList) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var pushParams = [];
			pushParams.push(key);
			if (!(memList instanceof Array)) {
				if ((typeof memList) != 'string') {
					pushParams.push(JSON.stringify(memList));
				} else {
					pushParams.push(memList);
				}
			} else {
				if (memList.length === 0) {
					resolve();
				}
				for (var i = 0; i < memList.length; i++) {
					if (memList[i] !== undefined || memList[i] !== null || !isNaN(memList[i])) {
						if ((typeof memList[i]) == 'object') {
							pushParams.push(JSON.stringify(memList[i]));
						} else {
							pushParams.push(memList[i]);
						}
					} else {
						pushParams.push("");
					}
				}
			}
			// logger.info("rpush, pushParams : ", pushParams);
			self.client.rpush(pushParams, function (err, reply) {
				//logger.info(err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//list pop
	lpop(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.lpop(key, function (err, reply) {
				//logger.info("lpop", err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//list llen
	llen(key) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.client.llen(key, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//list lrange
	lrange(key, begin, end) {
		var self = this;
		var params = [];
		params.push(key);
		params.push(begin);
		params.push(end);
		//logger.info("lrange",params);
		return new Promise(function (resolve, reject) {
			self.client.lrange(params, function (err, reply) {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//list ltrim
	ltrim(key, begin, end) {
		var self = this;
		var params = [];
		params.push(key);
		params.push(begin);
		params.push(end);
		//logger.info("ltrim",params);
		return new Promise(function (resolve, reject) {
			self.clientSet.ltrim(params, function (err, reply) {
				//logger.info(err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}

	//list lindex
	lindex(key, index) {
		var self = this;
		var params = [];
		params.push(key);
		params.push(index);
		//logger.info("lindex",params);
		return new Promise(function (resolve, reject) {
			self.clientSet.lindex(params, function (err, reply) {
				// logger.info(err, reply);
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}
}

module.exports = RedisClient;
