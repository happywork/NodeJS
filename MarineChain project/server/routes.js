var admin = require('./admin');
var assert = require('better-assert');
var lib = require('./lib');
var database = require('./database');
var user = require('./user');
var news = require('./news');

var sendEmail = require('./sendEmail');
var stats = require('./stats');
var config = require('../config/config');
var recaptchaValidator = require('recaptcha-validator');

var production = process.env.NODE_ENV === 'production';

function staticPageLogged(page, loggedGoTo) {

    return function(req, res) {
        var user = req.user;

        if (!user){
            return res.render(page);
        }

        if (loggedGoTo) return res.redirect(loggedGoTo);

        res.render(page, {
            user: user
        });
    }
}

function contact(origin) {
    assert(typeof origin == 'string');

    return function(req, res, next) {
        var ret = "\tUser Information\n" + req.user + "\n\tEmail\n" + req.body.email + "\n\tMessage" + req.body.message;
        var user = req.user;
        var from = req.body.email;
        var message = req.body.message;
        

        if (!from ) return res.render(origin, {
            user: user,
            warning: 'email required'
        });

        if (!message)
            return res.render(origin, {
                user: user,
                warning: 'message required'
            });

        if (user) message = 'user_id: ' + req.user.id + '\n' + message;

        sendEmail.contact(from, message, null, function(err) {
            if (err)
                return next(new Error('Error sending email: \n' + err ));
            console.log(9999);
            return res.render(origin, {                
                success: 'Thank you for writing, one of my humans will write you back very soon :) ',
                ret: ret
            });
        });
    }
}

function restrict(req, res, next) {
    
    if (!req.user) {
       res.status(401);
       if (req.header('Accept') === 'text/plain')
          res.send('Not authorized');
       else
          res.render('401');
       return;
    } else
    next();
}

function restrictRedirectToHome(req, res, next) {
    if(!req.user) {
        res.redirect('/');
        return;
    }
    next();
};

function adminRestrict(req, res, next) {
    
    if (!req.user || !req.user.admin) {
        res.status(401);
        if (req.header('Accept') === 'text/plain')
            res.send('Not authorized');
        else
            res.render('401'); //Not authorized page.
        return;
    }
    next();
}

function recaptchaRestrict(req, res, next) {

    next();
}

function table() {
    var strEngineHost = lib.getEngineHost();
    
    return function(req, res) {
        res.render('table', {
            user: req.user,
            enginehost: strEngineHost,
            buildConfig: config.BUILD,
            table: true
        });
    }
}

function tableDev() {
    return function(req, res) {
        if(config.PRODUCTION)
            return res.status(401);
        requestDevOtt(req.params.id, function(devOtt) {
            res.render('table', {
                user: req.user,
                devOtt: devOtt,
                table: true
            });
        });
    }
}

function requestDevOtt(id, callback) {

    console.log("W: routes.requestDevOtt 1");

    var curl = require('curlrequest');
    var options = {
        url: 'https://marine-chain.com',
        include: true ,
        method: 'POST',
        'cookie': 'id='+id
    };

    var ott=null;
    curl.request(options, function (err, parts) {
        console.log("W: routes.requestDevOtt 2");
        parts = parts.split('\r\n');
        var data = parts.pop(), head = parts.pop();
        ott = data.trim();
        console.log('DEV OTT: ', ott);
        callback(ott);
    });
    console.log("W: routes.requestDevOtt 3");
}

function newsContent(newsContent) {
    assert(typeof newsContent == 'string');

    return function(req, res, next) {
        var ret = "\tUser Information\n" + req.user + "\n\tEmail\n" + req.body.email + "\n\tMessage" + req.body.message;
        var user = req.user;
        var from = req.body.email;
        var message = req.body.message;
        

        if (!from ) return res.render(origin, {
            user: user,
            warning: 'email required'
        });

        if (!message)
            return res.render(origin, {
                user: user,
                warning: 'message required'
            });

        if (user) message = 'user_id: ' + req.user.id + '\n' + message;

        sendEmail.contact(from, message, null, function(err) {
            if (err)
                return next(new Error('Error sending email: \n' + err ));

            return res.render(origin, {
                user: user,
                success: 'Thank you for writing, one of my humans will write you back very soon :) ',
                ret: ret
            });
        });
    }
}

module.exports = function(app) {

    app.get('/', user.index);
    app.get('/faq', user.faq);
    app.get('/news', news.newspage);
    app.get('/news/:newID', news.viewNews);

      //news management route start
    app.get('/admin/news', news.listNews);  //view news list    
    app.get('/admin/news/create', news.createNews); //display new news page
    app.post('/admin/news/create', news.buildNews); //Create new news page

    app.get('/admin/news/:newsID/edit', news.editNews);
    app.post('/admin/news/:newsID/edit', news.updateNews);

    app.get('/admin/news/:newsID/remove', news.removeNews); //remove news item
    //news management route end


    //subscribe function
    app.get('/admin/subscribe', news.listSubscribeEmail);  //view subscribe list    
    app.post('/news/subscribe', news.subscribe);    

    app.get('/register', staticPageLogged('register', '/play'));
    app.get('/login', staticPageLogged('login', '/play'));
    app.post('/contact-us', user.contactus);

    app.get('/reset/:recoverId', user.validateResetPassword);

    app.get('/faq_en', staticPageLogged('faq_en'));
    app.get('/faq_zh', staticPageLogged('faq_zh'));
    app.get('/contact', staticPageLogged('contact'));
    app.get('/request', restrict, user.request);
    app.get('/deposit', restrict, user.deposit);
    app.get('/withdraw', restrict, user.withdraw);
    app.get('/withdraw/request', restrict, user.withdrawRequest);
    // app.get('/support', restrict, user.contact);
    app.get('/support', restrict, user.support);
    app.get('/account', restrict, user.account);
    app.get('/security', restrict, user.security);
    app.get('/forgot-password', staticPageLogged('forgot-password'));
    app.get('/calculator', staticPageLogged('calculator'));
    app.get('/guide', staticPageLogged('guide'));
    app.get('/tutorial', user.tutorial);
    app.get('/giveaway', user.giveawayRequest);

    app.get('/transfer', restrict, user.transfer);
    app.get('/transfer.json', restrict, user.transferJson);
    app.get('/transfer-request', restrict, user.transferRequest);

    app.get('/play', table());
    app.get('/play-id/:id', tableDev());

    //app.get('/leaderboard', games.leaderboard);
    //app.get('/game/:id', games.show);
    app.get('/no_user', staticPageLogged('profile_no_user'));
    app.get('/user/:name', user.profile);


    //Admin Pages
   /* app.get('/company', admin.company);
    app.get('/customer',  admin.customer);
    app.get('/setting', admin.setting);*/
    app.get('/user-admin', admin.user);
    app.get('/support-admin/:type', admin.support);

    app.get('/company', staticPageLogged('admin_company'));
    app.get('/customer', staticPageLogged('admin_customer'));
    app.get('/setting', staticPageLogged('admin_setting'));

    app.get('/error', function(req, res, next) { // Sometimes we redirect people to /error
        
        return res.render('error');
    });

    app.post('/request', restrict, recaptchaRestrict, user.giveawayRequest);
    app.post('/sent-reset', user.resetPasswordRecovery);
    app.post('/sent-recover', recaptchaRestrict, user.sendPasswordRecover);
    app.post('/reset-password', restrict, user.resetPassword);
    app.post('/edit-email', restrict, user.editEmail);
    app.post('/enable-2fa', restrict, user.enableMfa);
    app.post('/disable-2fa', restrict, user.disableMfa);
    app.post('/withdraw', restrict, user.handleWithdrawRequest);
    // app.post('/support', restrict, contact('support'));


    app.post('/support', restrict, user.saveSupport);
    app.post('/replySupport', restrict, admin.replySupport);
    app.post('/showSupportMessage', restrict, admin.showSupportMessage);
    app.post('/setSupportReadFlag', restrict, admin.setSupportReadFlag);


    app.post('/contact', contact('contact'));
    app.post('/logout', restrictRedirectToHome, user.logout);
    app.post('/login', recaptchaRestrict, user.login);
    app.post('/register', recaptchaRestrict, user.register);
    app.post('/uploadAdvertisement', restrict, admin.uploadAdvertisement);
    app.post('/saveAdvertisementLink', restrict, admin.saveAdvertisementLink);

    app.post('/uploadAvatar', user.uploadAvatar);
    app.post('/getBalanceSatoshis', restrict, user.getBalanceSatoshis);
    app.post('/setWarningPoint', restrict, admin.setWarningPoint);
    app.post('/setTipFee', restrict, admin.setTipFee);
    app.post('/saveIntervals', restrict, admin.saveIntervals);
    app.post('/saveTutorials', restrict, admin.saveTutorials);
    app.post('/getCompanyProfitForGraph', restrict, admin.getCompanyProfitForGraph);
    app.post('/getCustomerProfitForGraph',  admin.getCustomerProfitForGraph);
    app.post('/setUserClass',  admin.setUserClass);
    //app.post('/getLeaderBoardTop5', games.getLeaderboardTop5);

    app.post('/transfer-request', restrict, user.handleTransferRequest);


    app.post('/ott', restrict, function(req, res, next) {
        var user = req.user;
        var ipAddress = req.ip;
        var userAgent = req.get('user-agent');
        assert(user);
        // console.log('WRT : routes.js : app.post/ott');
        database.createOneTimeToken(user.id, ipAddress, userAgent, function(err, token) {
            if (err) {
                console.error('[INTERNAL_ERROR] unable to get OTT got ' + err);
                res.status(500);
                return res.send('Server internal error');
            }
            res.send(token);
        });
    });
    app.get('/stats', stats.index);

    app.post('/save_eth_src', user.depositSrc);

    // Admin stuff
    app.get('/admin-giveaway', adminRestrict, admin.giveAway);
    app.post('/admin-giveaway', adminRestrict, admin.giveAwayHandle);

    app.get('*', function(req, res) {
        
        res.status(404);
        res.render('404');
    });

    app.post("/eurocrypt", function(req, res, next) {
        name= req.body.data;

        res.send('name');
    });

    app.post('/setLanguage', function(req, res, next) {
        var current_url = req.body.current_url;
        var language_code = req.body.language_code;

        if(current_url.includes('faq')) {
            current_url = current_url.replace(/en/g, language_code);
            current_url = current_url.replace(/zh/g, language_code);
        } else {
            current_url = current_url.split('?clang=en')[0].split('?clang=zh')[0] + '?clang=' + language_code;
        }
        res.redirect(current_url);
    });

      app.use(function (req, res) {       
        res.status(404);
        res.render('404');
        
    });

    app.use(function (err, req, res, next) {
        console.log(err.stack);        
        res.status(500);
        res.render('500');
    });

};
