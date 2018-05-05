/**
 * Created by reedhong on 17/3/10.
 */

module.exports = {
    Action:{
        Null: -1,
        Guo:0,
        ChuPai:1,
        MoPai:2,
        Peng:3,
        Gang:4,
        Hu:5,
        ZiMo:6,
        Chi:7  // 吃
    },

    PaiType:{
        Null: -1,
        Tong: 0, // 筒
        Tiao: 1, // 条
        Wan: 2, // 万
        Feng: 3, // 风
        Hua: 4, // 花
        Tuo:5   // 坨
    },
    
    
    PaiBeginIndex:{
        Tong:0,
        Tiao:9,
        Wan:18,
        Feng:27,
        Hua:34,
        Tuo:42
    },

    GangType: {
        angang:'angang',  // 自己摸了4张
        diangang: 'diangang', // 已经有3张了,在吃一个
        wangang: 'wangang' // 已经碰了在摸一张
    },

    GameType:{
        kouzhang : 'kouzhang',
        xzdd : 'xzdd',
        xlch : 'xlch'
    },


    Sex:{
        Female: 2,
        Male: 1,
        Unkown: 0
    }
};
