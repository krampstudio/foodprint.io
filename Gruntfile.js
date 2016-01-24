module.exports = function(grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        connect: {
            options : {
                hostname: '<%=pkg.config.host%>',
                port:     '<%=pkg.config.port%>',
                base:     'public'
            },
            preview: {
                options: {
                    livereload : true
                }
            }
        },


        mochaTest : {
            test: {
                options: {
                    reporter: 'spec',
                    require: 'babel-register'
                },
                src: ['test/**/*_spec.js']
            }
        },

        open: {
            preview: {
                path: 'http://<%=pkg.config.host%>:<%=pkg.config.port%>/index.html',
                app:  '<%=pkg.config.browser%>'
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
        },

        watch : {
            options: {
                livereload : true
            },
            dev : {
                files: ['public/scss/**/*.scss'],
                tasks: ['sass:compile']
            }
        }

    });



    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('dev', ['connect:preview', 'open:preview', 'watch:dev']);
};

