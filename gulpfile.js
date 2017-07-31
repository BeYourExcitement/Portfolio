/*
TASKS
  TODO : handle errors from git commands in deploy task
  TODO : implement cli args (cliOptions) for git commit messages in deploy task
  TODO : peruse over comments and alter if neccessary
  TODO : Concatenate JavaScript and CSS files inside this task too

NOTES
  Task "htmllint" runs really slow

  Function "cmdLineArgGetter" : consider refactoring to return an cliOptions object rather than just
  modifying cliOptions object which is outside the functions scope

*/
var gulp = require ("gulp")
// Only loads plugins that begin with "gulp"
var gulpLoadPlugins = require ("gulp-load-plugins")
var plugins = gulpLoadPlugins ({
  rename: {
    'gulp-csslint': "cssLint",
    "gulp-html": "htmlLint",
    "gulp-if": "gulpIf",
    "gulp-imagemin": "imageMin",
    "gulp-postcss": "postCss"
  }
})
var pump = require ("pump")
var runSequence = require ("run-sequence")
var del = require("del")
var browserSync = require("browser-sync").create()
var child_process = require ('child_process')
var exec = child_process.exec
var execSync = child_process.execSync
var spawnSync = child_process.spawnSync
var fs = require ("fs")
var pkgVersion = JSON.parse (fs.readFileSync ("./package.json", "utf8")).version
// var combiner = require("stream-combiner2")

/*
* Useable Plugin var names (names may not match package.json in order to have a more accurate name)
    htmlLint
    jshint
    cssLint
    sass
    cleanCss
    uglify
    imageMin
    postCss
    gulpIf
    sourcemaps
    concat
    bump
    rename
    pump
    jasmine
    runSequence
    del
    combiner: stream-combiner2
    browserSync
*/

var pluginOptions = {
  bump: {
    major: {type: "major"},
    minor: {type: "minor"},
    patch: {type: "patch"},
    reset: {version: "0.0.0"}
  }
}

// Options object to hold command line parameters for task decision making and pluginOptions
var cliOptions = {
  all: false,
  major: false,
  minor: false,
  patch: false,
  reset: false,
  production: false
}

// File Sources and Destinations
var paths = {
  html: "./index.html",
  css: "./styles/*.css",
  sass: "./sass/*.scss",
  js: "./js/*.js",
  appSpec: "./spec/app/appSpec.js",
  img: "./images/*",
  pkgJSON: "./package.json",
  dist: "./dist/*",
  cwd: "./"
}

var dest = {
  dist: gulp.dest ("./dist"),
  compiledSass: gulp.dest ("./styles"),
  css: gulp.dest ("./dist/styles"),
  js: gulp.dest ("./dist/js"),
  img: gulp.dest ("./dist/images"),
  cwd: gulp.dest ("./")
}

/*
Retrieves CLI Arguments and sets them in "cliOptions" object

CLI argument syntax : [ --key ] [ "value" ]
    * keys must be prefixed with "--" and its value will default to "true"
    * values should just be quoted as a string and will be assigned to
        the previously given key
*/
var cmdLineArgGetter = function () {
  // Acquires arguments from command line. Specifically from Node {process.argv}
  var argv = process.argv.slice (3)
  var argvLength = argv.length
  // Loops through argv and assign args into "cliOptions" object.

  // By default it will assign CLI arguments with a flag ("--"), to true. If arg does not have a
  // flag, set it as the value of the previously given arg

  for (var i = 0; i < argvLength; i++) {
    var currentArg = argv[i]
    if (currentArg[0] === "-") {
      // Modifies cliOptions object outside this function
      cliOptions[currentArg.slice(2)] = true
    } else {
      // set current arg as the value of the previous arg
      var previousArg = argv[i - 1].slice (2)
      cliOptions[previousArg] = currentArg
    }
  }
}
cmdLineArgGetter()

// Error handler for gulp task • check Node.js docs to understand node errors
var errorHandler = function (error) {
  console.log ("Inside errorHandler : There was an error")
  // console.log (err)
  // return console.error ("There was an error", err)
}

/*
  Gulp Tasks Below

*/
// Default to test that gulp is running
gulp.task ("default", function () {
  console.log ("Gulp is running!")
})

// Deletes Dist and style folder
gulp.task("del", function (){
  console.log('Deletes contents of "styles/" and "dist/"')
  return del([paths.css, paths.dist])
})

// Lint HTML files
gulp.task ("htmllint", function (errorHandler) {
  pump (gulp.src (paths.html), plugins.htmlLint(), dest.dist, errorHandler)
})

// Lint CSS files
gulp.task ("csslint", function (errorHandler) {
  pump (
    gulp.src (paths.css),
    plugins.cssLint(),
    plugins.cssLint.formatter ("text"),
    plugins.gulpIf(cliOptions.production === true, plugins.cssLint.formatter("fail")),
    errorHandler
  )
})

// Lint JavaScript files
// I relocated the jshint-stylish javascript file into the "node_modules/jshint/src/reporters/stylish.js"
// Normally I would have to {require ("jshint-stylish")}
gulp.task ("jshint", function (errorHandler) {
  pump (
    gulp.src (paths.js),
    plugins.jshint ({
      asi: true, // Don't worry about missing semicolons
      undef: true, // Warn about undeclared globals
      unused: true, // Warns when there are unused defined variables
      globals: { // Pass in a list of globals we don't want warnings about
        module: true,
        require: true,
        console: true,
        window: true,
        document: true,
        debug: true,
        alert: true,
        process: true,
        pkg: true
      }
    }),
    plugins.jshint.reporter ("stylish"),
    plugins.gulpIf(cliOptions.production === true, plugins.jshint.reporter("fail")),
    errorHandler
  )
})

// JS Testing Using Jasmine.
// it fails because "window" is undefined in js/app.js
gulp.task ("test", function (errorHandler) {
  pump (
    gulp.src(paths.appSpec),
    plugins.jasmine(),
    errorHandler
  )
})

// // Compiles Sass into CSS
gulp.task ("sass", function (errorHandler) {
  pump (
    gulp.src (paths.sass),
    plugins.sourcemaps.init (),
    plugins.sass (),
    plugins.sourcemaps.write (),
    plugins.rename("./style.css"),
    gulp.dest("./styles"),
    browserSync.stream(),
    errorHandler
  )
})

// Minify javascript, css, and image files
// "add \"--all\" if you want to include images"
gulp.task ("minify", function (errorHandler) {
  // var imgMinPumpStream = combiner ([
  //   gulp.src (paths.img),
  //   plugins.imageMin(),
  //   dest.img
  // ])

  // JS and CSS minify
  pump (
    gulp.src (paths.js),
    plugins.uglify(),
    dest.js,
    gulp.src (paths.css),
    plugins.cleanCss(),
    dest.css,
    // plugins.gulpIf (cliOptions.all, gulp.src (paths.img)),
    // plugins.gulpIf (cliOptions.all, plugins.imageMin()),
    // plugins.gulpIf (cliOptions.all, dest.img),
    errorHandler
  )
  // Image minify : if this runs, an error will come up but it will still execute
  // might be able to use gulp-util.buffer to get around this error
  if (cliOptions.all) {pump (gulp.src (paths.img), plugins.imageMin(), dest.img, errorHandler)}
})

// Versioning
gulp.task ("version", function (errorHandler) {
  // loop through ["major", "minor", "patch", "reset"] and set plugins.bump (type: {{SEMVER TYPE}} )
  var semverOptions = ["major", "minor", "patch", "reset"]
  // Gets matching string from cliOptions and semverOptions
  var bumpOption = semverOptions
    .filter( function (item) { return cliOptions[item] === true })
    .map( function (item) { return item = pluginOptions.bump[item] })

  // Checks if a CLI argument was given by checking length. Defaults to prerelease
  bumpOption = bumpOption.length === 0 || bumpOption.length > 1
    ? {type: "prerelease"}
    : bumpOption[0]
  console.log(bumpOption)

  pump (
    gulp.src ([paths.pkgJSON, paths.html]),
    plugins.bump( bumpOption ),
    dest.cwd,
    errorHandler
  )
})

// Build : a fully linted, compiled, and minified project
gulp.task ("build", function () {
  cliOptions.production === true
    ? runSequence (["htmllint", "jshint", "sass"], "csslint", "minify", "version")
    : runSequence (["htmllint", "jshint", "sass"], "csslint", "minify")
})

// Develop with actively updating documents
gulp.task("develop", ["sass"], function() {
  browserSync.init({
    server: paths.cwd
  })

  gulp.watch(paths.sass, ["sass"]).on ("change", browserSync.reload)
  gulp.watch(paths.js, ["jshint"]).on ("change", browserSync.reload)
  gulp.watch(paths.html).on ("change", browserSync.reload)
})

// Deploy : run build, update version of index.html/package.json, push to repository
gulp.task ("deploy", ["build"], function (errorHandler) {
  var oldVersion = pkgVersion
  var newVersion = JSON.parse (fs.readFileSync ("./package.json", "utf8")).version

  // exec ('echo "Updating from ' + oldVersion + ' to ' + newVersion + '"', function (error, stdout, stderr) {
  //   if (error) {
  //     console.log(error)
  //     errorHandler()
  //   } else {
  //     console.log(error)
  //     console.log(stdout)
  //   }
  // })

  var gitAdd = spawnSync ("git", ['add', '-A'])

  if (gitAdd.error) {
    console.log("Inside gitAdd error")
    errorHandler()
  }
  console.log(gitAdd.stdout.toString("utf8"))

  var gitCommit = spawnSync ('git',
    ['commit', '-am', '"' + "Updating from " + oldVersion + ' to ' + newVersion + '"']
  )
  console.log(gitCommit.stdout.toString("utf8"))

  // var gitPush = spawnSync ('git', ['push'])
  // console.log(gitPush.stdout.toString("utf8"))
  errorHandler()
})

// Watches JavaScript files
gulp.task ("watch", function () {
  gulp.watch ("./js/*.js", ["jshint"])
  // Use gulpIf to decide whether a task/plugin should run
  //  need to find out which file triggered event
})
