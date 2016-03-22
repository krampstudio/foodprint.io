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

    var connectUrl = 'http://127.0.0.1:4321/';
    var testUrls =  grunt.file.expand('public/js/test/**/test.html')
                        .map(function(url){
                            return connectUrl + url.replace('public/', '');
                        });

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
                path: connectUrl + 'index.html',
                app : 'fxdev'
            }
        },

        qunit : {
            test: {
                options: {
                    urls : testUrls
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

//bundling related configuration

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
            options: {
                force : true
            },
            bundle : {
                files : [{
                    expand: true,
                    cwd: 'public/js',
                    src: ['bundle.js*']
                }]
            },
            update : ['data/db.json']
        },

        foodfact: {
            update : {
                urls: [
                    'http://world.openfoodfacts.org/data/data-fields.txt',
                    'http://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv'
                ],
                files: {
                    'data/db.json' : 'data/*.csv'
                },
                options: {
                    download : false
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('bundle', 'Compile client side code', ['browserify:bundle', 'exorcise:bundle', 'uglify:bundle', 'clean:bundle']);

    grunt.registerTask('test', 'Run client side tests', ['browserify:test', 'connect:dev', 'qunit:test']);

    grunt.registerTask('build', 'Compile and test, before releasing', ['bundle', 'sass:compile', 'test']);

    grunt.registerTask('preview', 'Preview the app', ['bundle', 'sass:compile', 'connect:preview:keepalive']);

    grunt.registerTask('dev', 'Run development mode', ['connect:dev', 'open:dev', 'concurrent:dev']);

};

