module.exports = function(grunt) {

    grunt.initConfig({

        sass: {
            options: {
                sourceMap : true,
                outputStyle : 'compressed'
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
            }
        },


        concurrent: {
            dev: {
                tasks : ['watch:dev', 'watch:test'],
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


    grunt.registerTask('bundle', 'Generate client side bundles', ['browserify:bundle', 'exorcise:bundle', 'uglify:bundle', 'clean:bundle']);

    grunt.registerTask('test', 'Run client side tests', ['browserify:test', 'connect:dev', 'qunit:test']);

    grunt.registerTask('preview', 'Preview the app', ['bundle', 'connect:preview:keepalive']);

    grunt.registerTask('dev', 'Run development mode', ['connect:dev', 'open:dev', 'concurrent:dev']);

};

