/*
 Navicat MySQL Data Transfer

 Source Server         : localhost
 Source Server Version : 50717
 Source Host           : localhost
 Source Database       : mj

 Target Server Version : 50717
 File Encoding         : utf-8

 Date: 07/25/2017 01:08:48 AM
*/

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `t_games`
-- ----------------------------
DROP TABLE IF EXISTS `t_games`;
CREATE TABLE `t_games` (
  `room_uuid` char(20) NOT NULL,
  `game_index` smallint(6) NOT NULL,
  `room_id` char(8) NOT NULL,
  `room_type` char(32) DEFAULT NULL,
  `base_info` varchar(1024) NOT NULL,
  `create_time` int(11) NOT NULL,
  `snapshots` char(255) DEFAULT NULL,
  `action_records` varchar(2048) DEFAULT NULL,
  `result` char(255) DEFAULT NULL,
  PRIMARY KEY (`room_uuid`,`game_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_games_archive`
-- ----------------------------
DROP TABLE IF EXISTS `t_games_archive`;
CREATE TABLE `t_games_archive` (
  `room_uuid` char(20) NOT NULL,
  `game_index` smallint(6) NOT NULL,
  `room_id` char(8) NOT NULL,
  `room_type` char(32) DEFAULT NULL,
  `base_info` varchar(1024) NOT NULL,
  `create_time` int(11) NOT NULL,
  `snapshots` char(255) DEFAULT NULL,
  `action_records` varchar(2048) DEFAULT NULL,
  `result` char(255) DEFAULT NULL,
  PRIMARY KEY (`room_uuid`,`game_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_guests`
-- ----------------------------
DROP TABLE IF EXISTS `t_guests`;
CREATE TABLE `t_guests` (
  `guest_account` varchar(255) NOT NULL,
  PRIMARY KEY (`guest_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_history`
-- ----------------------------
DROP TABLE IF EXISTS `t_history`;
CREATE TABLE `t_history` (
  `user_id` int(11) DEFAULT NULL,
  `room_id` char(8) NOT NULL,
  `room_type` char(32) NOT NULL,
  `room_uuid` char(20) NOT NULL,
  `create_time` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_message`
-- ----------------------------
DROP TABLE IF EXISTS `t_message`;
CREATE TABLE `t_message` (
  `type` varchar(32) NOT NULL,
  `msg` varchar(1024) NOT NULL,
  `version` varchar(32) NOT NULL,
  PRIMARY KEY (`type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_prize_count`
-- ----------------------------
DROP TABLE IF EXISTS `t_prize_count`;
CREATE TABLE `t_prize_count` (
  `item1` int(12) NOT NULL DEFAULT '10000000',
  `item2` int(12) NOT NULL DEFAULT '0',
  `item3` int(12) NOT NULL DEFAULT '0',
  `item4` int(12) NOT NULL DEFAULT '0',
  `item5` int(12) NOT NULL DEFAULT '0',
  `item6` int(12) NOT NULL DEFAULT '0',
  `item7` int(12) NOT NULL DEFAULT '0',
  `item8` int(12) NOT NULL DEFAULT '0',
  `item9` int(12) NOT NULL DEFAULT '0',
  `item10` int(12) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_prize_record`
-- ----------------------------
DROP TABLE IF EXISTS `t_prize_record`;
CREATE TABLE `t_prize_record` (
  `userid` int(11) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `prize_name` varchar(64) NOT NULL,
  `prize_type` int(11) NOT NULL,
  `create_time` int(11) NOT NULL,
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_prize_user_info`
-- ----------------------------
DROP TABLE IF EXISTS `t_prize_user_info`;
CREATE TABLE `t_prize_user_info` (
  `userid` int(12) NOT NULL,
  `last_free_prize_time` int(11) NOT NULL DEFAULT '0' COMMENT '上一次免费抽奖的时间',
  `share_time` int(11) NOT NULL DEFAULT '0' COMMENT '分享的时间',
  `share_count` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_rooms`
-- ----------------------------
DROP TABLE IF EXISTS `t_rooms`;
CREATE TABLE `t_rooms` (
  `uuid` char(20) NOT NULL,
  `id` char(8) NOT NULL,
  `base_info` varchar(256) NOT NULL DEFAULT '0',
  `num_of_turns` int(11) NOT NULL DEFAULT '0',
  `next_button` int(11) DEFAULT NULL,
  `users_info` varchar(2048) DEFAULT '0',
  `ip` varchar(16) DEFAULT NULL COMMENT 'game server的ip',
  `port` int(11) DEFAULT '0' COMMENT 'game server的端口',
  `is_closed` tinyint(1) NOT NULL DEFAULT '0',
  `create_time` int(11) NOT NULL,
  `closed_time` int(11) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_rooms_archive`
-- ----------------------------
DROP TABLE IF EXISTS `t_rooms_archive`;
CREATE TABLE `t_rooms_archive` (
  `uuid` char(20) NOT NULL,
  `id` char(8) NOT NULL,
  `base_info` varchar(256) NOT NULL DEFAULT '0',
  `num_of_turns` int(11) NOT NULL DEFAULT '0',
  `next_button` int(11) DEFAULT NULL,
  `users_info` varchar(2048) DEFAULT '0',
  `ip` varchar(16) DEFAULT NULL COMMENT 'game server的ip',
  `port` int(11) DEFAULT '0' COMMENT 'game server的端口',
  `is_closed` tinyint(1) NOT NULL DEFAULT '0',
  `create_time` int(11) NOT NULL,
  `closed_time` int(11) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_users`
-- ----------------------------
DROP TABLE IF EXISTS `t_users`;
CREATE TABLE `t_users` (
  `userid` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `account` varchar(64) NOT NULL DEFAULT '' COMMENT '账号',
  `name` varchar(32) DEFAULT NULL COMMENT '用户昵称',
  `sex` int(1) DEFAULT NULL,
  `headimg` varchar(256) DEFAULT NULL,
  `lv` smallint(6) DEFAULT '1' COMMENT '用户等级',
  `exp` int(11) DEFAULT '0' COMMENT '用户经验',
  `coins` int(11) DEFAULT '0' COMMENT '用户金币',
  `gems` int(11) DEFAULT '0' COMMENT '用户宝石',
  `roomid` varchar(8) DEFAULT NULL,
  `history` varchar(4096) DEFAULT NULL,
  `create_time` int(11) NOT NULL,
  `last_login_time` int(11) NOT NULL,
  PRIMARY KEY (`userid`),
  UNIQUE KEY `account` (`account`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8;

SET FOREIGN_KEY_CHECKS = 1;
