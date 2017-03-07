/* globals require:false */
var gulp = require('gulp'),
    babel = require('gulp-babel'),
    server = require('gulp-webserver');

gulp.task('default', function(){
    gulp.src('./src/promise.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('integrateTest', function(){
    
});

gulp.task('testInBrowser', ['default', 'integrateTest'], function(){
    gulp.src('./')
        .pipe(server({
            port: 8888,
            livereload: true,
            directoryListing: false,
            open: 'test/browser/index.html'
        }));
});
