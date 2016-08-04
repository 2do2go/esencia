'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var pure = require('gulp-pure-cjs');
var gulpIgnore = require('gulp-ignore');
var gulpSequence = require('gulp-sequence');
var path = require('path');
var del = require('del');
var plumber = require('gulp-plumber');

var SRC = 'lib/';
var DEST = 'dist/';

var capitalize = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

var createBuildStream = function(options) {
	if (options.base[options.base.length - 1] === '/') {
		options.base = options.base.slice(0, options.base.length - 1);
	}

	return gulp
		.src(options.src, {base: options.base})
		// .pipe(changed(options.dest))
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(pure({
			exports: options.exports,
			map: true,
			external: {
				underscore: {amd: 'underscore', global: '_'},
				backbone: {amd: 'backbone', global: 'Backbone'}
			}
		}))
		.pipe(rename(function(filePathObj) {
			if (filePathObj.dirname.indexOf(options.base) === 0) {
				filePathObj.dirname = filePathObj.dirname.slice(options.base.length + 1);
			}
			return filePathObj;
		}))
		.pipe(sourcemaps.write('.', {
			sourceRoot: '.'
		}))
		.pipe(gulp.dest(options.dest))
		.pipe(gulpIgnore.include('*.js'))
		.pipe(uglify())
		.pipe(rename({extname: '.min.js'}))
		.pipe(sourcemaps.write('.', {
			sourceRoot: '.'
		}))
		.pipe(gulp.dest(options.dest));
};

gulp.task('test', function() {
	return gulp
		.src('tests/index.html')
		.pipe(mochaPhantomJS());
});

gulp.task('lint', function() {
	return gulp
		.src('**/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('clean', function() {
	return del([DEST]);
});

gulp.task('build:modules', function() {
	return createBuildStream({
		src: [SRC + '*.js', '!' + SRC + 'esencia.js'],
		base: SRC,
		exports: function(filePath) {
			return 'Esencia.' + capitalize(path.basename(filePath, '.js'));
		},
		dest: path.join(DEST, 'modules')
	});
});

gulp.task('build:bundle', function() {
	return createBuildStream({
		src: SRC + 'esencia.js',
		base: SRC,
		exports: 'Esencia',
		dest: DEST
	});
});

gulp.task('build', ['build:bundle']);

gulp.task('watch', function() {
	return gulp.watch(SRC + '*.js', ['build']);
});

gulp.task('dev', gulpSequence('clean', 'build', 'watch'));
