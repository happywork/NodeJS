var fs = require('fs');

var gulp = require('gulp');
var requirejs = require('requirejs');
var vinylPaths = require('vinyl-paths');
var del = require('del');
var minifyCss = require('gulp-minify-css');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var es = require('event-stream');
var hash = require('gulp-hash');
var extend = require('gulp-extend');
var replace = require('gulp-replace');
var rename = require("gulp-rename");

var production = process.env.NODE_ENV === 'production';
var configJsonPath = './config/build-config.json';

// gulp.task('build', function(callback) {
//     runSequence(
//         'clean:build',

//         ['minify-js', 'minify-css', 'copy:assets'],
//         'hash-files',

//         callback
//     );
// });

gulp.task('build', function(callback) {
    runSequence(
        'clean:build',

        ['minify-js-homepage', 'minify-js-main', 'copy:assets'],
        'hash-files',

        callback
    );
});

/** Delete build folder and config file if exist **/
gulp.task('clean:build', function () {
    var buildStream = gulp.src('build')
        .pipe(vinylPaths(del));

    var configStream = gulp.src('config/build-config.json')
        .pipe(vinylPaths(del));

    return merge(buildStream, configStream);
});

/** RequireJS Optimizer options **/

var homepageClientOptions = {
    baseUrl: './theme/scripts',
    out: './build/scripts/homepage-main-new.js',
    name: '../../node_modules/almond/almond',
    mainConfigFile: './theme/scripts/homepage-main.js',
    include: 'homepage-main',
    insertRequire: ['homepage-main'],
    removeCombined: true,
    optimize: "uglify2",
    generateSourceMaps: false,
    preserveLicenseComments: false
};

/** Minify the Javascript with requireJs optizer **/
gulp.task('minify-js-homepage', function(callback)
{
    requirejs.optimize(homepageClientOptions, function (buildResponse) {
        callback();
    }, function(err) {
        callback(err);
        console.error('[Error on require optimization]: ', err);
    });
});

var mainClientOptions = {
    baseUrl: './theme/scripts',
    out: './build/scripts/main-new.js',
    name: '../../node_modules/almond/almond',
    mainConfigFile: './theme/scripts/main.js',
    include: 'main',
    insertRequire: ['main'],
    removeCombined: true,
    optimize: 'uglify2',
    generateSourceMaps: false,
    preserveLicenseComments: false
};

gulp.task('minify-js-main', function(callback)
{
    requirejs.optimize(mainClientOptions, function (buildResponse) {
        callback();
    }, function(err) {
        callback(err);
        console.error('[Error on require optimization]: ', err);
    });
});

/** Minify game and landing css into build dir **/
// gulp.task('minify-css', function() {
//     //Game css
//     var appStream = gulp.src('theme/css/game.css')
//         .pipe(minifyCss({ advanced: false, aggressiveMerging: false, restructuring: false, shorthandCompacting: false }))
//         .pipe(rename('css/game-new.css'))
//         .pipe(gulp.dest('build/'));
//
//     //Game white theme css
//     var themeStream = gulp.src('theme/css/blackTheme.css')
//         .pipe(minifyCss({ compatibility: 'ie8' }))
//         .pipe(rename('css/game-theme-new.css'))
//         .pipe(gulp.dest('build/'));
//
//     //Landing css
//     var landingStream = gulp.src('theme/css/app.css')
//         .pipe(minifyCss({ compatibility: 'ie8' }))
//         .pipe(rename('css/app-new.css'))
//         .pipe(gulp.dest('build/'));
//
//     return merge(appStream, landingStream, themeStream);
// });

/** Copy the files to prod folder **/
gulp.task('copy:assets', function() {
    return gulp.src('theme/**/*.*')
        .pipe(gulp.dest('build/'));
});

/** Hash the config.js and the app.css files  **/
var hashOptions = {
    template: '<%= name %>-<%= hash %><%= ext %>'
};

// gulp.task('hash-files', function(callback) {
//     runSequence('hash-css-game', 'hash-css-game-theme', 'hash-css-app', 'hash-js', callback);
// });

gulp.task('hash-files', function(callback) {
    runSequence('hash-js-homepage', 'hash-js-main', callback);
});

// gulp.task('hash-css-game', function() {
//     return addToManifest(
//         gulp.src('./build/css/game-new.css')
//             .pipe(hash(hashOptions))
//             .pipe(gulp.dest('build/css'))
//     );
// });
//
// gulp.task('hash-css-game-theme', function() {
//     return addToManifest(
//         gulp.src('./build/css/game-theme-new.css')
//             .pipe(hash(hashOptions))
//             .pipe(gulp.dest('build/css'))
//     );
// });
//
// gulp.task('hash-css-app', function() {
//     return addToManifest(
//         gulp.src('./build/css/app-new.css')
//             .pipe(hash(hashOptions))
//             .pipe(gulp.dest('build/css'))
//     );
// });

gulp.task('hash-js-homepage', function() {
    return addToManifest(
        gulp.src('./build/scripts/homepage-main-new.js')
            .pipe(hash(hashOptions))
            .pipe(gulp.dest('build/scripts'))
    );
});

gulp.task('hash-js-main', function() {
    return addToManifest(
        gulp.src('./build/scripts/main-new.js')
            .pipe(hash(hashOptions))
            .pipe(gulp.dest('build/scripts'))
    );
});

///** Get the hashed file names of config.js and app.css **/
//var configFile = null;
//gulp.task('get-file-names', function (callback) {
//    fs.readFile('./build/build-config.json', function(err, data) {
//        if (err)
//            return callback(err);
//
//        configFile = JSON.parse(data);
//        callback();
//    });
//});


///** RequireJs Optimizer does not support an option to hash the name of the file, so we need to hash it and then replace the name of the source maps **/
//gulp.task('replace-maps-name', function(){
//
//    var replaceStream = gulp.src('./build/scripts/' + configFile['config.js'], { base: './' })
//        .pipe(replace('sourceMappingURL=config.js', 'sourceMappingURL=' + configFile['config.js']))
//        .pipe(replace('sourceMappingURL=config.js.map', 'sourceMappingURL=' + configFile['config.js'] + '.map'))
//        .pipe(gulp.dest('./'));
//
//    var mapStream = gulp.src('./build/scripts/config.js.map')
//        .pipe(rename('scripts/'+ configFile['config.js'] + '.map'))
//        .pipe(gulp.dest('./build'));
//
//    return merge(replaceStream, mapStream);
//});




/** ======================================== Functions ========================================= **/
/** ============================================================================================ **/

// Adds the files in `srcStream` to the manifest file, extending the manifest's current contents.
function addToManifest(srcStream) {
    return es.concat(
        gulp.src(configJsonPath),
        srcStream
            .pipe(hash.manifest(configJsonPath))
    )
        .pipe(extend(configJsonPath, false, 4))
        .pipe(gulp.dest('.'));
}