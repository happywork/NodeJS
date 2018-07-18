var assert = require('assert');
var async = require('async');
var database = require('./database');
var config = require('../config/config');
var lib = require('./lib');
var Jimp = require('jimp');
var sendEmail = require('./sendEmail');

/**
 * The req.user.admin is inserted in the user validation middleware
 */

exports.giveAway = function(req, res) {
    var user = req.user;
    assert(user.admin);

    

    res.render('giveaway', {
        user: user
    });
};

exports.giveAwayHandle = function(req, res, next) {
    var user = req.user;
    assert(user.admin);

    if (config.PRODUCTION) {
        var ref = req.get('Referer');
        if (!ref) return next(new Error('Possible xsfr')); //Interesting enough to log it as an error

        if (ref.lastIndexOf('https://madabit.ga/admin-giveaway', 0) !== 0)
            return next(new Error('Bad referrer got: ' + ref));
    }

    var giveAwayUsers = req.body.users.split(/\s+/);
    var bits = parseFloat(req.body.bits);

    if (!Number.isFinite(bits) || bits <= 0)
        return next('Problem with bits...');

    var satoshis = Math.round(bits * 100);

    database.addRawGiveaway(giveAwayUsers, satoshis , function(err) {
        if (err) return res.redirect('/admin-giveaway?err=' + err);

        res.redirect('/admin-giveaway?m=Done');
    });
};

exports.company = function(req, res, next) {
    var user = req.user;
    assert(user.admin);

    var strEngineHost = lib.getEngineHost();
    

    res.render('admin_company', {
        user: user,
        enginehost: strEngineHost
    });

};

exports.getCompanyProfitForGraph = function(req, res) {
    var user = req.user;
    assert(user.admin);
    database.getCompanyProfitPerMonth(function(err, profitPerMonth) {
        database.getCompanyProfitPerWeek(function (err, profitPerWeek) {
            database.getCompanyProfitPerDay(function (err, profitPerDay) {

                var result = {};
                result['profitPerMonth'] = profitPerMonth;
                result['profitPerWeek'] = profitPerWeek;
                result['profitPerDay'] = profitPerDay;
                res.send(result);
            });
        });
    });
};

 exports.customer = function(req, res, next) {
    var user = req.user;
    assert(user.admin);

    var strEngineHost = lib.getEngineHost();
    

    res.render('admin_customer', {
        user: user,
        enginehost: strEngineHost
    });
   
 };

exports.getCustomerProfitForGraph = function(req, res, next) {
    var user = req.user;
    assert(user.admin);

    database.getCustomerProfitPerGame(function(err, profitPerGame) {
        database.getCustomerProfitPerDay(function(err, profitPerDay) {
            var result = {};
            result.profitPerGame = profitPerGame;
            result.profitPerDay = profitPerDay;
            res.send(result);
        });
    });
};



 exports.setting = function(req, res, next) {
     var user = req.user;
     

     assert(user.admin);
    database.getWarningPoint(function(err, warningPoint) {
        database.getTipFee(function(err, tipFee) {
            database.getIntervals(function (err, intervals) {
                database.getTutorials(function (err, tutorials) {
                    database.getAdvertisementLink(function (err, advertisementLink) {

                        var strEngineHost = lib.getEngineHost();
                        
                        res.render('admin_setting', {
                            user: user,
                            enginehost: strEngineHost,
                            currentWarningPoint: parseInt(warningPoint),
                            currentTipFee: tipFee,
                            intervals: intervals,
                            tutorials: tutorials,
                            advertisementLink: advertisementLink
                        });
                    });
                });
            });
        });
    });
 };

exports.user = function(req, res) {
    var user = req.user;
    assert(user.admin);
    

    database.getUserList(function (err, users) {
        res.render('admin_user', {
            user:user,
            users:users
        });
    });
};

exports.support = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var type = lib.removeNullsAndTrim(req.params.type);
    

    if(!(type == 'all' || type == 'read' || type == 'unread'))
        type = 'all';
    
    database.getSupportList(type, function (err, supports) {
        for(var i = 0; i < supports.length; i++) {
            if(supports[i]['message_to_admin'] == null)
                supports[i]['message_to_admin'] = '';
            if(supports[i]['message_to_user'] == null)
                supports[i]['message_to_user'] = '';
            supports[i]['message_to_admin'] = supports[i]['message_to_admin'].replace(/(?:\\[rn]|[\r\n]+)+/g, "ELM");
            supports[i]['message_to_user'] = supports[i]['message_to_user'].replace(/(?:\\[rn]|[\r\n]+)+/g, "ELM");
        }
        res.render('admin_support', {
            user:user,
            type:type,
            supports:supports
        });
    });
};

exports.setSupportReadFlag = function(req, res) {
    var supportId = req.body.supportId;
    var flag = req.body.flag;
    database.setSupportReadFlag(supportId, flag, function(err, result) {
        res.send(result);
    });
};

exports.showSupportMessage = function(req, res) {
    var user_id = req.body.user_selected;
    var user = req.user;
    database.getSupportList('all', function (err, supports) {
        database.getSupportFromUserId(user_id, function (error, result) {
            if (error) console.error(error);
            res.render('admin_support', {
                user: user,
                shows: result.rows,
                supports: supports
            });
        });
    });
};

exports.replySupport = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var supportId = req.body.supportId;
    var email = req.body.email;
    var msg2User = req.body.msg2User;
    sendEmail.contact(email, msg2User, function(err, result) {
        database.replySupport(supportId, msg2User, function(err, result) {
            res.send(result);
        });
    });
};

exports.uploadAdvertisement = function(req, res) {
  var user = req.user;
  assert(user.admin);

  var advertisementLink = req.body.advertisementLink;
  var upload_path = __dirname + '/../upload/' + req.files.advertisement.name;
  var result_path = __dirname + '/../theme/img/advertisement.jpg';
  if (config.PRODUCTION)
  {
      result_path = __dirname + '/../build/img/advertisement.jpg';
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.advertisement;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(upload_path, function(err) {
    if (err) return res.status(500).send(err);
  });

 	Jimp.read(upload_path, function(err, results) {
 		//console.log(results);
 		if (err) throw err;
 		else {
 			results.resize(600, 90)
 				.quality(60)
 				.write(result_path);
 			res.redirect('/setting');
 		};
        //res.render('admin_setting', {user: req.user});
 	});
 };

 //save Advertisement Link Address
exports.saveAdvertisementLink = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var advertisementLink = req.body.advertisementLink;
    database.saveAdvertisementLink(advertisementLink, function(err, result) {
        res.send(result);
    });
};

// Set the Warning Point
exports.setWarningPoint = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var warningPoint = req.body.warningPoint;
    var safePoint = req.body.safePoint;
    database.setWarningPoint(warningPoint, function(err, result) {
        if(err)
            throw err;
        database.setSafePoint(safePoint, function(err, result) {
            if(err)
                throw err;
            res.send(result);
        });
    });
};

// Set the Tip Fee
exports.setTipFee = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var tipFee = req.body.tipFee;
    database.setTipFee(tipFee, function(err, result) {
        if(err)
            throw err;
        res.send(result);
    });
};

//Set the Intervals for Crash Point Range
exports.saveIntervals = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var intervals = req.body.intervals;
    database.saveIntervals(intervals, function(err, result) {
        res.send(result);
    });
};

//Set the Title and URL of Tutorial
exports.saveTutorials = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var tutorials = req.body.tutorials;
    database.saveTutorials(tutorials, function(err, result) {
        res.send(result);
    });
};

exports.setUserClass = function(req, res) {
    var user = req.user;
    assert(user.admin);
    var userId = req.body.userId;
    var userClass = req.body.userClass;
    database.setUserClass(userId, userClass, function(err, result) {
        res.send(result);
    });
};