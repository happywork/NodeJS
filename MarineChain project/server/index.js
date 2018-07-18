var fs = require('fs');

var express = require('express');
var http = require('http');
var https = require('https');
var constants = require('constants');
// var assert = require('assert');
var compression = require('compression');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var socketIO = require('socket.io');
var ioCookieParser = require('socket.io-cookie');
var _ = require('lodash');
var debug = require('debug')('app:index');
const fileUpload = require('express-fileupload');
var app = express();
var config = require('../config/config');
var routes = require('./routes');
var database = require('./database');
var lib = require('./lib');
var ip = require('ip');
var checkip = require('check-ip');
var i18n=require("i18n-express");
var session = require("express-session");
var reload = require('reload');

/** TimeAgo Settings:
 * Simplify and de-verbosify timeago output.
 **/
var timeago = require('timeago');
var timeago_strings = _.extend(timeago.settings.strings, {
  seconds: '< 1 min',
  minute: '1 min',
  minutes: '%d mins',
  hour: '1 hour',
  hours: '%d hours',
  day: '1 day',
  days: '%d days',
  month: '1 month',
  months: '%d months',
  year: '1 year',
  years: '%d years'
});
timeago.settings.strings = timeago_strings;


/** Render Engine
 *
 * Put here render engine global variable trough app.locals
 * **/
app.set("views", path.join(__dirname, '../views'));

app.locals.recaptchaKey = config.RECAPTCHA_SITE_KEY;
app.locals.buildConfig = config.BUILD;
app.locals.miningFeeBits = config.MINING_FEE/100;

var dotCaching = true;
if (!config.PRODUCTION) {
    app.locals.pretty = true;
    dotCaching = false;
}

app.engine("html", require("dot-emc").init(
    {
        app: app,
        fileExtension:"html",
        options: {
            templateSettings: {
                cache: dotCaching
            }
        }
    }
).__express);


/** Middleware **/
app.use(bodyParser());
app.use(cookieParser());
app.use(compression());
app.use(fileUpload());

/** App settings **/
app.set("view engine", "html");
app.disable('x-powered-by');
app.enable('trust proxy');

app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));


app.use(i18n({
    translationsPath: path.join(__dirname, '../i18n'), // <--- use here. Specify translations files path.
    siteLangs: ["en","zh"],
    textsVarName: 'translation'
}));

/** Serve Static content **/
var twoWeeksInSeconds = 1209600;

if(config.PRODUCTION) {
    app.use(express.static(path.join(__dirname, '../build'), { maxAge: twoWeeksInSeconds * 1000 }));
} else {
    app.use(express.static(path.join(__dirname, '../theme'), { maxAge: twoWeeksInSeconds * 1000 }));
    app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')), { maxAge: twoWeeksInSeconds * 1000 });
}


/** Login middleware
 *
 * If the user is logged append the user object to the request
 */

var strIP = ip.address();
var bIsPublicIP = checkip(strIP).isPublicIp;

app.use(function(req, res, next) {

    if (bIsPublicIP && !req.secure) {
        res.redirect('https://' + req.headers.host + req.url);
        return;
    }

    var sessionId = req.cookies.id;

    if (!sessionId) {
        res.header('Vary', 'Accept, Accept-Encoding, Cookie');
        res.header('Cache-Control', 'public, max-age=60'); // Cache the logged-out version
        return next();
    }

    res.header('Cache-Control', 'no-cache');
    res.header("Content-Security-Policy", "frame-ancestors 'none'");


    if (!lib.isUUIDv4(sessionId)) {
        res.clearCookie('id');
        return next();
    }

    database.getUserBySessionId(sessionId, function(err, user) {
        if (err) {
            res.clearCookie('id');
            if (err === 'NOT_VALID_SESSION') {
                return res.redirect('/');
            } else {
                console.error('[INTERNAL_ERROR] Unable to get user by session id ' + sessionId + ':', err);
                return res.redirect('/error');
            }
        }
        user.advice = req.query.m;
        user.error = req.query.err;
        user.eligible = lib.isEligibleForGiveAway(user.last_giveaway);
        user.admin = user.userclass === 'admin';
        user.moderator = user.userclass === 'admin' ||
                         user.userclass === 'moderator';
        req.user = user;
        next();
    });
});

/** Error Middleware
 *
 * How to handle the errors:
 * If the error is a string: Send it to the client.
 * If the error is an actual: error print it to the server log.
 *
 * We do not use next() to avoid sending error logs to the client
 * so this should be the last middleware in express .
 */
function errorHandler(err, req, res, next) {

    if (err) {
        if(typeof err === 'string') {
            return res.render('error', { error: err });
        } else {
            if (err.stack) {
                console.error('[INTERNAL_ERROR] ', err.stack);
            } else console.error('[INTERNAL_ERROR', err);
            res.render('error');
        }

    } else {
        console.warning("A 'next()' call was made without arguments, if this an error or a msg to the client?");
    }

}

routes(app);
app.use(errorHandler);

/**  Server **/
var serverHttp = http.createServer(app);
serverHttp.listen(config.PORT_HTTP_W, function() {
    console.log('W: Listening on port ', config.PORT_HTTP_W, ' with HTTP');
});
var server = serverHttp;

var serverHttps;
if (config.USE_HTTPS && bIsPublicIP) {
   
    var options = {
        key: fs.readFileSync(config.HTTPS_KEY),
        cert: fs.readFileSync(config.HTTPS_CERT),
        secureProtocol: 'SSLv23_method',
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
    };

    if (config.HTTPS_CA) {
        options.ca = fs.readFileSync(config.HTTPS_CA);
    }

    serverHttps = https.createServer(options, app);
    serverHttps.listen(config.PORT_HTTPS_W, function()
    {
        console.log('W: Listening on port ', config.PORT_HTTPS_W, ' with HTTPS');
    });

    server = serverHttps;
}

var io = socketIO(server); //Socket io must be after the lat app.use
io.use(ioCookieParser);

/** Socket io login middleware **/
io.use(function(socket, next)
{
    debug('incoming socket connection');

    var sessionId = (socket.request.headers.cookie)? socket.request.headers.cookie.id : null;

    //If no session id or wrong the user is a guest
    if(!sessionId || !lib.isUUIDv4(sessionId)) {
        socket.user = false;
        return next();
    }

    database.getUserBySessionId(sessionId, function(err, user) {

        //The error is handled manually to avoid sending it into routes
        if (err) {
            if (err === 'NOT_VALID_SESSION') {
                //socket.emit('err', 'NOT_VALID_SESSION');
                next(new Error('NOT_VALID_SESSION'));
            } else {
                console.error('[INTERNAL_ERROR] Unable to get user in socket by session ' + sessionId + ':', err);
                next(new Error('Unable to get the session on the server, logged as a guest.'));
                //return socket.emit('err', 'INTERNAL_ERROR');
            }
            socket.user = false;
            return next();
        }

        //Save the user info in the socket connection object
        socket.user = user;
        socket.user.admin = user.userclass === 'admin';
        socket.user.moderator = user.userclass === 'admin' || user.userclass === 'moderator';
        next();
    });
});

/** Log uncaught exceptions and kill the application **/
process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    console.error(err.stack);
    process.exit(1);
});