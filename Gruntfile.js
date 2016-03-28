/**
 * Default Grunt configuration.
 * Tasks are conbfigured into their respective files :
 *  - grunt/sass.js   : SCSS compilcation
 *  - grunt/test.js   : compile and run tests
 *  - grunt/bundle.js : compile and optimize client side js
 *  - grunt/dev.js    : development modes
 */
module.exports = function(grunt) {

    grunt.initConfig({

    //load config and metadata
        pkg: grunt.file.readJSON('package.json'),

    //tasks default configuration/options
        browserify: {
            options: {
                transform: [
                    ['babelify', {
                        'presets': ['es2015']
                    }]
                ],
                browserifyOptions: {
                    debug: true
                }
            }
        },
        connect: {
            options: {
                hostname: '<%= pkg.cfg.host %>',
                port: '<%= pkg.cfg.port %>',
                base: '<%= pkg.cfg.baseDir %>',
                livereload: false
            }
        },
        clean: {
            options: {
                force : true
            }
        }
    });

    //load npm tasks
    require('load-grunt-tasks')(grunt);

    //load configurations into the grunt folder
    grunt.loadTasks('grunt/');

    //the default task
    grunt.registerTask('build',   'Compile and test, before releasing', ['bundle', 'sass:compile', 'test']);
    grunt.registerTask('default', 'Compile and test, before releasing', ['build']);
};

