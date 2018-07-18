var assert = require('assert');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var config = require('../config/config');

var SITE_URL = config.SITE_URL;

function send(details, callback) {

    nodemailer.createTestAccount((err, account) => {
        console.log("\n  Now in the nodemailer.createTestAccount function.");
        console.log("\n  Error\n" + err);
        console.log("\n  Account information");
        console.log(account);
        if (err) {
            console.error('\n  Failed to create a testing account. ' + err.message);
            return process.exit(1);
        }

        // Create a SMTP transporter object
        let transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            service: 'Gmail',
            auth: {
                user: 'lovely20161102@gmail.com',
                pass: 'famousman0923'
            }
        });

        // Message object
        let message = {
            from: '<' + 'lovely20161102@gmail.com' + '>',
            to: '<' + details.to + '>',
            subject: 'Nodemailer is unicode friendly ✔',
            // text: 'Hello to Pich Muy!\n This is Nils Jansson.\nLong time no see.',
            html: details.html
        };

        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.log('\n  Error occurred. ' + err.message);
                return process.exit(1);
            }
            console.log(88888);
            console.log(info);
            //callback(null, true);
             console.log(7777);
        });
    });
};

exports.contact = function(to, content,callback) {

console.log('send Email part start');
console.log(to);
console.log('content');
console.log(content);
console.log('send Email part end');
    var details = {
        to: to,
        from: 'lovely20161102@gmail.com',
        html: '<!DOCTYPE html5">' +
        '<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' +
        '<title>Marin Chain</title>' +
        '</head>' +
        '<body>'+
        '<table width="100%" cellpadding="0" cellspacing="0" bgcolor="e4e4e4"><tr><td> <table id="top-message" cellpadding="20" cellspacing="0" width="600" align="center"> <tr> <td></td> </tr> </table> <table id="main" width="600" align="center" cellpadding="0" cellspacing="15" bgcolor="ffffff"> <tr> <td> <table id="content-1" cellpadding="0" cellspacing="0" align="center"> <tr> <td width="570" valign="top"> <table cellpadding="5" cellspacing="0"> <div style="background-color:#000;"> <div style="text-align:center;margin-left: 230"> </div> </div> </td> </tr> </table> </td> </tr> <tr> <td> <table id="content-6" cellpadding="0" cellspacing="0"> <p> ' + content +' </p> </table> </td> </tr> </table> </td></tr></table>'+
        '</body></html>'
    };
    send(details, function(err, result) {
        callback(null, result);
    });
};
