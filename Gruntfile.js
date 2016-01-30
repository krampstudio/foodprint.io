module.exports = function(grunt) {

    grunt.initConfig({

        browserify: {
            options: {
                transform: [
                    ['babelify', {
                        'presets' : ['es2015']
                    }]
                ]
            },
            bundle: {
                files: {
                    'public/js/bundle.js': ['public/js/src/main.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true
                    }
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

    grunt.registerTask('bundle', 'Generate client side bundles', ['browserify:bundle', 'exorcise:bundle', 'uglify:bundle', 'clean:bundle']);
};

