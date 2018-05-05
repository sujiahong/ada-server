/**
 * Created by reedhong on 17/3/10.
 */

module.exports = {
    basic:{
        SwitchCode:'fuckyou',
        DefaultFangKas:12,
        DissolveTimeout:15,
        NeedFangKa:false,
        FangNumLen:4,        // 房号的长度
        ShowHuDuration:2000, // 胡牌到出结果的时间间隔
        IsTestShuffle:false
    },

    mail:{
        Service: '163',
        SenderUser: 'fishwarter@163.com',
        SenderPwd: 'Beijing2015',
        SendTo: '1754474061@qq.com,49748692@qq.com'
    },


    // 扣章玩法的配置
    kouzhang:{
        TotalPaiCount : 144,
        SeatCount : 4,
        TotalKouZhangStep: 4,
        BaseScore: 1,       // 低分
        JuShu: [8,16,32],      // 多少局
        JuShuCost: [3,6,12],  // 消耗房卡,
        JiFen:[300,500,100],
        LeftMJCount: 12, // 最后12张不给摸了
        isShowKou:false,    // 是否把扣牌明出来, 用于测试的一个参数
        IsControl:true,
        GameState: {
            idle:'idle',
            start:'start',
            kouzhang:'kouzhang',
            playing:'playing',
            end:'end'
        },
        MaxKouZhangStep:4,
        HoldLength:13, // 不算最后一张牌
        MaxBaoPai: 12, // 包牌封顶

        // 基本的胡牌类型
        HuPattern:{
            Null: 'error',  // 标记不可胡
            Normal:'Normal',
            Pair7:'Pair7',
            Yao13:'Yao13'
        },

        // 最终的计算类型,可以叠加
        FinalHuPattern:{
            Basic:{
                key:'basic',
                name:'底胡',
                score:40
            },
            Hua:{
                key:'hua',
                name:'花',
                score:20
            },
            Kou:{
                key:'kou',
                name:'扣牌',
                score:20
            },
            MingGang:{
                key:'minggang',
                name:'明杠',
                score:20
            },
            AnGang:{
                key:'angang',
                name:'暗杠',
                score:40
            },
            QueMen:{
                key:'quemen',
                name:'缺门',
                score:20
            },        // 缺门
            HunYiSe:{            // 混一色,跟缺门互斥
                key: 'hunyise',
                name:'混一色',
                score:100
            },
            QingYiSe:{
                key: 'qingyise',
                name:'清一色',
                score:300
            },
            ZiYiSe:{
                key: 'ziyise',
                name:'字一色',
                score:1000
            },
            OneDragon:{
                key: 'onedragon',
                name: '一条龙',
                score:200
            },
            MingFeng:{      // 明风,每名一张+200
                key: 'mingfeng',
                name:'明风',
                score:200
            },
            ZhuiFeng:{
                key: 'zhuifeng',
                name: '追风',
                score:400
            },
            Kou:{
                key: 'kou',
                name: '扣张',
                score:20
            },
            Yao13:{
                key: '13yao',
                name: '十三幺',
                score: 1500
            },
            SiGuiYi:{
                key: 'siguiyi',
                name: '四归一',
                score: 100
            },
            ZhuoWuKui:{
                key: 'zhuowukui',
                name: '捉五魁',
                score: 100
            },
            MenQing:{
                key: 'menqing',
                name: '门清',
                score: 100
            },
            PengPeng:{
                key: 'pengpeng',
                name: '碰碰胡',
                score:100
            },
            Pair7Count8:{
                key: 'pair7count8',
                name: '8张七对',
                score:200
            } ,
            Pair7Count10:{
                key: 'pair7count10',
                name: '10张七对',
                score:400
            } ,
            Pair7Count12:{
                key: 'pair7count12',
                name: '12张七对',
                score:600
            } ,
            Pair7Count14:{
                key: 'pair7count14',
                name: '14张七对',
                score:800
            }
        }
    },

    // 二五八
    erwuba:{
        TotalPaiCount : 138,
        SeatCount : 4,
        BaseScore: 2,       // 低分
        JuShu: [8,16],      // 多少局
        JuShuCost: [3,6],  // 消耗房卡,
        LeftMJCount: 10, // 最后10张不给摸了
        HuaScore:[1,2], // 花的分值
        JiangPais:[1,4,7,10,13,16,19,22,25],  // 所有的将牌
        GameState: {
            idle:'idle',
            start:'start',
            playing:'playing',
            buhua:'buhua', // 增加一个补花阶段,否则,在补花的时候用户要是退出去,在重新进来,会多次开局导致发牌失败
            end:'end'
        },
        HoldLength:13, // 不算最后一张牌


        HuPattern:{
            Basic:{
                key:'basic',
                name:'小胡',
                score:1
            },
            QingYiSe:{
                key: 'qingyise',
                name:'清一色',
                score:2
            },
            JiangYiSe:{
                key: 'jiangyise',
                name:'将一色',
                score:2
            },
            FengYiSe:{
                key: 'fengyise',
                name: '风一色',
                score:2
            },
            Pair7:{
                key: 'pair7',
                name: '七对',
                score:2
            }
        }
    },

    hongzhong:{
        TotalPaiCount : 112,
        SeatCount : 4,
        JuShu: [8,16],      // 多少局
        FanZhang:[2,4],
        JuShuCost: [3,6],  // 消耗房卡,
        LeftMJCount: 0, // 最后0张不给摸了,没牌就不翻了
        JiangPais:[1,4,7,10,13,16,19,22,25],  // 所有的将牌
        HongZhong: 31,
        FanZhangDT:4000,
        GameState: {
            idle:'idle',
            start:'start',
            playing:'playing',
            end:'end'
        },
        HoldLength:13, // 不算最后一张牌

        HuPattern:{
            Basic:{
                key:'basic',
                name:'小胡',
                score:1
            },
            Pair7:{
                key: 'pair7',
                name: '七对',
                score:10
            }
        }
    },

    tuidaohu:{
        TotalPaiCount : 136,
        SeatCount : 4,
        BaseScore: 1,       // 低分
        JuShu: [8,16],      // 多少局
        JuShuCost: [3,6],  // 消耗房卡,
        LeftMJCount: 0, // 最后12张不给摸了
        GameState: {
            idle:'idle',
            start:'start',
            playing:'playing',
            end:'end'
        },
        HoldLength:13, // 不算最后一张牌

        HuPattern:{
            Basic:{
                key:'basic',
                name:'小胡',
                score:1
            },
            QingYiSe:{
                key: 'qingyise',
                name:'清一色',
                score:9
            },
            OneDragon:{
                key: 'onedragon',
                name:'一条龙',
                score:9
            },
            Yao13:{
                key: 'yao13',
                name: '十三幺',
                score:27
            },
            Pair7:{
                key: 'pair7',
                name: '七对',
                score:9
            },
            HaoPair7:{
                key: 'haopair7',
                name: '豪华七对',
                score:18
            }
        }
    },

    shishou:{
        TotalPaiCount : 136,
        SeatCount : 4,
        BaseScore: 1,       // 低分
        JuShu: [8, 16, 32],      // 多少局
        JuShuCost: [3, 6, 12],  // 消耗房卡,
        LeftMJCount: 0, // 最后0张不给摸了
        GameState: {
            idle:'idle',
            start:'start',
            playing:'playing',
            end:'end'
        },
        HoldLength:13, // 不算最后一张牌

        HuPattern:{
            
            Basic:{
                key:'basic',
                name:'小胡',
                score:1
            },

        }
    }
};
