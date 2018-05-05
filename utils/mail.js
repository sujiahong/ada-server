/**
 * Created by reedhong on 2017/5/18.
 */

var nodemailer = require('nodemailer');
var GameConfig = require('../share/game_config');

exports.send_mail = function(subject, content) {
    var transporter = nodemailer.createTransport({
        service: GameConfig.mail.Service,
        auth: {
            user: GameConfig.mail.SenderUser,
            pass: GameConfig.mail.SenderPwd
        }
    });

    var mailOptions = {
        from: GameConfig.mail.SenderUser, // sender address
        to: GameConfig.mail.SendTo, // list of receivers
        subject: subject, // Subject line
        text: content, // plaintext body
        html: '' // html body
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            logger.info(error);
        } else {
            logger.info('Message sent: ' + info.response);
        }
    });
};

