module.exports = function(grunt) {

    grunt.initConfig({

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
                app : 'firefox'
            }
        },

        watch : {
            dev : {
                files: ['public/js/src/**/*.js'],
                tasks: ['bundle'],
                options : {
                    livereload : true
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
    grunt.loadNpmTasks('grunt-exorcise');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-open');


    grunt.registerTask('bundle', 'Generate client side bundles', ['browserify:bundle', 'exorcise:bundle', 'uglify:bundle', 'clean:bundle']);

    grunt.registerTask('preview', 'Preview the app', ['bundle', 'connect:preview:keepalive']);
    grunt.registerTask('dev', 'Run development mode', ['connect:dev', 'open:dev', 'watch:dev']);
};

