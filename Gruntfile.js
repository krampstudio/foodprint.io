module.exports = function(grunt) {

    grunt.initConfig({

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    require: ['babel-register']
                },
                src: ['test/**/*.js']
            }
        },

        eslint: {
            all: ['**/*.js', '!node_modules/**/*.js']
        },

        sass: {
            options: {
                sourceMap: true,
                outputStyle: 'compressed'
            },
            compile: {
                files: {
                    'public/css/foodprint.min.css': 'public/scss/foodprint.scss'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-mocha-test');
};

