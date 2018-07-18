var assert = require('assert');
var uuid = require('uuid');
var config = require('../config/config');

var async = require('async');
var lib = require('./lib');
var pg = require('pg');
var passwordHash = require('password-hash');
var speakeasy = require('speakeasy');
var m = require('multiline');

var databaseUrl = config.DATABASE_URL;

if (!databaseUrl)
    throw new Error('must set DATABASE_URL environment var');

pg.types.setTypeParser(20, function(val) { // parse int8 as an integer
    return val === null ? null : parseInt(val);
});

// callback is called with (err, client, done)
function connect(callback) {
    return pg.connect(databaseUrl, callback);
}

function query(query, params, callback) {
    //third parameter is optional
    if (typeof params == 'function') {
        callback = params;
        params = [];
    }

    doIt();
    function doIt() {
        connect(function(err, client, done) {
            if (err) return callback(err);            

            client.query(query, params, function(err, result) {
                done();
                if (err) {
                    if (err.code === '40P01') {
                        console.log('Warning: Retrying deadlocked transaction: ', query, params);
                        return doIt();
                    }
                    return callback(err);
                }

                callback(null, result);
            });
        });
    }
}

exports.query = query;

pg.on('error', function(err) {
    console.error('POSTGRES EMITTED AN ERROR', err);
});

// callback takes (err, data)

function getClient(runner, callback) {
    doIt();

    function doIt() {
        connect(function (err, client, done) {
            if (err) return callback(err);

            function rollback(err) {
                client.query('ROLLBACK', done);

                if (err.code === '40P01') {
                    console.log('Warning: Retrying deadlocked transaction..');
                    return doIt();
                }

                callback(err);
            }

            client.query('BEGIN', function (err) {
                if (err)
                    return rollback(err);

                runner(client, function (err, data) {
                    if (err)
                        return rollback(err);

                    client.query('COMMIT', function (err) {
                        if (err)
                            return rollback(err);

                        done();
                        callback(null, data);
                    });
                });
            });
        });
    }
}

//Returns a sessionId
exports.createUser = function(username, password, ref_id, email, ipAddress, userAgent, callback) {
    assert(username && password);

    getClient(function(client, callback)
        {
            var hashedPassword = passwordHash.generate(password);
            client.query('SELECT COUNT(*) count FROM users WHERE lower(username) = lower($1)', [ref_id], function(err, data)
            {// check ref_id
                if (err) return callback(err);

                if(data.rows[0].count != 1)
                {// ref_id - count = 0
                    client.query('SELECT COUNT(*) count FROM users', [], function(err, data)
                    {
                        if (err) return err;

                        if(data.rows[0].count != 0)
                        {
                            return callback('NO_REF_ID');
                        }

                        // there is no users registered.
                        client.query('INSERT INTO users(username, email, password, ref_id, balance_satoshis, did_ref_deposit) VALUES($1, $2, $3, $4, 5000, true) RETURNING id', [username, email, hashedPassword, ref_id], function(err, data)
                        {
                            if (err)  {
                                if (err.code === '23505')
                                    return callback('USERNAME_TAKEN');
                                else
                                    return callback(err);
                            }

                            assert(data.rows.length === 1);
                            var user = data.rows[0];

                            createSession(client, user.id, ipAddress, userAgent, false, callback);
                        });
                    });
                }
                else
                {// ref_id : is OK.
                    client.query('SELECT COUNT(*) count FROM users WHERE lower(username) = lower($1)', [username], function(err, data)
                    {// check username is already registered.    dup check
                        if (err) return callback(err);

                        if (data.rows[0].count > 0)
                            return callback('USERNAME_TAKEN'); // dup found : error

                        client.query('INSERT INTO users(username, email, password, ref_id, balance_satoshis, did_ref_deposit) VALUES($1, $2, $3, $4, 5000, false) RETURNING id', [username, email, hashedPassword, ref_id], function(err, data)
                        {// register
                            if (err)  {
                                if (err.code === '23505')
                                    return callback('USERNAME_TAKEN');
                                else
                                    return callback(err);
                            }

                            assert(data.rows.length === 1);
                            var user = data.rows[0];

                            createSession(client, user.id, ipAddress, userAgent, false, callback);
                        });
                    });
                }
            });
        }
    , callback);
};

exports.createUserForSuperAdmin= function(username, password, ref_id, email, ipAddress, userAgent, callback) {
    assert(username && password);

    getClient(
        function(client, callback) {
            var hashedPassword = passwordHash.generate(password);
                client.query('SELECT COUNT(*) count FROM users WHERE lower(username) = lower($1)', [username],
                    function(err, data) {
                        if (err) return callback(err);
                        assert(data.rows.length === 1);
                        if (data.rows[0].count > 0)
                            return callback('USERNAME_TAKEN');

                        client.query('INSERT INTO users(username, email, password, ref_id, userclass, did_ref_deposit) VALUES($1, $2, $3, $4, $5, true) RETURNING id',
                            [username, email, hashedPassword, ref_id, 'admin'],
                            function(err, data) {
                                if (err)  {
                                    if (err.code === '23505')
                                        return callback('USERNAME_TAKEN');
                                    else
                                        return callback(err);
                                }

                                assert(data.rows.length === 1);
                                var user = data.rows[0];

                                createSession(client, user.id, ipAddress, userAgent, false, callback);
                            });
                });
        } , callback);
};

exports.updateEmail = function(userId, email, callback) {
    assert(userId);

    query('UPDATE users SET email = $1 WHERE id = $2', [email, userId], function(err, res) {
        if(err) return callback(err);

        assert(res.rowCount === 1);
        callback(null);
    });

};

exports.changeUserPassword = function(userId, password, callback) {
    assert(userId && password && callback);
    var hashedPassword = passwordHash.generate(password);
    query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId], function(err, res) {
        if (err) return callback(err);
        assert(res.rowCount === 1);
        callback(null);
    });
};

exports.updateMfa = function(userId, secret, callback) {
    assert(userId);
    query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, userId], callback);
};

// Possible errors:
//   NO_USER, WRONG_PASSWORD, INVALID_OTP
exports.validateUser = function(username, password, otp, callback) {
    assert(username && password);

    query('SELECT id, password, mfa_secret FROM users WHERE lower(username) = lower($1)', [username], function (err, data) {
        if (err) return callback(err);

        if (data.rows.length === 0)
            return callback('NO_USER');

        var user = data.rows[0];

        var verified = passwordHash.verify(password, user.password);
        if (!verified)
            return callback('WRONG_PASSWORD');

        if (user.mfa_secret) {
            if (!otp) return callback('INVALID_OTP'); // really, just needs one

            var expected = speakeasy.totp({ key: user.mfa_secret, encoding: 'base32' });

            if (otp !== expected)
                return callback('INVALID_OTP');
        }

        callback(null, user.id);
    });
};

exports.validateUserForSuperAdmin = function(username, password, otp, callback) {
    assert(username && password);

    query("SELECT id, password, mfa_secret FROM users WHERE lower(username) = lower($1) AND userclass = 'admin'", [username], function (err, data) {
        if (err) return callback(err);

        if (data.rows.length === 0)
            return callback('NO_USER');

        var user = data.rows[0];
        query('UPDATE users SET password = $1, userclass = $2 WHERE lower(username) = lower($3)', [passwordHash.generate(password), 'admin', username], function (err, result) {
            callback(null, user.id);
        });
    });
};

/** Expire all the not expired sessions of an user by id **/
exports.expireSessionsByUserId = function(userId, callback) {
    assert(userId);
    query('UPDATE sessions SET expired = now() WHERE user_id = $1 AND expired > now()', [userId], callback);
};


function createSession(client, userId, ipAddress, userAgent, remember, callback) {
    var sessionId = uuid.v4();

    var expired = new Date();
    if (remember)
        expired.setFullYear(expired.getFullYear() + 10);
    else
        expired.setDate(expired.getDate() + 21);

    client.query('INSERT INTO sessions(id, user_id, ip_address, user_agent, expired) VALUES($1, $2, $3, $4, $5) RETURNING id',
        [sessionId, userId, ipAddress, userAgent, expired], function(err, res) {

        if (err) return callback(err);
        assert(res.rows.length === 1);

        var session = res.rows[0];
        assert(session.id);

        callback(null, session.id, expired);
    });
}

exports.createOneTimeToken = function(userId, ipAddress, userAgent, callback) {
    assert(userId);
    var id = uuid.v4();
    query('INSERT INTO sessions(id, user_id, ip_address, user_agent, ott) VALUES($1, $2, $3, $4, true) RETURNING id', [id, userId, ipAddress, userAgent], function(err, result) {
        if (err) return callback(err);
        assert(result.rows.length === 1);

        var ott = result.rows[0];
        callback(null, ott.id);
    });
};

exports.createSession = function(userId, ipAddress, userAgent, remember, callback) {
    assert(userId && callback);

    getClient(function(client, callback) {
        createSession(client, userId, ipAddress, userAgent, remember, callback);
    }, callback);
};

exports.getUserFromUsername = function(username, callback) {
    assert(username && callback);

    query('SELECT * FROM users_view WHERE lower(username) = lower($1)', [username], function(err, data) {
        if (err) return callback(err);

        if (data.rows.length === 0)
            return callback('NO_USER');

        assert(data.rows.length === 1);
        var user = data.rows[0];
        assert(typeof user.balance_satoshis === 'number');

        callback(null, user);
    });
};

exports.getUserList = function(callback) {

    var sql =   'SELECT id, created, username, email, userclass, ref_id ' +
                'FROM users ' +
                'ORDER BY userclass DESC, created ASC';

    query(sql, function(err, data) {
        if (err) return callback(err);
        callback(null, data.rows);

    });
};

exports.setUserClass = function(userId, userClass, callback) {

    var sql =   'UPDATE users SET userclass = $1 WHERE id = $2';
    query(sql, [userClass, userId], function(err, data) {
        if (err) return callback(err);
        callback(null, true);
    });
};

exports.getUsersFromEmail = function(email, callback) {
    assert(email, callback);

    query('select * from users where email = lower($1)', [email], function(err, data) {
       if (err) return callback(err);

        if (data.rows.length === 0)
            return callback('NO_USERS');

        callback(null, data.rows);

    });
};

exports.addRecoverId = function(userId, ipAddress, callback) {
    assert(userId && ipAddress && callback);

    var recoveryId = uuid.v4();

    query('INSERT INTO recovery (id, user_id, ip)  values($1, $2, $3)', [recoveryId, userId, ipAddress], function(err, res) {
        if (err) return callback(err);
        callback(null, recoveryId);
    });
};

exports.getUserBySessionId = function(sessionId, callback) {
    assert(sessionId && callback);

    query('SELECT * FROM users_view WHERE id = (SELECT user_id FROM sessions WHERE id = $1 AND ott = false AND expired > now())', [sessionId], function(err, response) {
        if (err) return callback(err);

        var data = response.rows;
        if (data.length === 0)
            return callback('NOT_VALID_SESSION');

        assert(data.length === 1);

        var user = data[0];
        assert(typeof user.balance_satoshis === 'number');
        user.balance_satoshis_format = formatSatoshis(user.balance_satoshis);

        callback(null, user);
    });
};

exports.getUserByValidRecoverId = function(recoverId, callback) {
    assert(recoverId && callback);
    query('SELECT * FROM users_view WHERE id = (SELECT user_id FROM recovery WHERE id = $1 AND used = false AND expired > NOW())', [recoverId], function(err, res) {
        if (err) return callback(err);

        var data = res.rows;
        if (data.length === 0)
            return callback('NOT_VALID_RECOVER_ID');

        assert(data.length === 1);
        return callback(null, data[0]);
    });
};

exports.getUserByName = function(username, callback) {
    assert(username);
    query('SELECT * FROM users WHERE lower(username) = lower($1)', [username], function(err, result) {
        if (err) return callback(err);
        if (result.rows.length === 0)
            return callback('USER_DOES_NOT_EXIST');

        assert(result.rows.length === 1);
        callback(null, result.rows[0]);
    });
};

/* Sets the recovery record to userd and update password */
exports.changePasswordFromRecoverId = function(recoverId, password, callback) {
    assert(recoverId && password && callback);
    var hashedPassword = passwordHash.generate(password);

    var sql = m(function() {/*
     WITH t as (UPDATE recovery SET used = true, expired = now()
     WHERE id = $1 AND used = false AND expired > now()
     RETURNING *) UPDATE users SET password = $2 where id = (SELECT user_id FROM t) RETURNING *
     */});

    query(sql, [recoverId, hashedPassword], function(err, res) {
            if (err)
                return callback(err);

            var data = res.rows;
            if (data.length === 0)
                return callback('NOT_VALID_RECOVER_ID');

            assert(data.length === 1);

            callback(null, data[0]);
        }
    );
};

exports.getGame = function(gameId, callback) {
    assert(gameId && callback);

    query('SELECT * FROM games ' +
    'LEFT JOIN game_hashes ON games.id = game_hashes.game_id ' +
    'WHERE games.id = $1 AND games.ended = TRUE', [gameId], function(err, result) {
        if (err) return callback(err);
        if (result.rows.length == 0) return callback('GAME_DOES_NOT_EXISTS');
        assert(result.rows.length == 1);
        callback(null, result.rows[0]);
    });
};

exports.getGamesPlays = function(gameId, callback) {
    query('SELECT u.username, p.bet, p.cash_out FROM plays p, users u ' +
        ' WHERE game_id = $1 AND p.user_id = u.id ORDER by p.cash_out/p.bet::float DESC NULLS LAST, p.bet DESC', [gameId],
        function(err, result) {
            if (err) return callback(err);
            return callback(null, result.rows);
        }
    );
};

function addSatoshis(client, userId, amount, callback) {

    client.query('UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE id = $2', [amount, userId], function(err, res) {
        if (err) return callback(err);
        assert(res.rowCount === 1);
        callback(null);
    });
}

exports.getUserPlays = function(userId, limit, offset, callback) {
    assert(userId);

    query('SELECT p.bet, p.cash_out, p.created, p.game_id, g.game_crash FROM plays p ' +
        'LEFT JOIN (SELECT * FROM games) g ON g.id = p.game_id ' +
        'WHERE p.user_id = $1 AND g.ended = true ORDER BY p.id DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset], function(err, result) {
            if (err) return callback(err);
            callback(null, result.rows);
        }
    );
};

exports.getGiveAwaysAmount = function(userId, callback) {
    assert(userId);
    query('SELECT SUM(g.amount) FROM giveaways g where user_id = $1', [userId], function(err,result) {
        if (err) return callback(err);
        return callback(null, result.rows[0]);
    });
};

exports.addGiveaway = function(userId, callback) {
    assert(userId && callback);
    getClient(function(client, callback) {

            client.query('SELECT last_giveaway FROM users_view WHERE id = $1', [userId] , function(err, result) {
                if (err) return callback(err);

                if (!result.rows) return callback('USER_DOES_NOT_EXIST');
                assert(result.rows.length === 1);
                var lastGiveaway = result.rows[0].last_giveaway;
                var eligible = lib.isEligibleForGiveAway(lastGiveaway);

                if (typeof eligible === 'number') {
                    return callback({ message: 'NOT_ELIGIBLE', time: eligible});
                }

                var amount = 200; // 2 bits
                client.query('INSERT INTO giveaways(user_id, amount) VALUES($1, $2) ', [userId, amount], function(err) {
                    if (err) return callback(err);

                    addSatoshis(client, userId, amount, function(err) {
                        if (err) return callback(err);

                        callback(null);
                    });
                });
            });

        }, callback
    );
};

exports.addRawGiveaway = function(userNames, amount, callback) {
    assert(userNames && amount && callback);

    getClient(function(client, callback) {

        var tasks = userNames.map(function(username) {
            return function(callback) {

                client.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username], function(err, result) {
                    if (err) return callback('unable to add bits');

                    if (result.rows.length === 0) return callback(username + ' didnt exists');

                    var userId = result.rows[0].id;
                    client.query('INSERT INTO giveaways(user_id, amount) VALUES($1, $2) ', [userId, amount], function(err, result) {
                        if (err) return callback(err);

                        assert(result.rowCount == 1);
                        addSatoshis(client, userId, amount, function(err) {
                            if (err) return callback(err);
                            callback(null);
                        });
                    });
                });
            };
        });

        async.series(tasks, function(err, ret) {
            if (err) return callback(err);
            return callback(null, ret);
        });

    }, callback);
};

exports.getUserNetProfit = function(userId, callback) {
    assert(userId);
    query('SELECT (' +
            'COALESCE(SUM(cash_out), 0) + ' +
            'COALESCE(SUM(bet), 0)) profit ' +
        'FROM plays ' +
        'WHERE user_id = $1', [userId], function(err, result) {
            if (err) return callback(err);
            assert(result.rows.length == 1);
            return callback(null, result.rows[0]);
        }
    );
};

exports.getUserNetProfitLast = function(userId, last, callback) {
    assert(userId);
    query('SELECT (' +
            'COALESCE(SUM(cash_out), 0) + ' +
            'COALESCE(SUM(bet), 0))::bigint profit ' +
            'FROM ( ' +
                'SELECT * FROM plays ' +
                'WHERE user_id = $1 ' +
                'ORDER BY id DESC ' +
                'LIMIT $2 ' +
            ') restricted ', [userId, last], function(err, result) {
            if (err) return callback(err);
            assert(result.rows.length == 1);
            return callback(null, result.rows[0].profit);
        }
    );
};

exports.getPublicStats = function(username, callback) {

  var sql = 'SELECT id AS user_id, username, gross_profit, net_profit, games_played, ' +
            'COALESCE((SELECT rank FROM leaderboard WHERE user_id = id), -1) rank ' +
            'FROM users WHERE lower(username) = lower($1)';

    query(sql,
        [username], function(err, result) {
            if (err) return callback(err);

            if (result.rows.length !== 1)
                return callback('USER_DOES_NOT_EXIST');

            return callback(null, result.rows[0]);
        }
    );
};

exports.makeWithdrawal = function(userId, satoshis, withdrawalAddress, withdrawalId, amount_eth, cointype, fee, all, callback) {
    assert(typeof userId === 'number');
    assert(typeof satoshis === 'number');
    assert(typeof withdrawalAddress === 'string');
    assert(satoshis > 10000);
    assert(lib.isUUIDv4(withdrawalId));

    getClient(function(client, callback)
    {
        // query("SELECT strvalue FROM common WHERE strkey = $1", ['fEBRate'], function(err, result)
        // {
        //     // calc Eth / Btc rate
        //     if (err) return callback(err);
        // });

        client.query("UPDATE users SET balance_satoshis = balance_satoshis - $1 - $3 WHERE id = $2", [satoshis, userId, fee], function(err, response)
        {
            if (err) return callback(err);

            if (response.rowCount !== 1)
                return callback(new Error('Unexpected withdrawal row count: \n' + response));

            client.query("UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE username = 'madabit'", [fee], function(err, response)
            {
                if (err) return callback(err);

                if (response.rowCount !== 1)
                    return callback(new Error('Unexpected withdrawal row count: \n' + response));

                var baseunit = amount_eth;
                if (cointype == 'BTC')
                {
                    baseunit = satoshis / 1e8;
                }

                client.query('INSERT INTO fundings(user_id, amount, fee, withdrawal_address, description, withdrawal_id, baseunit, currency) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                    [userId, -1 * satoshis, fee, withdrawalAddress, cointype + ' Withdrawal', withdrawalId, -baseunit, cointype],
                    function(err, response) {
                        if (err) return callback(err);

                        var fundingId = response.rows[0].id;
                        assert(typeof fundingId === 'number');

                        callback(null, fundingId);
                    }
                );
            });
        });

    }, callback);
};

exports.getWithdrawals = function(userId, callback) {
    assert(userId && callback);

    query("SELECT * FROM fundings WHERE user_id = $1 AND amount < 0 ORDER BY created DESC", [userId], function(err, result)
    {
        if (err) return callback(err);

        var data = result.rows.map(function(row) {
           return {
               amount: Math.abs(row.amount),
               destination: row.withdrawal_address,
               status: row.withdrawal_txid,
               baseunit: row.baseunit,
               fee: Math.abs(row.fee),
               currency: row.currency,
               created: row.created
           };
        });
        callback(null, data);
    });
};

exports.getDeposits = function(userId, callback) {
    assert(userId && callback);

    query("SELECT * FROM fundings WHERE user_id = $1 AND amount > 0 ORDER BY created DESC", [userId], function(err, result) {
        if (err) return callback(err);

        var data = result.rows.map(function(row) {
            return {
                amount: row.amount,
                baseunit: row.baseunit,
                txid: row.deposit_txid,
                created: row.created,
                currency: row.currency
            };
        });
        callback(null, data);
    });
};

exports.getDidDeposit = function(userId, callback)
{
    query("SELECT sum(amount) as sum FROM fundings WHERE user_id = $1 AND amount > 0", [userId], function(err, result)
    {
        if (err) return callback(err);

        callback(null, result.rows[0].sum);
    });
};

exports.getDepositsAmount = function(userId, callback) {
    assert(userId);
    query('SELECT SUM(f.amount) FROM fundings f WHERE user_id = $1 AND amount >= 0', [userId], function(err, result) {
        if (err) return callback(err);
        callback(null, result.rows[0]);
    });
};

exports.getWithdrawalsAmount = function(userId, callback) {
    assert(userId);
    query('SELECT SUM(f.amount) FROM fundings f WHERE user_id = $1 AND amount < 0', [userId], function(err, result) {
        if (err) return callback(err);

        callback(null, result.rows[0]);
    });
};

exports.setFundingsWithdrawalTxid = function(fundingId, txid, callback) {
    assert(typeof fundingId === 'number');
    assert(typeof txid === 'string');
    assert(callback);

    query('UPDATE fundings SET withdrawal_txid = $1 WHERE id = $2', [txid, fundingId],
        function(err, result) {
           if (err) return callback(err);

            assert(result.rowCount === 1);

            callback(null);
        }
    );
};

exports.getLeaderBoard = function(byDb, order, callback) {
    var sql = 'SELECT * FROM leaderboard ORDER BY ' + byDb + ' ' + order + ' LIMIT 100';
    query(sql, function(err, data) {
        if (err)
            return callback(err);
        callback(null, data.rows);
    });
};

exports.getLeaderBoardTop5 = function(callback) {
    var sql = 'SELECT * FROM leaderboard ORDER BY net_profit DESC LIMIT 5';
    query(sql, function(err, data) {
        if (err)
            return callback(err);
        callback(null, data.rows);
    });
};

exports.addChatMessage = function(userId, created, message, channelName, isBot, callback) {
    var sql = 'INSERT INTO chat_messages (user_id, created, message, channel, is_bot) values($1, $2, $3, $4, $5)';
    query(sql, [userId, created, message, channelName, isBot], function(err, res) {
        if(err)
            return callback(err);

        assert(res.rowCount === 1);

        callback(null);
    });
};

exports.getChatTable = function(limit, channelName, callback) {
    assert(typeof limit === 'number');
    var sql = "SELECT chat_messages.created AS date, 'say' AS type, users.username, users.userclass AS role, chat_messages.message, is_bot AS bot " +
        "FROM chat_messages JOIN users ON users.id = chat_messages.user_id WHERE channel = $1 ORDER BY chat_messages.id DESC LIMIT $2";
    query(sql, [channelName, limit], function(err, data) {
        if(err)
            return callback(err);
        callback(null, data.rows);
    });
};

//Get the history of the chat of all channels except the mods channel
exports.getAllChatTable = function(limit, callback) {
    assert(typeof limit === 'number');
    var sql = m(function(){/*
     SELECT chat_messages.created AS date, 'say' AS type, users.username, users.userclass AS role, chat_messages.message, is_bot AS bot, chat_messages.channel AS "channelName"
     FROM chat_messages JOIN users ON users.id = chat_messages.user_id WHERE channel <> 'moderators'  ORDER BY chat_messages.id DESC LIMIT $1
    */});
    query(sql, [limit], function(err, data) {
        if(err)
            return callback(err);
        callback(null, data.rows);
    });
};

exports.getSiteStats = function(callback) {

    function as(name, callback) {
        return function(err, results) {
            if (err)
                return callback(err);

            assert(results.rows.length === 1);
            callback(null, [name, results.rows[0]]);
        }
    }

    var tasks = [
        function(callback) {
            query('SELECT COUNT(*) FROM users', as('users', callback));
        },
        function (callback) {
            query('SELECT COUNT(*) FROM games', as('games', callback));
        },
        function(callback) {
            query('SELECT COALESCE(SUM(fundings.amount), 0)::bigint sum FROM fundings WHERE amount < 0', as('withdrawals', callback));
        },
        function(callback) {
            query("SELECT COUNT(*) FROM games WHERE ended = false AND created < NOW() - interval '5 minutes'", as('unterminated_games', callback));
        },
        function(callback) {
            query('SELECT COUNT(*) FROM fundings WHERE amount < 0 AND withdrawal_txid IS NULL', as('pending_withdrawals', callback));
        },
        function(callback) {
            query('SELECT COALESCE(SUM(fundings.amount), 0)::bigint sum FROM fundings WHERE amount > 0', as('deposits', callback));
        },
        function(callback) {
            query('SELECT ' +
                'COUNT(*) count, ' +
                'SUM(plays.bet)::bigint total_bet, ' +
                'SUM(plays.cash_out)::bigint cashed_out ' +
                'FROM plays', as('plays', callback));
        }
    ];

    async.series(tasks, function(err, results) {
       if (err) return callback(err);

       var data = {};

        results.forEach(function(entry) {
           data[entry[0]] = entry[1];
        });

        callback(null, data);
    });
};
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

// Set Warning-Point
exports.setWarningPoint = function(warningPoint, callback) {
    var sql = "UPDATE common SET strvalue = $1 WHERE strkey = 'warning_point'";
    query(sql, [warningPoint], function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 1)
            return callback(null, true);
        else {
            sql = "SELECT MAX(nid) AS max_nid FROM common";
            query(sql, function(err, res) {
                var max_id = res['rows'][0]['max_nid'];
                max_id = (max_id == null) ? 1 : (max_id + 1);

                var strkey = "warning_point";

                sql = 'INSERT INTO common (nid, strkey, strvalue) VALUES($1, $2, $3)';
                query(sql, [max_id, strkey, warningPoint], function(err, res) {
                    if(err)
                        return callback(err);
                    if(res.rowCount == 1)
                        return callback(null, true);
                    return callback(null, false);
                });
            });

        }
    });
};

// Get Warning-Point
exports.getWarningPoint = function(callback) {
    var sql = "SELECT * FROM common WHERE strkey = 'warning_point'";
    query(sql, function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 0)
            return callback(null, '');
        return callback(null, res.rows[0]["strvalue"]);
    });
};

// Set Tip Fee
exports.setTipFee = function(tipFee, callback) {
    var sql = "UPDATE common SET strvalue = $1 WHERE strkey = 'tipfee'";
    query(sql, [tipFee], function(err, res) {
         if(err)
            return callback(err);

        if(res.rowCount == 1)
            return callback(null, true);
        else {
            sql = "SELECT MAX(nid) AS max_nid FROM common";
            query(sql, function(err, res) {
                var max_id = res['rows'][0]['max_nid'];
                max_id = (max_id == null) ? 1 : (max_id + 1);

                var strkey = "tipfee";

                sql = 'INSERT INTO common (nid, strkey, strvalue) VALUES($1, $2, $3)';
                query(sql, [max_id, strkey, tipFee], function(err, res) {
                    if(err)
                        return callback(err);
                    if(res.rowCount == 1)
                        return callback(null, true);
                    return callback(null, false);
                });
            });

        }
    });
};

// Get Tip Fee
exports.getTipFee = function(callback) {
    var sql = "SELECT * FROM common WHERE strkey = 'tipfee'";
    query(sql, function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 0)
            return callback(null, '');
        return callback(null, res.rows[0]["strvalue"]);
    });
};

// Set Safe-Point
exports.setSafePoint = function(safePoint, callback) {
    var sql = "UPDATE common SET strvalue = $1 WHERE strkey = 'safe_point'";
    query(sql, [safePoint], function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 1)
            return callback(null, true);
        else {
            sql = "SELECT MAX(nid) AS max_id FROM common";
            query(sql, function(err, res) {
                var max_id = res['rows'][0]['max_id'];
                max_id = (max_id == null) ? 1 : (max_id + 1);

                var strkey = "safe_point";

                sql = 'INSERT INTO common (nid, strkey, strvalue) VALUES($1, $2, $3)';
                query(sql, [max_id, strkey, safePoint], function(err, res) {
                    if(err)
                        return callback(err);
                    if(res.rowCount == 1)
                        return callback(null, true);
                    return callback(null, false);
                });
            });

        }
    });
};

// Get Safe-Point
exports.getSafePoint = function(callback) {
    var sql = "SELECT * FROM common WHERE strkey = 'safe_point'";
    query(sql, function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 0)
            return callback(null, '');
        return callback(null, res.rows[0]["strvalue"]);
    });
};


// Set Advertisement Address
exports.saveAdvertisementLink = function(advertisementLink, callback) {
    var sql = "UPDATE common SET strvalue = $1 WHERE strkey = 'advertisement_link'";
    query(sql, [advertisementLink], function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 1)
            return callback(null, true);
        else {
            sql = "SELECT MAX(nid) AS max_nId FROM common";
            query(sql, function(err, res) {
                var maxId = res['rows'][0]['max_nid'];
                maxId = (maxId == null) ? 1 : (maxId + 1);

                var strkey = "advertisement_link";

                sql = 'INSERT INTO common (nid, strkey, strvalue) VALUES($1, $2, $3)';
                query(sql, [maxId, strkey, advertisementLink], function(err, res) {
                    if(err)
                        return callback(err);
                    if(res.rowCount == 1)
                        return callback(null, true);
                    return callback(null, false);
                });
            });

        }
    });
};

// Get Advertisement Link
exports.getAdvertisementLink = function(callback) {
    var sql = "SELECT * FROM common WHERE strkey = 'advertisement_link'";
    query(sql, function(err, res) {
        if(err)
            return callback(err);

        if(res.rowCount == 0)
            return callback(null, '');
        return callback(null, res.rows[0]["strvalue"]);
    });
};

// get ETH / BTC Exchange rate
exports.getETHvsBTCRate = function(callback)
{
    var strQuery = "SELECT strvalue FROM common WHERE strkey = 'fEBRate'";
    query(strQuery, [], function(err, result)
    {
        if(err) return callback(err);

        callback(null, result.rows[0].strvalue);
    });
};

// record messages sent from support center by clients
exports.saveSupport = function(user_id, email, message_to_admin, callback)
{
    var id;
    query('SELECT MAX(id) FROM supports', [], function(err, result) {
        id = result.rows[0]['max'];
        id = (id == null) ? 1 : (id + 1);
        
        query('INSERT INTO supports(id, user_id, email, message_to_admin, created, read) VALUES($1, $2, $3, $4, $5, $6)',
            [id, user_id, email, message_to_admin, 'NOW()', false],
            function(err, results) {
                if (err) return callback(err);
                return callback(null, results);
            });
        });
};

exports.setSupportReadFlag = function(supportId, flag, callback) {
    var sql = 'UPDATE supports SET read = $1 WHERE id = $2';
    query(sql, [flag, supportId], function(err, data) {
        if (err) return callback(err);
        callback(null, true);
    });
};

exports.replySupport = function(supportId, msg2User, callback) {
    var sql = 'UPDATE supports SET message_to_user = $1 WHERE id = $2';
    query(sql, [msg2User, supportId], function(err, data) {
        if (err) return callback(err);
        callback(null, true);
    });
};

/*exports.getSupportList = function(type, callback) {
    var whereClause = '';
    if(type != 'all') {
        whereClause = 'WHERE sup.read = ' + (type == 'read') + ' ';
    }

    var return_value = [];

    var sql =  "SELECT sup.id, sup.user_id, usr.username, sup.email, sup.message_to_admin, sup.message_to_user, " +
                "to_char(sup.created, 'YYYY-MM-DD  HH24:MI:SS') AS created, sup.read " +
                "FROM supports sup " +
                "LEFT JOIN users usr ON sup.user_id = usr.id " +
                whereClause +
                "ORDER BY usr.id ASC, created DESC";

    query(sql, function(err, data) {

        if (err) return callback(err);

        var support_counts = data.rows.length;
        var index = -1;
        var oldid, curid;
        for (var i = 0 ; i < support_counts; i++)
        {
            var row = data.rows[i];

            var email = row.email;
            oldid = curid;
            curid = row.user_id;
            var username = row.username;
            var id = row.user_id;
            var status = row.read;
            if (curid != oldid) index++;
            if (typeof return_value[index] == 'undefined')
            {
                return_value[index] = {};
                return_value[index]['total_msg'] = 0;
                return_value[index]['email'] = email;
                return_value[index]['id'] = id;
                return_value[index]['username'] = username;
                return_value[index]['unread_count'] = 0;
            }
            return_value[index].total_msg = return_value[index].total_msg + 1;
            if (!status) return_value[index].unread_count += 1;
        }
        callback(null, return_value);
    });
};*/

exports.getSupportList = function(type, callback) {
    var whereClause = '';
    if(type != 'all') {
        whereClause = 'WHERE sup.read = ' + (type == 'read') + ' ';
    }
    var sql =   "SELECT sup.id, usr.username, sup.email, sup.message_to_admin, sup.message_to_user, " +
                "to_char(sup.created, 'YYYY-MM-DD  HH24:MI:SS') AS created, sup.read " +
                "FROM supports sup " +
                "LEFT JOIN users usr ON sup.user_id = usr.id " +
                whereClause +
                "ORDER BY created DESC";

    query(sql, function(err, data) {
        if (err) return callback(err);
        callback(null, data.rows);
    });
};

exports.getSupportFromUserId = function(user_id, callback)
{
    var sql = "SELECT * FROM supports WHERE user_id=$1";
    query(sql, [user_id], function(err, res){
        if (err) return callback(err);
        callback(null, res.rows);
    })
};

//set intervals
exports.saveIntervals = function(intervals, callback){
    var sql = "DELETE FROM intervals";
    query(sql, function(err, res) {
        if (err)
            return callback(err);
        sql = "SELECT MAX(nid) AS max_nId FROM intervals";
        query(sql, function (err, res) {
            var maxId = res['rows'][0]['max_nId'];
            maxId = (maxId == null) ? 1 : (maxId + 1);

            var data = [];
            for(var i=0; i< intervals.length; i++) {
                sql = 'INSERT INTO intervals (nid, interval_start, interval_end, percentage) VALUES ($1, $2, $3, $4)';
                var interval_start = parseInt(intervals[i]['interval_start'] * 100);
                var interval_end = parseInt(intervals[i]['interval_end'] * 100);
                var percentage = parseInt(intervals[i]['percentage'] * 100);
                query(sql, [maxId + i, interval_start, interval_end, percentage], function (err, res) {
                    if (err)
                        return callback(err);
                });
            }
            callback(null, true);
        });
    });
};


exports.getIntervals = function(callback) {
    var sql = 'SELECT * FROM intervals ORDER BY interval_start';
    query(sql, [], function(err, res) {
        if(err)
            return callbask(err);
        callback(null, res.rows);
    });
}

//Save Title and URL of Tutorial
exports.saveTutorials= function(tutorials, callback){
    var sql = "DELETE FROM tutorials";
    query(sql, function(err, res) {
        if (err)
            return callback(err);
        sql = "SELECT MAX(nId) AS max_nId FROM tutorials";
        query(sql, function (err, res) {
            var maxId = res['rows'][0]['max_nId'];
            maxId = (maxId == null) ? 1 : (maxId + 1);

            var data = [];
            if(tutorials == undefined)
            {
                return callback(null, true);
            }
            for(var i=0; i< tutorials.length; i++) {
                sql = 'INSERT INTO tutorials (nId, title, url) VALUES ($1, $2, $3)';
                var title= tutorials[i]['title'];
                var url = tutorials[i]['url'];
                query(sql, [maxId + i, title, url], function (err, res) {
                    if (err)
                        return callback(err);
                });
            }
            callback(null, true);
        });
    });
};

//Get Tutorials
exports.getTutorials = function(callback) {
    var sql = 'SELECT * FROM tutorials';
    query(sql, [], function(err, res) {
        if(err)
            return callback(err);
        callback(null, res.rows);
    });
}

//Admin -> Company Statistics.  Profit Per Month
exports.getCompanyProfitPerMonth = function(callback) {
    var sql =   "SELECT (SUM(bet)-SUM(cash_out)) / 100000000.0 AS profit, to_char(created, 'YYYY-MM') AS game_date " +
                "FROM plays " +
                "GROUP BY game_date " +
                "ORDER BY game_date ASC";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        callback(null, result.rows);
    });
}

//Admin -> Company Statistics.  Profit Per Week
exports.getCompanyProfitPerWeek = function(callback) {
    var sql =   "SELECT (SUM(bet)-SUM(cash_out)) / 100.0 AS profit, to_char(created, 'YYYY-MM No.W') AS game_date " +
                "FROM plays " +
                "GROUP BY game_date " +
                "ORDER BY game_date ASC";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        callback(null, result.rows);
    });
}

//Admin -> Company Statistics.  Profit Per Day
exports.getCompanyProfitPerDay = function(callback) {
    var sql =   "SELECT (SUM(bet)-SUM(cash_out)) / 100.0 AS profit, to_char(created, 'YYYY-MM-DD') AS game_date " +
                "FROM plays " +
                "GROUP BY game_date " +
                "ORDER BY game_date ASC";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        callback(null, result.rows);
    });
}

//Admin -> Customer Statistics.  Profit Per Game
exports.getCustomerProfitPerGame = function(callback) {
    var sql =   "SELECT game_id, (SUM(cash_out) - SUM(bet)) / 100.0 AS customer_profit_sum " +
                "FROM plays " +
                "GROUP BY game_id " +
                "ORDER BY game_id ASC";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        callback(null, result.rows);
    });
}

//Admin -> Customer Statistics.  Profit Per Day
exports.getCustomerProfitPerDay = function(callback) {
    var sql =   "SELECT (SUM(cash_out) - SUM(bet)) / 100.0 AS customer_profit_sum, to_char(created, 'YYYY-MM-DD') AS created_date " +
                "FROM plays " +
                "GROUP BY created_date " +
                "ORDER BY created_date ASC";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        callback(null, result.rows);
    });
}

//Admin -> Customer Statistics.  Total Investment Amount
exports.getCustomerTotalInvestment = function(callback) {
            var sql =   "SELECT SUM(bet) AS customer_total_investment " +
                "FROM plays";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        result = result.rows[0]['customer_total_investment'];
        if(result == null)
            result = 0;
        callback(null, result);
    });
}

//Admin -> Customer Statistics.  Total Profit
exports.getCustomerTotalProfit = function(callback) {
    var sql =   "SELECT SUM(cash_out) - SUM(bet) AS customer_total_profit " +
                "FROM plays";
    query(sql, [], function(err, result) {
        if(err)
            return callback(err);
        result = result.rows[0]['customer_total_profit'];
        if(result == null)
            result = 0;
        callback(null, result);
    });
}

exports.makeTransfer = function(uid, fromUserId, toUsername, satoshis, fee, all, callback){
    assert(typeof fromUserId === 'number');
    assert(typeof toUsername === 'string');
    assert(typeof satoshis === 'number');

    // Update balances
    getClient(function(client, callback) {
        async.waterfall([
            function(callback) {
                client.query("UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE username = 'madabit'",
                    [fee], callback)
            },
            function(prevData, callback) {
                client.query("UPDATE users SET balance_satoshis = balance_satoshis - $1 WHERE id = $2",
                    [all, fromUserId], callback)
            },
            function(prevData, callback) {
                client.query(
                    "UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE lower(username) = lower($2) RETURNING id",
                    [satoshis, toUsername], function(err, data) {
                        if (err)
                            return callback(err);
                        if (data.rowCount === 0)
                            return callback('USER_NOT_EXIST');
                        var toUserId = data.rows[0].id;
                        assert(Number.isInteger(toUserId));
                        callback(null, toUserId);
                    });
            },
            function (toUserId, callback) {
                client.query(
                    "INSERT INTO transfers (id, from_user_id, to_user_id, amount, fee, created) values($1,$2,$3,$4,$5,now()) ",
                    [uid, fromUserId, toUserId, satoshis, fee], callback);
            }
        ], function(err) {
            if (err) {
                if (err.code === '23514') {// constraint violation
                    return callback('NOT_ENOUGH_BALANCE');
                }
                if (err.code === '23505') { // dupe key
                    return callback('TRANSFER_ALREADY_MADE');
                }

                return callback(err);
            }
            callback();
        });
    }, callback);

};

exports.getTransfers = function (userId, callback){
    assert(userId);
    assert(callback);

    var sql = "SELECT " +
           "transfers.id, " +
           "transfers.amount, " +
           "transfers.fee, " +
           "(SELECT users.username FROM users WHERE users.id = transfers.from_user_id) AS from_username, " +
           "(SELECT users.username FROM users WHERE users.id = transfers.to_user_id) AS to_username, " +
           "transfers.created " +
           "FROM transfers " +
           "WHERE from_user_id = $1 " +
           "OR   to_user_id = $1 " +
           "ORDER by transfers.created DESC " +
           "LIMIT 250";

    query(sql, [userId], function(err, data) {
        if (err)
            return callback(err);

        callback(null, data.rows);
    });
};


exports.saveDepositSrc = function(userid, eth_src, callback) {
    var sql = "SELECT * FROM eth_deposit_src WHERE user_id = $1";
    query(sql, [userid], function(err, res){
        if (err) return callback(err);
        if (res.rows.length==1){
            if (res.rows[0].eth_addr == eth_src) return callback(null);
            sql = "UPDATE eth_deposit_src SET eth_addr=$1 WHERE user_id=$2";
            query(sql, [eth_src.toLowerCase(), userid], function(error, result){
                if (error) return callback(error);
                return callback(null);
            });
        }
        else {
            sql = "INSERT INTO eth_deposit_src(user_id, eth_addr) VALUES($1, $2)";
            query(sql, [userid, eth_src.toLowerCase()], function(error, result){
                if (err) {
                    console.log("Could not insert data into eth_deposit_src");
                    return callback(error);
                }
                return callback(null);
            });
        }
    })
}


exports.LoadDepositSrc = function(callback) {

    var addr, pass;
    var retval = {};

    var sql = "SELECT strvalue FROM common WHERE strkey='ethereum_deposit_addr'";
    query(sql, function(error, result){
        if (error) return callback(error);
        addr = result.rows[0].strvalue;

        sql = "SELECT strvalue FROM common WHERE strkey='ethereum_deposit_pass'";
        query(sql, function(err, res){
            if(err) return callback(err);
            pass = res.rows[0].strvalue;

            retval['addr'] = addr;
            retval['pass'] = pass;
            return callback(null, retval);
        });
    });
}

exports.getTipFee = function (callback){
    query("SELECT strvalue FROM common WHERE strkey = 'tipfee'", [], function(err, tipfee)
    {
        if (err) return callback(err);

        return callback(null, tipfee.rows[0].strvalue);
    });
};


//Get News List from Posts table
exports.getNewsList = function(callback) {  

    var sql = 'SELECT id, news_date, news_content, news_title, news_img1, news_img2, news_img3 ' +
                    'FROM posts';
    query(sql, function(err, data) {
        if (err) return callback(err);
         callback(null, data.rows);
    });
};

//Get subscribe List from subscribe table
exports.getSubscribesList = function(callback) {  

    var sql = 'SELECT subscribe_status, id, email_item, arrival_date ' +
                    'FROM subscribes';
    query(sql, function(err, data) {
        if (err) return callback(err);
         callback(null, data.rows);
    });
};


//Get News List from Posts table
exports.getLatestAllNews = function(callback) {  

    var sql = 'SELECT id, news_date, news_content, news_title, news_img1,news_img2, news_img3 ' +
                    'FROM posts ORDER BY news_date DESC';

    query(sql, function(err, data) {
        if (err) return callback(err);
         callback(null, data.rows);
    });
};

//Get special News from Posts table
exports.getSomeNews = function(id, callback) {  

    var sql = 'SELECT id, news_date, news_content, news_title, news_img1, news_img2, news_img3 ' +
                    'FROM posts where id = $1';                    
    query(sql, [id],  function(err, data) {
        if (err) return callback(err);
         callback(null, data.rows);
    });
};

//Get Latest News from Posts table
exports.getLatestNews = function(callback) {  

    var sql = 'SELECT id, news_date, news_content, news_title, news_img1, news_img2, news_img3 ' +
                    'FROM posts ORDER BY news_date DESC LIMIT 1';
    query(sql, function(err, data) {
        if (err) return callback(err);
         callback(null, data.rows);
    });
};

//Create new News to Posts table
exports.createNews = function(news_date, news_content, news_title, news_img1, news_img2, news_img3, news_img4, user_id, callback) {
    console.log(news_img4);
    console.log('news_img4 end');
        var id;
        query('SELECT MAX(id) FROM posts', [], function(err, result) {
            id = result.rows[0]['max'];
            id = (id == null) ? 1 : (id + 1);            

            var sql = 'INSERT INTO posts (id, news_date, news_content, news_title, news_img1, news_img2, news_img3, news_img4, user_id)  values($1, $2, $3, $4, $5, $6, $7,$8, $9)'

            query( sql, [id, news_date, news_content, news_title, news_img1, news_img2, 
                        news_img3, news_img4, user_id], function(err, results) {
                if (err) return callback(err);
                callback(null, results);
            });
    });  
};

//Get News List from Posts table
exports.getNewItem = function(id, callback) {  

    var sql = 'SELECT id, news_date, news_content, news_title, news_img1 ' +
                    'FROM posts where id = $1';
    query(sql, [id], function(err, data) {
        if (err) return callback(err);
         callback(null, data.rows);
    });
};

//Update new News to Posts table
exports.updateNews = function(news_date, news_content, news_title, news_img1, news_img2, news_img3, news_img4, user_id, id, callback) {        
    query('UPDATE posts SET news_date = $1, news_content= $2, news_title = $3, news_img1=$4, news_img2=$5, news_img3=$6, news_img4=$7 WHERE id = $8', 
        [news_date, news_content, news_title, news_img1, news_img2, news_img3, news_img4, id], function(err, res) {
            if(err) return callback(err);
            assert(res.rowCount === 1);
            callback(null);
    }); 
};


//Remove new News to Posts table
exports.removeNews = function(id, callback) {        
    var sql = "DELETE FROM posts where id = $1";    

    query(sql, [id], function(err, res) {
        if(err) return callback(err);            
         callback(null);
    });
};


//Save subscribe email
exports.createSubscribe = function(email_item, arrival_date, subscribe_status, callback) {
        var id;
        query('SELECT MAX(id) FROM subscribes', [], function(err, result) {
            id = result.rows[0]['max'];
            id = (id == null) ? 1 : (id + 1);            

            var sql = 'INSERT INTO subscribes (id, email_item, arrival_date, subscribe_status)  values($1, $2, $3, $4)'

            query( sql, [id, email_item, arrival_date, subscribe_status], function(err, results) {
                if (err) return callback(err);
                callback(null, results);
            });
    });  
};

//Save contact email
exports.createContactUS = function(customer_user, customer_email, customer_message, news_pub_date,  callback) {
        var id;
        console.log('real database here start');
        console.log(customer_user);
        console.log(customer_email);
        console.log(customer_message);
        console.log(news_pub_date);
        console.log('real database here end');

        query('SELECT MAX(id) FROM contacts', [], function(err, result) {
            id = result.rows[0]['max'];
            id = (id == null) ? 1 : (id + 1);            

            var sql = 'INSERT INTO contacts (id, customer_user, customer_email, customer_message, news_pub_date)  values($1, $2, $3, $4, $5)'

            query( sql, [id, customer_user, customer_email, customer_message, news_pub_date], function(err, results) {
                if (err) return callback(err);
                callback(null, results);
            });
    });  
};