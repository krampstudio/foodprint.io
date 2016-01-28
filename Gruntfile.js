module.exports = function(grunt) {

    grunt.initConfig({

        clean: {
            coverage: {
                src: ['coverage']
            }
        },


        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    require: ['babel-register']
                },
                src: ['test/**/*.js']
            }
        },

        shell: {
            coverage: {
                command: 'node_modules/.bin/babel-node node_modules/.bin/isparta cover node_modules/.bin/_mocha -- test/**/*.js'
            }
        },

        open : {
            coverage: {
                path : './coverage/lcov-report/index.html'
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
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('coverage', ['clean:coverage', 'mochaTest:test', 'shell:coverage', 'open:coverage']);
};

