const TAG = "test-server.js";
var io = require("socket.io-client");

var socketio = io.connect("ws://127.0.0.1:9100", {
    'reconnection': true,
    "reconnectionAttempts": 3,
    //'force new connection': true,
    'transports': ['websocket', 'polling'],
    "timeout": 5000
});
//socketio.close();
//console.error(TAG, socketio.io);

socketio.on("error", function (error) {
    console.log(TAG, "error: ", error);
});
socketio.on("connect", function () {
    console.log(TAG, "connect: ", socketio.id);
    socketio.emit("niuService", {route: "login"}, function(data){
        console.log(TAG, data);
    });
});

socketio.on("connect_error", function (error) {
    console.log(TAG, "connect_error: ", error.description);
});

socketio.on("connect_timeout", function (error) {
    console.log(TAG, "connect_timeout: ", error);
});

socketio.on("reconnect", function (num) {
    console.log(TAG, "reconnect: ", num, socketio.id);
});

socketio.on("reconnect_attempt", function (num) {
    console.log(TAG, "reconnect_attempt: ", num, socketio.id);
});

socketio.on("reconnect_error", function (error) {
    console.log(TAG, "reconnect_error: ", error, socketio.id);
});

socketio.on("reconnect_failed", function () {
    console.log(TAG, "reconnect_failed: ", socketio.id);
});

socketio.on("disconnect", function (reason) {
    console.log(TAG, "disconnect: ", reason);
});

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.error('uncaughtException error');
    logger.error(err);
    if (err && err.code == 'ECONNREFUSED') {
        //do someting
    } else {
        //process.exit(1);
    }
    mail.send_mail('account-server uncaughtException', 'account-server uncaughtException');
});
