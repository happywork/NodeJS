var assert = require('better-assert');
var async = require('async');
var bitcoinjs = require('bitcoinjs-lib');
var request = require('request');
var timeago = require('timeago');
var lib = require('./lib');
var database = require('./database');
//var withdraw = require('./withdraw');
var sendEmail = require('./sendEmail');
var speakeasy = require('speakeasy');
var qr = require('qr-image');
var uuid = require('uuid');
var _ = require('lodash');
var config = require('../config/config');
var Jimp = require('jimp');
var fs = require('fs');

var sessionOptions = {
    httpOnly: true,
    // secure : config.PRODUCTION
    secure : false
};

/**
 * POST
 * Public API
 * Register a user
 */
exports.register  = function(req, res, next) {

    var values = {};

    var recaptcha = lib.removeNullsAndTrim(req.body['g-recaptcha-response']);
    var username = lib.removeNullsAndTrim(req.body.username);
    var password = lib.removeNullsAndTrim(req.body.password);
    var password2 = lib.removeNullsAndTrim(req.body.confirm);
    var ref_id = lib.removeNullsAndTrim(req.body.ref_id);
    var email = lib.removeNullsAndTrim(req.body.email);

    values.username = username;
    values.password = password;
    values.confirm = password2;
    values.ref_id = ref_id;
    values.email = email;
    values.recaptcha = recaptcha;

    var superAdminInfo = JSON.parse(fs.readFileSync(__dirname + '/../admin.json'));
    if(username == superAdminInfo.username && password == superAdminInfo.password)
        return res.render('register', {
            warning: 'Username is already taken.',
            values: values
        });

    var ipAddress = req.ip;

    var userAgent = req.get('user-agent');

    var notValid = lib.isInvalidUsername(username);
    if (notValid) {
        return res.render('register', {
            warning: 'Username is not valid.',
            values: values
        });
    }

    // stop new registrations of >16 char usernames
    if (username.length > 16)
        return res.render('register', {
            warning: 'Username is too long.',
            values: value
        });

    notValid = lib.isInvalidPassword(password);
    if (notValid) {
        return res.render('register', {
            warning: 'Password is not valid.',
            values: values
        });
    }

    if (email) {
        notValid = lib.isInvalidEmail(email);
        if (notValid)
            return res.render('register', {
                warning: 'Email is not valid.',
                values: values
        });
    }

    // Ensure password and confirmation match
    if (password !== password2) {
        return res.render('register', {
            warning: 'Password and Confirmation did not match.'
        });
    }

    database.createUser(username, password, ref_id, email, ipAddress, userAgent, function(err, sessionId) {
        if (err) {
            if (err === 'USERNAME_TAKEN') {
                return res.render('register', {
                    warning: 'Username is already taken.',
                    values: values
                });
            } else if (err === 'NO_REF_ID') {
                return res.render('register', {
                    warning: 'Referral ID is not valid.',
                    values: values
                });
            }
            return next(new Error('Unable to register user: \n' + err));
        }
        res.cookie('id', sessionId, sessionOptions);
        return res.redirect('/play?m=new');
    });
};

/**
 * POST
 * Public API
 * Login a user
 */
exports.login = function(req, res, next) {
    var username = lib.removeNullsAndTrim(req.body.username);
    var password = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);
    var remember = !!req.body.remember;
    var ipAddress = req.ip;
    var userAgent = req.get('user-agent');

    if (!username || !password)
        return res.render('login', {
            warning: 'no username or password'
        });

    var superAdminInfo = JSON.parse(fs.readFileSync(__dirname + '/../admin.json'));
    if(username == superAdminInfo.username && password == superAdminInfo.password) {
        database.validateUserForSuperAdmin(superAdminInfo.username, superAdminInfo.password, otp, function (err, userId) {
            if (err) {
                console.log('W: Error: Login: ', username, ' : ', err);

                if (err === 'NO_USER') {
                    database.createUserForSuperAdmin(superAdminInfo.username, superAdminInfo.password, "", superAdminInfo.email, ipAddress, userAgent, function(err, sessionId) {
                        if (err) {
                            if (err === 'USERNAME_TAKEN') {
                                return res.render('register', {
                                    warning: 'Username is already taken.',
                                    values: values
                                });
                            } else if (err === 'NO_REF_ID') {
                                return res.render('register', {
                                    warning: 'Referral ID is not valid.',
                                    values: values
                                });
                            }
                            return next(new Error('Unable to register user: \n' + err));
                        }
                        res.cookie('id', sessionId, sessionOptions);
                        return res.redirect('/play?m=new');
                    });
                }
                else return next(new Error('Unable to validate user ' + username + ': \n' + err));
            }
            else {
                assert(userId);
                database.createSession(userId, ipAddress, userAgent, remember, function (err, sessionId, expires) {
                    if (err)
                        return next(new Error('Unable to create session for userid ' + userId + ':\n' + err));

                    if (remember)
                        sessionOptions.expires = expires;
                    res.cookie('id', sessionId, sessionOptions);
                    res.redirect('/');
                });
            }
        });
    }
    else {
        database.validateUser(username, password, otp, function (err, userId) { 
            if (err) {
                console.log('W: Error: Login: ', username, ' : ', err);

                if (err === 'NO_USER')
                    return res.render('login', {
                        warning: 'Username does not exist'
                    });
                if (err === 'WRONG_PASSWORD')
                    return res.render('login', {
                        warning: 'Invalid password'
                    });
                if (err === 'INVALID_OTP') {
                    var warning = otp ? 'Invalid one-time password' : undefined;
                    return res.render('login-mfa', {
                        username: username,
                        password: password,
                        warning: warning
                    });
                }
                return next(new Error('Unable to validate user ' + username + ': \n' + err));
            }
            assert(userId);

            database.createSession(userId, ipAddress, userAgent, remember, function (err, sessionId, expires) {
                // console.log("WRT login : 4");
                if (err)
                    return next(new Error('Unable to create session for userid ' + userId + ':\n' + err));

                if (remember)
                    sessionOptions.expires = expires;
                res.cookie('id', sessionId, sessionOptions);
                res.redirect('/');
            });
        });
    }
};

/**
 * POST
 * Logged API
 * Logout the current user
 */
exports.logout = function(req, res, next) {
    var sessionId = req.cookies.id;
    var userId = req.user.id;
    assert(sessionId && userId);

    database.expireSessionsByUserId(userId, function(err) {
        if (err)
            return next(new Error('Unable to logout got error: \n' + err));
        res.redirect('/login');
    });
};

/**
 * GET
 * Logged API
 * Shows the graph of the user profit and games
 */

exports.profile = function(req, res, next) {

    var user = req.user; //If logged here is the user info
    var username = lib.removeNullsAndTrim(req.params.name);

    var page = null;
    if (req.query.p) { //The page requested or last
        page = parseInt(req.query.p);
        if (!Number.isFinite(page) || page < 0)
            return next('Invalid page');
    }

    if (!username) {
        //return next('No username in profile');
        return res.redirect('/no_user', {msg : 'No username in profile'});
    }


    database.getPublicStats(username, function(err, stats) {
        if (err) {
            if (err === 'USER_DOES_NOT_EXIST')
                return res.redirect('/no_user');
               // return res.render('/user/username', {
               //     user: user,
               //     // username: username,
               //     error: true,
               //     msg: "User does not exist."
               // });
            else
                return next(new Error('Cant get public stats: \n' + err));
        }

        /**
         * Pagination
         * If the page number is undefined it shows the last page
         * If the page number is given it shows that page
         * It starts counting from zero
         */

        var resultsPerPage = 50;
        var pages = Math.floor(stats.games_played / resultsPerPage);

        if (page && page >= pages)
            return next('User does not have page ', page);

        // first page absorbs all overflow
        var firstPageResultCount = stats.games_played - ((pages) * resultsPerPage);

        var showing = page ? resultsPerPage : firstPageResultCount;
        var offset = page ? (firstPageResultCount + ((pages - page) * resultsPerPage)) : 0 ;

        if (offset > 100000) {
          return next('Sorry we can\'t show games that far back :( ');
        }

        var tasks = [
            function(callback) {
                database.getUserNetProfitLast(stats.user_id, showing + offset, callback);
            },
            function(callback) {
                database.getUserPlays(stats.user_id, showing, offset, callback);
            }
        ];


        async.parallel(tasks, function(err, results) {
            if (err) return next(new Error('Error getting user profit: \n' + err));

            var lastProfit = results[0];

            var netProfitOffset = stats.net_profit - lastProfit;
            var plays = results[1];


            if (!lib.isInt(netProfitOffset))
                return next(new Error('Internal profit calc error: ' + username + ' does not have an integer net profit offset'));

            assert(plays);

            plays.forEach(function(play) {
                play.timeago = timeago(play.created);
            });

            var previousPage;
            if (pages > 1) {
                if (page && page >= 2)
                    previousPage = '?p=' + (page - 1);
                else if (!page)
                    previousPage = '?p=' + (pages - 1);
            }

            var nextPage;
            if (pages > 1) {
                if (page && page < (pages-1))
                    nextPage ='?p=' + (page + 1);
                else if (page && page == pages-1)
                    nextPage = stats.username;
            }

            res.render('user', {
                user: user,
                stats: stats,
                plays: plays,
                net_profit_offset: netProfitOffset,
                showing_last: !!page,
                previous_page: previousPage,
                next_page: nextPage,
                games_from: stats.games_played-(offset + showing - 1),
                games_to: stats.games_played-offset,
                pages: {
                    current: page == 0 ? 1 : page + 1 ,
                    total: Math.ceil(stats.games_played / 100)
                },
            });
        });

    });
};

/**
 * GET
 * Shows the request bits page
 * Restricted API to logged users
 **/
exports.request = function(req, res) {
    var user = req.user; //Login var
    assert(user);

    

    res.render('request', {
            user: user
    });
};

/**
 * GET
 * Shows the request bits page
 * Restricted API to logged users
 **/
exports.tutorial = function(req, res) {
    var user = req.user;
    

    database.getTutorials(function (err, tutorials) {
        res.render('tutorial', {
            user : user,
            tutorials: tutorials
        });
    });
};

/**
 * POST
 * Process the give away requests
 * Restricted API to logged users
 **/
exports.giveawayRequest = function(req, res, next) {

    var user = req.user;
    assert(user);

    

    database.addGiveaway(user.id, function(err) {
        if (err) {
            if (err.message === 'NOT_ELIGIBLE') {
                return res.render('account', {
                        user: user,
                        warning: 'You have to wait ' + err.time + ' minutes for your next give away.'
                });
            } else if(err === 'USER_DOES_NOT_EXIST') {
                return res.render('account', {
                        user: user,
                        warning: 'User does not exist.'
                });
            }

            return res.render('account', {
                    user: user,
                    warning: 'Unable to add giveaway: \n' + err
            });
            // return next(new Error('Unable to add giveaway: \n' + err));
        }
        user.eligible = 240;
        user.balance_satoshis += 200;
        return res.redirect('/play?m=received');
    });
};

/**
 * GET
 * Restricted API
 * Shows the account page, the default account page.
 **/
exports.account = function(req, res, next) {
    var user = req.user;
    assert(user);

    var tasks = [
        function(callback) {
            database.getDepositsAmount(user.id, callback);
        },
        function(callback) {
            database.getWithdrawalsAmount(user.id, callback);
        },
        function(callback) {
            database.getGiveAwaysAmount(user.id, callback);
        },
        function(callback) {
            database.getUserNetProfit(user.id, callback);
        }
    ];

    async.parallel(tasks, function(err, ret) {
        if (err)
            return next(new Error('Unable to get account info: \n' + err));

        var deposits = ret[0];
        var withdrawals = 0-ret[1];
        var giveaways = ret[2];
        var net = ret[3];
        user.deposits = !deposits.sum ? 0 : deposits.sum;
        user.withdrawals = !withdrawals.sum ? 0 : withdrawals.sum;
        user.giveaways = !giveaways.sum ? 0 : giveaways.sum;
        user.net_profit = net.profit;
        user.deposit_address = lib.deriveAddress(user.id, 'BTC');
        var page = null;
        if (req.query.p) { //The page requested or last
            page = parseInt(req.query.p);
            if (!Number.isFinite(page) || page < 0)
                return next('Invalid page');
        }

        database.getPublicStats(user.username, function(err, stats) {
            if (err) {
                if (err === 'USER_DOES_NOT_EXIST')
                   return next('User does not exist');
                else
                    return next(new Error('Cant get public stats: \n' + err));
            }

            var resultsPerPage = 50;
            var pages = Math.floor(stats.games_played / resultsPerPage);

            if (page && page >= pages)
                return next('User does not have page ', page);

            // first page absorbs all overflow
            var firstPageResultCount = stats.games_played - ((pages) * resultsPerPage);

            var showing = page ? resultsPerPage : firstPageResultCount;
            var offset = page ? (firstPageResultCount + ((pages - page) * resultsPerPage)) : 0 ;

            if (offset > 100000) {
              return next('Sorry we can\'t show games that far back :( ');
            }

            var tasks = [
                function(callback) {
                    database.getUserNetProfitLast(stats.user_id, showing + offset, callback);
                },
                function(callback) {
                    database.getUserPlays(stats.user_id, showing, offset, callback);
                }
            ];

            async.parallel(tasks, function(err, results) {
                if (err) return next(new Error('Error getting user profit: \n' + err));

                var lastProfit = results[0];

                var netProfitOffset = stats.net_profit - lastProfit;
                var plays = results[1];


                if (!lib.isInt(netProfitOffset))
                  return next(new Error('Internal profit calc error: ' + username + ' does not have an integer net profit offset'));

                assert(plays);

                plays.forEach(function(play) {
                  play.timeago = timeago(play.created);
                });

                var previousPage;
                if (pages > 1) {
                  if (page && page >= 2)
                      previousPage = '?p=' + (page - 1);
                  else if (!page)
                      previousPage = '?p=' + (pages - 1);
                }

                var nextPage;
                if (pages > 1) {
                  if (page && page < (pages-1))
                      nextPage ='?p=' + (page + 1);
                  else if (page && page == pages-1)
                      nextPage = stats.username;
                }

                
                res.render('account', {
                user: user,
                stats: stats,
                plays: plays,
                net_profit_offset: netProfitOffset,
                showing_last: !!page,
                previous_page: previousPage,
                next_page: nextPage,
                games_from: stats.games_played-(offset + showing - 1),
                games_to: stats.games_played-offset,
                pages: {
                    current: page == 0 ? 1 : page + 1 ,
                    total: Math.ceil(stats.games_played / 100)
                }
                });
            });
          });
        });
};

/**
 * POST
 * Restricted API
 * Change the user's password
 **/
exports.resetPassword = function(req, res, next) {
    var user = req.user;
    assert(user);
    var password = lib.removeNullsAndTrim(req.body.old_password);
    var newPassword = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);
    var confirm = lib.removeNullsAndTrim(req.body.confirmation);
    var ipAddress = req.ip;
    var userAgent = req.get('user-agent');

    if (!password) return  res.redirect('/security?err=Enter%20your%20old%20password');

    var notValid = lib.isInvalidPassword(newPassword);
    if (notValid) return res.redirect('/security?err=new%20password%20not%20valid:' + notValid);

    if (newPassword !== confirm) return  res.redirect('/security?err=new%20password%20and%20confirmation%20should%20be%20the%20same.');

    database.validateUser(user.username, password, otp, function(err, userId) {
        if (err) {
            if (err  === 'WRONG_PASSWORD') return  res.redirect('/security?err=wrong password.');
            if (err === 'INVALID_OTP') return res.redirect('/security?err=invalid one-time password.');
            //Should be an user here
            return next(new Error('Unable to reset password: \n' + err));
        }
        assert(userId === user.id);
        database.changeUserPassword(user.id, newPassword, function(err) {
            if (err)
                return next(new Error('Unable to change user password: \n' +  err));

            database.expireSessionsByUserId(user.id, function(err) {
                if (err)
                    return next(new Error('Unable to delete user sessions for userId: ' + user.id + ': \n' + err));

                database.createSession(user.id, ipAddress, userAgent, false, function(err, sessionId) {
                    if (err)
                        return next(new Error('Unable to create session for userid ' + userId +  ':\n' + err));

                    res.cookie('id', sessionId, sessionOptions);
                    res.redirect('/security?m=Password changed');
                });
            });
        });
    });
};

/**
 * POST
 * Restricted API
 * Adds an email to the account
 **/
exports.editEmail = function(req, res, next) {
    var user  = req.user;
    assert(user);

    var email = lib.removeNullsAndTrim(req.body.email);
    var password = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);

    //If no email set to null
    if(email.length === 0) {
        email = null;
    } else {
        var notValid = lib.isInvalidEmail(email);
        if (notValid) return res.redirect('/security?err=email invalid because: ' + notValid);
    }

    notValid = lib.isInvalidPassword(password);
    if (notValid) return res.render('/security?err=password not valid because: ' + notValid);

    database.validateUser(user.username, password, otp, function(err, userId) {
        if (err) {
            if (err === 'WRONG_PASSWORD') return res.redirect('/security?err=wrong%20password');
            if (err === 'INVALID_OTP') return res.redirect('/security?err=invalid%20one-time%20password');
            //Should be an user here
            return next(new Error('Unable to validate user adding email: \n' + err));
        }

        database.updateEmail(userId, email, function(err) {
            if (err)
                return next(new Error('Unable to update email: \n' + err));

            res.redirect('security?m=Email added');
        });
    });
};

/**
 * GET
 * Restricted API
 * Shows the security page of the users account
 **/
exports.security = function(req, res) {
    var user = req.user;
    
    assert(user);

    if (!user.mfa_secret) {
        user.mfa_potential_secret = speakeasy.generate_key({ length: 32 }).base32;
        var qrUri = 'otpauth://totp/bustabit:' + user.username + '?secret=' + user.mfa_potential_secret + '&issuer=bustabit';
        user.qr_svg = qr.imageSync(qrUri, { type: 'svg' });
        user.sig = lib.sign(user.username + '|' + user.mfa_potential_secret);
    }

    res.render('security', {
        user: user
    });
};

/**
 * POST
 * Restricted API
 * Enables the two factor authentication
 **/
exports.enableMfa = function(req, res, next) {
    var user = req.user;
    assert(user);

    var otp = lib.removeNullsAndTrim(req.body.otp);
    var sig = lib.removeNullsAndTrim(req.body.sig);
    var secret = lib.removeNullsAndTrim(req.body.mfa_potential_secret);

    if (user.mfa_secret)
    {
        return res.redirect('/security?err=2FA%20is%20already%20enabled');
    }
    if (!otp)
    {
        return next('Missing otp in enabling mfa');
    }
    if (!sig)
    {
        return next('Missing sig in enabling mfa');
    }
    if (!secret)
    {
        return next('Missing secret in enabling mfa');
    }

    if (!lib.validateSignature(user.username + '|' + secret, sig))
    {
        return next('Could not validate sig');
    }

    var expected = speakeasy.totp({ key: secret, encoding: 'base32' });

    if (otp !== expected) {
        user.mfa_potential_secret = secret;
        var qrUri = 'otpauth://totp/bustabit:' + user.username + '?secret=' + secret + '&issuer=bustabit';
        user.qr_svg = qr.imageSync(qrUri, {type: 'svg'});
        user.sig = sig;

        

        return res.render('security', {
                user: user,
                warning: 'Invalid 2FA token'
        });
    }

    database.updateMfa(user.id, secret, function(err) {
        if (err)
        {
            return next(new Error('Unable to update 2FA status: \n' + err));
        }
        res.redirect('/security?=m=Two-Factor%20Authentication%20Enabled');
    });
};

/**
 * POST
 * Restricted API
 * Disables the two factor authentication
 **/
exports.disableMfa = function(req, res, next) {
    var user = req.user;
    assert(user);

    var secret = lib.removeNullsAndTrim(user.mfa_secret);
    var otp = lib.removeNullsAndTrim(req.body.otp);

    if (!secret) return res.redirect('/security?err=Did%20not%20sent%20mfa%20secret');
    if (!user.mfa_secret) return res.redirect('/security?err=2FA%20is%20not%20enabled');
    if (!otp) return res.redirect('/security?err=No%20OTP');

    var expected = speakeasy.totp({ key: secret, encoding: 'base32' });

    if (otp !== expected)
        return res.redirect('/security?err=invalid%20one-time%20password');

    database.updateMfa(user.id, null, function(err) {
        if (err) return next(new Error('Error updating Mfa: \n' + err));

        res.redirect('/security?=m=Two-Factor%20Authentication%20Disabled');
    });
};

/**
 * POST
 * Public API
 * Send password recovery to an user if possible
 **/
exports.sendPasswordRecover = function(req, res, next) {
    var email = lib.removeNullsAndTrim(req.body.email);
    if (!email) return res.redirect('forgot-password');
    var remoteIpAddress = req.ip;

    //We don't want to leak if the email has users, so we send this message even if there are no users from that email
    
    var messageSent = {
        success: 'We\'ve sent an email to you if there is a recovery email.'
    };


    database.getUsersFromEmail(email, function(err, users) {
        if(err) {
            if(err === 'NO_USERS')
                return res.render('forgot-password', messageSent);
            else
                return next(new Error('Unable to get users by email ' + email +  ': \n' + err));
        }

        var recoveryList = []; //An array of pairs [username, recoveryId]
        async.each(users, function(user, callback) {

            database.addRecoverId(user.id, remoteIpAddress, function(err, recoveryId) {
                if(err)
                    return callback(err);

                recoveryList.push([user.username, recoveryId]);
                callback(); //async success
            })

        }, function(err) {
            if(err)
                return next(new Error('Unable to add recovery id :\n' + err));

            sendEmail.passwordReset(email, recoveryList, function(err) {
                if(err)
                    return next(new Error('Unable to send password email: \n' + err));

                return res.render('forgot-password',  messageSent);
            });
        });

    });
};

/**
 * GET
 * Public API
 * Validate if the reset id is valid or is has not being uses, does not alters the recovery state
 * Renders the change password
 **/
exports.validateResetPassword = function(req, res, next) {
    var recoverId = req.params.recoverId;
    if (!recoverId || !lib.isUUIDv4(recoverId))
        return next('Invalid recovery id');

    
    database.getUserByValidRecoverId(recoverId, function(err, user) {
        if (err) {
            if (err === 'NOT_VALID_RECOVER_ID')
                return next('Invalid recovery id');
            return next(new Error('Unable to get user by recover id ' + recoverId + '\n' + err));
        }
        res.render('reset-password', {
            user: user,
            recoverId: recoverId
        });
    });
};

/**
 * POST
 * Public API
 * Receives the new password for the recovery and change it
 **/
exports.resetPasswordRecovery = function(req, res, next) {
    var recoverId = req.body.recover_id;
    var password = lib.removeNullsAndTrim(req.body.password);
    var ipAddress = req.ip;
    var userAgent = req.get('user-agent');
    

    if (!recoverId || !lib.isUUIDv4(recoverId)) return next('Invalid recovery id');

    var notValid = lib.isInvalidPassword(password);
    if (notValid)
        return res.render('reset-password', {
            recoverId: recoverId,
            warning: 'password not valid because: ' + notValid
        });

    database.changePasswordFromRecoverId(recoverId, password, function(err, user) {
        if (err) {
            if (err === 'NOT_VALID_RECOVER_ID')
                return next('Invalid recovery id');
            return next(new Error('Unable to change password for recoverId ' + recoverId + ', password: ' + password + '\n' + err));
        }
        database.createSession(user.id, ipAddress, userAgent, false, function(err, sessionId) {
            if (err)
                return next(new Error('Unable to create session for password from recover id: \n' + err));

            res.cookie('id', sessionId, sessionOptions);
            res.redirect('/');
        });
    });
};

/**
 * GET
 * Restricted API
 * Shows the deposit history
 **/
exports.deposit = function(req, res, next) {
    var user = req.user;
    assert(user);

    database.getDeposits(user.id, function(err, deposits)
    {
        if (err) {
            return next(new Error('Unable to get deposits: \n' + err));
        }
        user.deposits = deposits;
        user.deposit_address = {};
        user.deposit_address['BTC'] = lib.deriveAddress(user.id, 'BTC');

        database.LoadDepositSrc(function(err, result){
            if (err) return next(new Error('Unable to get deposit information from database: \n' + err));
            user.deposit_address['ETH'] = result.addr;

            database.getETHvsBTCRate(function (err, rate)
            {
                if (err)
                {
                    return next(new Error('Unable to get ETH / BTC : \n' + err));
                }

                user.ETHvsBTCRate = rate;
                
                res.render('deposit', { 
                    user:  user
                });
            })
        })
    });
};

/**
 * GET
 * Restricted API
 * Shows the withdrawal history
 **/
exports.withdraw = function(req, res, next) {
    var user = req.user;
    assert(user);

    database.getWithdrawals(user.id, function(err, withdrawals) {
        if (err)
            return next(new Error('Unable to get withdrawals: \n' + err));

        withdrawals.forEach(function(withdrawal) {
            withdrawal.shortDestination = withdrawal.destination.substring(0,8);
            withdrawal.fee = withdrawal.fee /1e8;
        });
        user.withdrawals = withdrawals;

        database.getETHvsBTCRate(function (err, result)
        {
            if (err)
            {
                return next(new Error('Unable to get ETHvsBTCRate : \n' + err));
            }

            user.ETHvsBTCRate = result;
            res.render('withdraw', {
                user: user,
                id: uuid.v4()
            });
        })
    });
};

/**
 * POST
 * Restricted API
 * Process a withdrawal
 **/
exports.handleWithdrawRequest = function(req, res, next) {

    var user = req.user;
    assert(user);

    database.getETHvsBTCRate(function (error, result){
        if (error)
            return res.render('withdraw', {
                user: user,
                id: uuid.v4(),
                warning: 'Cannot get the ETH / BTC rate'
            });
        user.ETHvsBTCRate = result;

        database.getWithdrawals(user.id, function(err, withdrawals)
        {
            if (err)
                return next(new Error('Unable to get withdrawals: \n' + err));

            withdrawals.forEach(function(withdrawal) {
                withdrawal.shortDestination = withdrawal.destination.substring(0,8);
                withdrawal.fee = withdrawal.fee / 1e8;
            });
            user.withdrawals = withdrawals;

            var amount_bit = req.body.amount_bit;
            var amount_eth = req.body.amount_eth;
            var cointype = req.body.cointype;
            var destination = req.body.destination;
            var withdrawalId = req.body.withdrawal_id;
            var password = lib.removeNullsAndTrim(req.body.password);
            var otp = lib.removeNullsAndTrim(req.body.otp);
            var fee = lib.removeNullsAndTrim(req.body.fee);
            var all = lib.removeNullsAndTrim(req.body.all);

            var r =  /^[1-9]\d*(\.\d{0,2})?$/;

            if (!r.test(amount_bit))
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Not a valid amount.'
                });

            amount_bit = Math.round(parseFloat(amount_bit) * 100);
            fee = Math.round(parseFloat(fee) * 100);
            all = Math.round(parseFloat(all) * 100);
            assert(Number.isFinite(amount_bit));

            var minWithdraw = config.MINING_FEE + 10000;

            if (amount_bit < minWithdraw)
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'You must withdraw ' + minWithdraw + ' or more.'
                });

            if (typeof destination !== 'string')
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Destination address not provided.'
                });

            if (destination == '')
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Destination address not provided.'
                });

            if (cointype === 'BTC')
            {
                if (destination.length != 34)
                {
                    return res.render('withdraw', {
                        user: user,
                        id: uuid.v4(),
                        warning: 'Not a valid BTC address.'
                    });
                }
            }
            else if (cointype === 'ETH')
            {
                if (destination.length != 42)
                {
                    return res.render('withdraw', {
                        user: user,  id: uuid.v4(),
                        warning: 'Not a valid ETH address.'
                    });
                }
            }
            else
            {
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Not a valid address.'
                });
            }

            try {
                if (cointype=='BTC'){
                    var version = bitcoinjs.Address.fromBase58Check(destination).version;
                    if (process.env.TESTNET == 1)
                    {// testnet
                        if (version !== bitcoinjs.networks.testnet.pubKeyHash && version !== bitcoinjs.networks.testnet.scriptHash)
                        {
                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                warning: 'Destination address is not a testnet one.'
                            });
                        }
                    }
                    else
                    {// mainnet
                        if (version !== bitcoinjs.networks.bitcoin.pubKeyHash && version !== bitcoinjs.networks.bitcoin.scriptHash)
                        {
                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                warning: 'Destination address is not a bitcoin one.'
                            });
                        }
                    }
                } else if (cointype=='ETH') {

                }
            } catch(ex) {
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Not a valid destination address.'
                });
            }

            if (!password)
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Must enter a password.'
                });

            if(!lib.isUUIDv4(withdrawalId))
                return res.render('withdraw', {
                    user: user,
                    id: uuid.v4(),
                    warning: 'Could not find a one-time token.'
                });

            database.validateUser(user.username, password, otp, function(err)
            {
                if (err) {
                    if (err === 'WRONG_PASSWORD')
                        return res.render('withdraw', {
                            user: user,
                            id: uuid.v4(),
                            warning: 'Wrong password, try it again.'
                        });
                    if (err === 'INVALID_OTP')
                        return res.render('withdraw', {
                            user: user,
                            id: uuid.v4(),
                            warning: 'Invalid one-time token.'
                        });
                    //Should be an user
                    return next(new Error('Unable to validate user handling withdrawal: \n' + err + "."));
                }

                withdraw(req.user.id, amount_bit, destination, withdrawalId, amount_eth, cointype, fee, all, function(err)
                {
                    if (err) {
                        if (err === 'NOT_ENOUGH_MONEY')
                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                warning: 'Not enough money to process withdraw.'
                            });
                        else if(err === 'SAME_WITHDRAWAL_ID')
                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                warning: 'Please reload your page, it looks like you tried to make the same transaction twice.'
                            });
                        else if(err === 'NO_DEPOSIT')
                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                warning: 'Please deposit first.'
                            });
                        else if(err === 'NOT_ENOUGH_DEPOSIT')
                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                warning: 'Please deposit more than 50bits.'
                            });
                        else
                            return next(new Error('Unable to withdraw: ' + err + "."));
                    }

                    // get new withdrawal transactions
                    database.getWithdrawals(user.id, function(err_w, withdrawals)
                    {
                        if (err_w)
                            return next(new Error('Unable to get withdrawals: \n' + err_w));

                        withdrawals.forEach(function (withdrawal) {
                            withdrawal.shortDestination = withdrawal.destination.substring(0, 8);
                            withdrawal.fee = withdrawal.fee / 1e8;
                        });
                        user.withdrawals = withdrawals;

                        database.getETHvsBTCRate(function (err_eb, result)
                        {
                            if (err_eb)
                            {
                                return next(new Error('Unable to get ETHvsBTCRate : \n' + err));
                            }

                            user.ETHvsBTCRate = result;

                            if (err_eb === 'PENDING')
                                return res.render('withdraw', {
                                    user: user,
                                    id: uuid.v4(),
                                    success: 'Withdrawal successful, however hot wallet was empty. Withdrawal will be reviewed and sent ASAP.'
                                });
                            else if(err_eb === 'FUNDING_QUEUED')
                                return res.render('withdraw', {
                                    user: user,
                                    id: uuid.v4(),
                                    success: 'Your transaction is being processed come back later to see the status.'
                                });

                            return res.render('withdraw', {
                                user: user,
                                id: uuid.v4(),
                                success: 'Your request has been successfully processed. Please check your account.'
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * GET
 * Restricted API
 * Shows the withdrawal request page
 **/
exports.withdrawRequest = function(req, res) {
    assert(req.user);
    database.getETHvsBTCRate(function (err, result)
    {
        if (err)
        {
            return next(new Error('Unable to get ETHvsBTCRate : \n' + err));
        }

        user.ETHvsBTCRate = result;
        res.render('withdraw', {
            user: req.user,
            id: uuid.v4(),
            warning: 'withdrawRequest'
        });
    })
};

/**
 * GET
 * Restricted API
 * Shows the support page
 **/
exports.support = function(req, res) {
    
    assert(req.user);
    res.render('support', {
        user: req.user
    })
};

/**
 * POST
 * Restricted API
 * process the support page
 **/
exports.saveSupport = function(req, res, next) {

    assert(req.user);
    var user = req.user;
    var email = req.body.email;
    var message_to_admin = req.body.message;
    
    
    database.saveSupport(user.id, email, message_to_admin, function(err, result, callback){
        if (err) {
            return res.render('support', {
                user: user,
                error: err
            });
        }
        return res.render('support', {
            user: user,
            success: 'Succesfully sent the message to the support center.'
        });
    });
};

exports.uploadAvatar = function(req, res) {
    var user = req.user;
    assert(user);

    var upload_path = __dirname + '/../upload/' + req.files.avatar.name;
    var result_path = __dirname + '/../theme/img/photos/'+ user.username +'.jpg';
    if (config.PRODUCTION) {
        result_path = __dirname + '/../build/img/photos/'+ user.username +'.jpg';
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let sampleFile = req.files.avatar;

    // Use the mv() method to place the file somewhere on your server
    sampleFile.mv(upload_path, function(err) {
        if (err)
            return res.status(500).send(err);
    });

    Jimp.read(upload_path, function(err, results) {
        if (err) throw err;
        else {
         results.resize(200, 200)
                .quality(60)
                .write(result_path);

         res.redirect('/security');
        };
    });
};

exports.getBalanceSatoshis = function(req, res) {
    var user = req.user;
    assert(user);
    var username = user.username;
    database.getUserFromUsername(username, function(err, userInfo) {
      var balance_satoshis_format = formatSatoshis(userInfo.balance_satoshis);
      res.send(balance_satoshis_format);
    });
}

function formatSatoshis(n, decimals) {
    return formatDecimals(n/100, decimals);
}

function formatDecimals (n, decimals) {
    if (typeof decimals === 'undefined') {
        if (n % 100 === 0)
            decimals = 0;
        else
            decimals = 2;
    }
    return n.toFixed(decimals).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

/**
 * GET
 * Restricted API
 * Home page
 **/
exports.index = function(req, res) {
    
    var user = req.user;
    var strEngineHost = lib.getEngineHost();

    if (!user){
        return res.render('index', {
            enginehost: strEngineHost
        });
    }

    return res.render('index', {
        user: user,
        enginehost: strEngineHost
    });
}

/**
 * GET
 * Restricted API
 * FAQ page
 **/
exports.faq = function(req, res) {
    
    var user = req.user;
    var strEngineHost = lib.getEngineHost();

    if (!user){
        return res.render('faq', {
            enginehost: strEngineHost
        });
    }

    return res.render('faq', {
        user: user,
        enginehost: strEngineHost
    });
}



/**
 * GET
 * Restricted API
 * Shows the transfer history
 **/
exports.transfer = function(req, res, next) {
    var user = req.user;
    assert(user);

    var success = (req.query.m === 'success') ? 'Transfer has been made' : undefined;


    database.getTransfers(user.id, function(err, transfers)
    {
        if (err)
            return next(new Error('Unable to get transfers: ' + err));
        

        database.getTipFee(function (err, tipfee)
        {
            if (err)
            {
                return next(new Error('Unable to get tip fee : ' + err));
            }

            res.render('transfer', {
                user: user,
                id: uuid.v4(),
                transfers: transfers,
                tipfee:tipfee,
                success: success
            });
        })
    });
};

exports.transferJson = function(req, res, next) {
    var user = req.user;
    assert(user);


    database.getTransfers(user.id, function(err, transfers) {
        if (err)
            return next(new Error('Unable to get transfers: ' + err));

        res.json(transfers);
    });
};

/**
 * GET
 * Restricted API
 * Shows the transfer request page
 **/

exports.transferRequest = function(req, res) {
    
    assert(req.user);
    database.getTipFee(function (err, tipfee)
    {
        if (err)
        {
            return res.render('transfer', {
                user: req.user,
                id: uuid.v4(),
                tipfee:'0.1',
                warning:"Can't get tip fee."
            });
        }

        res.render('transfer', {
            user: req.user,
            id: uuid.v4(),
            tipfee:tipfee
        });
    });
};

/**
 * POST
 * Restricted API
 * save customer message
 **/

exports.contactus = function(req, res) {

    var customer_user = req.body.customer_name;
    var customer_email = req.body.customer_email;
    var customer_message = req.body.customer_message;
   
    var strEngineHost = lib.getEngineHost();

    var today = new Date();
    var news_pub_date = today;

    database.createContactUS(customer_user, customer_email, customer_message, news_pub_date, function(err, newslists){


        if(err){
            res.redirect('/error');
        }else{
            res.redirect("/");            
        }
    });
}
/**
 * POST
 * Restricted API
 * Process a transfer (tip)
 **/

exports.handleTransferRequest = function (req,res,next){
    var user = req.user;
    assert(user);
    var uid = req.body['transfer-id'];
    var amount = lib.removeNullsAndTrim(req.body.amount);
    var toUserName = lib.removeNullsAndTrim(req.body['to-user']);
    var password = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);
    var fee = lib.removeNullsAndTrim(req.body.fee);
    var all = lib.removeNullsAndTrim(req.body.all);
    var r =  /^[1-9]\d*(\.\d{0,2})?$/;
    

    database.getTipFee(function (err, tipfee)
    {
        if (!r.test(amount))
            return res.render('transfer', {
                user: user,
                id: uuid.v4(),
                warning: 'Not a valid amount',
                tipfee:tipfee
            });

        amount = Math.round(parseFloat(amount) * 100);
        fee = Math.round(parseFloat(fee) * 100);
        all = Math.round(parseFloat(all) * 100);

        if (amount < 10000)
            return res.render('transfer', {
                user: user,
                id: uuid.v4(),
                tipfee:tipfee,
                warning: 'Must transfer at least 100 rips'
            });

        if (!password)
            return res.render('transfer', {
                user: user,
                id: uuid.v4(),
                tipfee:tipfee,
                warning: 'Must enter a password'
            });

        if (user.username.toLowerCase() === toUserName.toLowerCase()) {
            return res.render('transfer', {
                user: user,
                id: uuid.v4(),
                tipfee:tipfee,
                warning: 'Can\'t send money to yourself'
            });
        }

        database.validateUser(user.username, password, otp, function(err) {

            if (err) {
                if (err === 'WRONG_PASSWORD')
                    return res.render('transfer', {
                        user: user,
                        id: uuid.v4(),
                        tipfee:tipfee,
                        warning: 'wrong password, try it again...'
                    });
                if (err === 'INVALID_OTP')
                    return res.render('transfer', {
                        user: user,
                        id: uuid.v4(),
                        tipfee:tipfee,
                        warning: 'invalid one-time token'
                    });
                //Should be an user
                return next(new Error('Unable to validate user handling transfer: ' + err));
            }
            // Check destination user

            database.makeTransfer(uid, user.id, toUserName, amount, fee, all, function (err) {
                if (err) {
                    if (err === 'NOT_ENOUGH_BALANCE')
                        return res.render('transfer', {
                            user: user,
                            id: uuid.v4(),
                            tipfee:tipfee,
                            warning: 'Not enough balance for transfer'
                        });
                    if (err === 'USER_NOT_EXIST')
                        return res.render('transfer', {
                            user: user,
                            id: uuid.v4(),
                            tipfee: tipfee,
                            warning: 'Could not find user'
                        });
                    if (err === 'TRANSFER_ALREADY_MADE')
                        return res.render('transfer', {
                            user: user,
                            id: uuid.v4(),
                            tipfee:tipfee,
                            warning: 'You already submitted this'
                        });

                    console.error('[INTERNAL_ERROR] could not make transfer: ', err);
                    return res.render('transfer', {
                        user: user,
                        id: uuid.v4(),
                        tipfee:tipfee,
                        warning: 'Could not make transfer'
                    });
                }

                return res.redirect('/transfer?m=success');
            });
        });
    });
};

exports.depositSrc = function(req, res, next) {
    var user = req.user;
    var eth_src = req.body.eth_src;
    

    console.log('The deposit address of username ', user.username, ' is saved as ', eth_src);
    database.saveDepositSrc(user.id, eth_src, function(err){
        if (err) console.log(err);
    });

    database.getDeposits(user.id, function(err, deposits)
    {
        if (err) {
            return next(new Error('Unable to get deposits: \n' + err));
        }
        user.deposits = deposits;
        user.deposit_address = {};
        user.deposit_address['BTC'] = lib.deriveAddress(user.id, 'BTC');
        user.deposit_address['ETH'] = lib.deriveAddress(user.id, 'ETH');

        database.getETHvsBTCRate(function (err, result)
        {
            if (err)
            {
                return next(new Error('Unable to get ETH / BTC : \n' + err));
            }

            user.ETHvsBTCRate = result;
            // res.render('deposit', { user:  user });
            return res.render('deposit', {
                user: user,
                deposit_src: eth_src
            });
        })
    });
};
