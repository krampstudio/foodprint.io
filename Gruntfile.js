module.exports = function(grunt) {


    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        sass: {
            options: {
                sourceMap: true,
                outputStyle: 'compressed'
            },
            compile: {
                files : [{
                    dest: '<%= pkg.cfg.baseDir %>css/foodprint.css',
                    src : '<%= pkg.cfg.baseDir %>scss/foodprint.scss'
                }]
            }
        },

        connect: {
            options: {
                hostname: '<%= pkg.cfg.server.host %>',
                port: '<%= pkg.cfg.server.port %>',
                base: '<%= pkg.cfg.baseDir %>'
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
                path: 'http://<%= pkg.cfg.server.host %>:<%= pkg.cfg.server.port %>/index.html',
                app: '<%= pkg.cfg.browser %>'
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
                    dest : '<%= pkg.cfg.baseDir %>js/bundle.js',
                    src  : ['<%= pkg.cfg.baseDir %>js/src/main.js']
                }]
            },
            test: {
                files: [{
                    expand: true,
                    cwd: '<%= pkg.cfg.baseDir %>js/test/',
                    dest: '<%= pkg.cfg.baseDir %>js/test/',
                    src: '**/test.js',
                    ext: '.bundle.js'
                }]
            }
        },

        exorcise: {
            options: {
                base: '<%= pkg.cfg.baseDir %>'
            },
            bundle: {
                files: [{
                    dest : '<%= pkg.cfg.baseDir %>js/bundle.js.map',
                    src  : ['<%= pkg.cfg.baseDir %>js/bundle.js']
                }]
            }
        },

        uglify: {
            bundle: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapIn: '<%= pkg.cfg.baseDir %>js/bundle.js.map',
                    banner: '/* Foodprint.io 0.1.0'  +
                            ' * © <%= grunt.template.today("yyyy") %>' +
                            ' */'
                },
                files: [{
                    dest : '<%= pkg.cfg.baseDir %>js/bundle.min.js',
                    src  : ['<%= pkg.cfg.baseDir %>js/bundle.js']
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
                    cwd: '<%= pkg.cfg.baseDir %>js',
                    src: ['bundle.js*']
                }]
            },
            update: ['data/db.json']
        },
        watch: {
            dev: {
                files: ['<%= pkg.cfg.baseDir %>js/src/**/*.js'],
                tasks: ['bundle'],
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

