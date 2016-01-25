module.exports = function(grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        mochaTest : {
            options: {
                reporter: 'spec',
                require: 'babel-register'
            },
            unit : {
                src: ['test/**/*_spec.js']
            },
            integration : {
                src: ['test/integration/**/*.js']
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

    grunt.registerTask(
        'test',
        'Run automated tests',
        ['mochaTest:unit', 'mochaTest:integration']
    );
};

