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
 * Get
 * Restricted API
 * Get subscribe function
 **/
exports.subscribe = function(req, res) {

    var email_item = req.body.subscribe_email;
    var subscribe_status ='unconfirmed';
    var strEngineHost = lib.getEngineHost();

    var today = new Date();
    /*var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!

    var yyyy = today.getFullYear();
    if(dd < 10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    } 
    var today = dd+'-'+mm+'-'+yyyy;*/
    var news_pub_date = today;

    database.createSubscribe(email_item, news_pub_date, subscribe_status, function(err, newslists){
        if(err){
            res.redirect('/error');
        }else{
            res.redirect("/");            
        }
    });
}

/**
 * GET
 * Restricted API
 * News Front page
 **/
exports.viewNews = function(req, res) {
    
    var user = req.user;
    var newsID = req.params.newID;    
    var strEngineHost = lib.getEngineHost();

    database.getSomeNews(newsID, function(err, newslists){
        if(err){
            res.redirect('/error');
        }else{
            database.getLatestAllNews(function(err, data){
                    res.render('news-view', {
                    user:user,
                    enginehost: strEngineHost,
                    newslists: newslists,
                    newsAllItems: data
                });
            });                    
        }
    });
}

/**
 * GET
 * Restricted API
 * News Front page
 **/
exports.newspage = function(req, res) {
    
    var user = req.user;
    var strEngineHost = lib.getEngineHost();

    database.getLatestNews(function(err, newslists){
        if(err){
            res.redirect('/error');
        }else{
            database.getLatestAllNews(function(err, data){                      
                    res.render('news', {
                    user:user,
                    enginehost: strEngineHost,
                    newslists: newslists,
                    newsAllItems: data
                });
            });                    
        }
    });
}
/**
 * GET
 * Restricted API
 * News lists
 **/
exports.listNews = function(req, res) {
    
    var user = req.user;    
    var strEngineHost = lib.getEngineHost();       

    database.getNewsList(function (err, newslists) {
        if(err){
            res.redirect('/error');
        }else{          
            res.render('admin_news', {
                user:user,
                enginehost: strEngineHost,
                newslists: newslists
            });
        }
        
    });
}

/**
 * GET
 * Restricted API
 * News lists
 **/
exports.listSubscribeEmail = function(req, res) {
    
    var user = req.user;    
    var strEngineHost = lib.getEngineHost();       

    database.getSubscribesList(function (err, subscribeslists) {
        if(err){
            res.redirect('/error');
        }else{          
            res.render('admin_subscribe', {
                user:user,
                enginehost: strEngineHost,
                subscribeslists: subscribeslists
            });
        }
        
    });
}
/**
 * GET
 * Restricted API
 * Create news
 **/
exports.createNews = function(req, res) {
    
   
    //var strEngineHost = lib.getEngineHost();    
    return res.render('create-news', {              
    });
}


/**
 * GET
 * Restricted API
 * Build news
 **/
exports.buildNews = function(req, res) {

    //var strEngineHost = lib.getEngineHost();
    console.log('build news start');

    var news_title = req.body.news_title;
  
    var upload_path = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img1.name;           

    let sampleFile1 = req.files.news_img1;
    assert(upload_path && sampleFile1);
    
    sampleFile1.mv(upload_path, function(err) {
        if (err)
            return res.status(500).send(err);
    }); 

    //upload image2
    var upload_path2 = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img2.name;           

    let sampleFile2 = req.files.news_img2;
    assert(upload_path2 && sampleFile2);
    
    sampleFile2.mv(upload_path2, function(err) {
        if (err)
            return res.status(500).send(err);
    });  

    //upload image3
    var upload_path3 = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img3.name;           

    let sampleFile3 = req.files.news_img3;
    assert(upload_path3 && sampleFile3);
    
    sampleFile3.mv(upload_path3, function(err) {
        if (err)
            return res.status(500).send(err);
    });  

    //upload image4
    var upload_path4 = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img4.name;           

    let sampleFile4 = req.files.news_img4;
    assert(upload_path4 && sampleFile4);
    
    sampleFile4.mv(upload_path4, function(err) {
        if (err)
            return res.status(500).send(err);
    });     

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!

    var yyyy = today.getFullYear();
    if(dd < 10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    } 

    var today = dd+'-'+mm+'-'+yyyy;
    var news_pub_date = today;

    database.createNews(news_pub_date, 'content', news_title, req.files.news_img1.name, req.files.news_img2.name, 
                        req.files.news_img3.name, req.files.news_img4.name, 1, function(err, callback){        
        if(err){
            res.redirect('/error');
        }else{
            res.redirect('/admin/news/create');
        }
    });    
}

/**
 * GET
 * Restricted API
 * edit news
 **/
exports.editNews = function(req, res) {

    var newsID = req.params.newsID;

    database.getNewItem(newsID, function(err, newsitem){
        if(err){
            res.redirect('/error');
        }else{
                res.render('edit-news', {                
                new_items: newsitem
            }); 
        }
    });
}


/**
 * GET
 * Restricted API
 * Update news
 **/
exports.updateNews = function(req, res) {
    var id = req.params.newsID;

    var news_title = req.body.news_title;

    var upload_path = __dirname + '/../theme/metronic/assets/upload' + req.files.news_img1.name;
    console.log('start');
    console.log(upload_path);
    console.log('end');
    let sampleFile = req.files.news_img1;

    assert(upload_path && sampleFile);
    
    sampleFile.mv(upload_path, function(err) {
        if (err)
            return res.status(500).send(err);
    });    
    

    //upload image2
    var upload_path2 = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img2.name;           

    let sampleFile2 = req.files.news_img2;
    assert(upload_path2 && sampleFile2);
    
    sampleFile2.mv(upload_path2, function(err) {
        if (err)
            return res.status(500).send(err);
    });  

    //upload image3
    var upload_path3 = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img3.name;           

    let sampleFile3 = req.files.news_img3;
    assert(upload_path3 && sampleFile3);
    
    sampleFile3.mv(upload_path3, function(err) {
        if (err)
            return res.status(500).send(err);
    });  

    //upload image4
    var upload_path4 = __dirname + '/../theme/metronic/assets/upload/' + req.files.news_img4.name;           

    let sampleFile4 = req.files.news_img4;
    assert(upload_path4 && sampleFile4);
    
    sampleFile4.mv(upload_path4, function(err) {
        if (err)
            return res.status(500).send(err);
    });
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!

    var yyyy = today.getFullYear();
    if(dd < 10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    } 
    var today = dd+'-'+mm+'-'+yyyy;
    var news_pub_date = today;

    database.updateNews(news_pub_date, 'content', news_title, req.files.news_img1.name, req.files.news_img2.name, req.files.news_img3.name,
    req.files.news_img4.name,  1, id,  
        function(err, callback){
            if(err){
                res.redirect('/error');
            }else{
                res.redirect('/admin/news/create');
            }
    });
}

/**
 * GET
 * Restricted API
 * Remove news
 **/
exports.removeNews = function(req, res) {
    
    var user = req.user;    
    var strEngineHost = lib.getEngineHost();       
    var newsID = req.params.newsID;

    database.removeNews(newsID, function (err) {
        if(err){
            res.redirect('/error');
        }else{          
            database.getNewsList(function (err, newslists) {
                res.render('admin_news', {
                    user:user,
                    enginehost: strEngineHost,
                    newslists: newslists         
                });
            });
        }        
    });
}