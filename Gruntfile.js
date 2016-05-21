module.exports = function(grunt) {


    grunt.initConfig({

        cfg: grunt.file.readJSON('config.json'),

        sass: {
            options: {
                sourceMap: true,
                outputStyle: 'compressed'
            },
            compile: {
                files : [{
                    dest: '<%= cfg.baseDir %>css/foodprint.css',
                    src : '<%= cfg.baseDir %>scss/foodprint.scss'
                }]
            }
        },

        connect: {
            options: {
                hostname: '<%= cfg.server.host %>',
                port: '<%= cfg.server.port %>',
                base: '<%= cfg.baseDir %>'
            },
            preview: {
                options: {
                    open: true
                }
            },
            dev: {
                options: {
                    livereload: true
                }
            }
        },

        open: {
            dev: {
                path: 'http://<%= cfg.server.host %>:<%= cfg.server.port %>/index.html',
                app: '<%= cfg.browser %>'
            }
        },

        //tests

        qunit: {
            test: {
                options: {
                    urls: grunt.file.expand('public/js/test/**/test.html')
                        .map(function(url) {
                            return 'http://<%= cfg.server.host %>:<%= cfg.server.port %>/' + url.replace('public/', '');
                        })
                }
            }
        },



        //bundling related configuration

        browserify: {
            options: {
                transform: [
                    ['babelify', {
                        'presets': ['es2015']
                    }]
                ],
                browserifyOptions: {
                    debug: true
                }
            },
            bundle: {
                files: [{
                    dest : '<%= cfg.baseDir %>js/bundle.js',
                    src  : ['<%=cfg.baseDir%>js/src/main.js']
                }]
            },
            test: {
                files: [{
                    expand: true,
                    cwd: '<%=cfg.baseDir%>js/test/',
                    dest: '<%=cfg.baseDir%>js/test/',
                    src: '**/test.js',
                    ext: '.bundle.js'
                }]
            }
        },

        exorcise: {
            options: {
                base: '<%=cfg.baseDir%>'
            },
            bundle: {
                files: [{
                    dest : '<%=cfg.baseDir%>js/bundle.js.map',
                    src  : ['<%=cfg.baseDir%>js/bundle.js']
                }]
            }
        },

        uglify: {
            bundle: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapIn: '<%= cfg.baseDir %>js/bundle.js.map',
                    banner: '/* Foodprint.io 0.1.0'  +
                            ' * © <%= grunt.template.today("yyyy") %>' +
                            ' */'
                },
                files: [{
                    dest : '<%= cfg.baseDir %>js/bundle.min.js',
                    src  : ['<%= cfg.baseDir %>js/bundle.js']
                }]
            }
        },

        // update dd

        foodfact: {
            update: {
                urls: [
                    'http://world.openfoodfacts.org/data/data-fields.txt',
                    'http://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv'
                ],
                files: {
                    'data/db.json': 'data/*.csv'
                },
                options: {
                    download: false
                }
            }
        },

        //tasks management

        clean: {
            options: {
                force: true
            },
            bundle: {
                files: [{
                    expand: true,
                    cwd: '<%= cfg.baseDir %>js',
                    src: ['bundle.js*']
                }]
            },
            update: ['data/db.json']
        },
        watch: {
            dev: {
                files: ['<%= cfg.baseDir %>js/src/**/*.js'],
                tasks: ['bundle'],
                options: {
                    livereload: true
                }
            },
            test: {
                files: ['<%= cfg.baseDir %>js/test/**/test.js', '<%=cfg.baseDir%>js/src/**/*.js'],
                tasks: ['browserify:test', 'qunit:test']
            },
            sass: {
                files: ['<%= cfg.baseDir %>js/scss/**/*.scss'],
                tasks: ['sass:compile'],
                options: {
                    livereload: true
                }
            }
        },


        concurrent: {
            dev: {
                tasks: ['watch:dev', 'watch:test', 'watch:sass'],
                options: {
                    logConcurrentOutput: true
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

