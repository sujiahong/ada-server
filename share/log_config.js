/**
 * Created by reedhong on 2017/6/7.
 */


/**
 * Created by reedhong on 17/3/10.
 */

module.exports = {
    account: {
        name:'account',
        src: true,
        streams: [
            {
                level: 'error',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'error',
                path: __dirname + '/../logs/account.log'  // log ERROR and above to a file
            }
        ]
    },

    hall:{
        name:'hall',
        src: true,
        streams: [
            {
                level: 'info',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'info',
                path: __dirname + '/../logs/hall.log'  // log ERROR and above to a file
            }
        ]
    },

    niuserver:{
        name:'niuserver',
        src: true,
        streams: [
            {
                level: 'info',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'info',
                path: __dirname + '/../logs/niuserver.log'  // log ERROR and above to a file
            }
        ]
    },
    ddzserver:{
        name:'ddzserver',
        src: true,
        streams: [
            {
                level: 'info',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'info',
                path: __dirname + '/../logs/ddzserver.log'  // log ERROR and above to a file
            }
        ]
    },
    data:{
        name:'data',
        src: true,
        streams: [
            {
                level: 'error',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'error',
                path: __dirname + '/../logs/data.log'  // log ERROR and above to a file
            }
        ]
    },

    tools:{
        name:'tools',
        src: true,
        streams: [
            {
                level: 'error',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'error',
                path: __dirname + '/../logs/tools.log'  // log ERROR and above to a file
            }
        ]
    },

    test:{
        name:'test',
        src: true,
        streams: [
            {
                level: 'info',
                stream: process.stdout            // log INFO and above to stdout
            },
            {
                level: 'error',
                path: __dirname + '/../logs/test.log'  // log ERROR and above to a file
            }
        ]
    }
};
