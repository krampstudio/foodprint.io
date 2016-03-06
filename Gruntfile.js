module.exports = function(grunt) {

    //environment
    var env = grunt.option('env');
    if(grunt.option('no-env')){
        env = 'dev';
    }
    var cssStyles = {
        'dev' : 'expanded',
        'test': 'nested',
        'prod': 'compressed'
    };

    grunt.log.debug('Environment: ' + env);
    if(!cssStyles[env]){
        grunt.log.warn('Unknow environment: ' + env);
    }

    grunt.initConfig({

        sass: {
            options: {
                sourceMap : true,
                outputStyle : cssStyles[env]
            },
            compile: {
                'public/css/foodprint.css' : 'public/scss/foodprint.scss'
            }
        },

        connect: {
            options : {
                hostname: '127.0.0.1',
                port: 4321,
                base : 'public'
            },
            preview : {
                options: {
                    open : true
                }
            },
            dev : {
                options: {
                    livereload : true
                }
            }
        },

        open : {
            dev : {
                path: 'http://127.0.0.1:4321/index.html',
                app : 'fxdev'
            }
        },

        qunit : {
            test: {
                options: {
                    urls : grunt.file.expand('public/js/test/**/test.html').map(function(url){
                        return 'http://127.0.0.1:4321/' + url.replace('public/', '');
                    })
                }
            }
        },

        watch : {
            dev : {
                files: ['public/js/src/**/*.js'],
                tasks: ['bundle'],
                options : {
                    livereload : true
                }
            },
            test : {
                files: ['public/js/test/**/test.js', 'public/js/src/**/*.js'],
                tasks: ['browserify:test', 'qunit:test']
            },
            sass: {
                files: ['public/js/scss/**/*.scss'],
                tasks: ['sass:compile'],
                options : {
                    livereload : true
                }
            }
        },


        concurrent: {
            dev: {
                tasks : ['watch:dev', 'watch:test', 'watch:sass'],
                options: {
                    logConcurrentOutput : true
                }
            }
        },

        browserify: {
            options: {
                transform: [
                    ['babelify', {
                        'presets' : ['es2015']
                    }]
                ],
                browserifyOptions: {
                    debug: true
                }
            },
            bundle: {
                files: {
                    'public/js/bundle.js': ['public/js/src/main.js']
                }
            },
            test : {
                files : [{
                    expand: true,
                    cwd: 'public/js/test/',
                    dest: 'public/js/test/',
                    src: '**/test.js',
                    ext: '.bundle.js'
                }]
            }
        },

        exorcise: {
            options: {
                base: 'public'
            },
            bundle: {
                files: {
                    'public/js/bundle.js.map': ['public/js/bundle.js']
                }
            }
        },

        uglify: {
            bundle: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapIn: 'public/js/bundle.js.map'
                },
                files: {
                    'public/js/bundle.min.js': ['public/js/bundle.js']
                }
            }
        },

        clean: {
            bundle : {
                files : [{
                    expand: true,
                    cwd: 'public/js',
                    src: ['bundle.js*']
                }]
            }
        },

        foodfact: {
            dist : {

            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-exorcise');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-foodfact');


    grunt.registerTask('bundle', 'Compile client side code', ['browserify:bundle', 'exorcise:bundle', 'uglify:bundle', 'clean:bundle']);

    grunt.registerTask('test', 'Run client side tests', ['browserify:test', 'connect:dev', 'qunit:test']);


    grunt.registerTask('build', 'Compile and test, before releasing', ['bundle', 'sass:compile', 'test']);

    grunt.registerTask('preview', 'Preview the app', ['bundle', 'sass:compile', 'connect:preview:keepalive']);

    grunt.registerTask('dev', 'Run development mode', ['connect:dev', 'open:dev', 'concurrent:dev']);

};

