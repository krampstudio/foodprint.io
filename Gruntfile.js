module.exports = function(grunt) {

    grunt.initConfig({
        sass: {
            options: {
                sourceMap: true,
                outputStyle: 'compressed'
            },
            compile: {
                files: {
                    'public/css/foodprint.css': ['public/scss/foodprint.scss']
                }
            }
        },
        browserify: {
            bundle: {
                files: {
                    'public/js/bundle.min.js': ['public/js/src/main.js']
                },
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
            }
        },
        connect: {
            preview: {
                options: {
                    hostname: '127.0.0.1',
                    port: '4321',
                    base: 'public'
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('preview', 'Preview the application', ['browserify:bundle', 'sass:compile', 'connect:preview:keepalive']);
};
