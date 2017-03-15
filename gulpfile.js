/* globals require:false */
var gulp = require('gulp'),
    server = require('gulp-webserver');

gulp.task('testInBrowser', function() {
    gulp.src('./')
        .pipe(server({
            port: 8888,
            livereload: true,
            directoryListing: false,
            open: 'test/browser/index.html'
        }));
});