const TAG = "homeSIOService.js";
const io = require("socket.io");

const opts = {
    serveClient: false,
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
};

exports.start = function(){
    var sio = io(g_homeMgr.config.HALL_FOR_GAEM_PORT, opts);

    sio.on("connection", function(socket){
        console.log(TAG, "one connection established: ", socket.id, socket.handshake.address);

        socket.on("error", function(error){
            console.log(TAG, "error: ", error);
        });
        socket.on("disconnect", function(reason){
            console.log(TAG, "disconnect: ", reason);
        });
        socket.on("niu_server", function(data){

        });
        socket.on("ddz_server", function(data){

        });
    });
}