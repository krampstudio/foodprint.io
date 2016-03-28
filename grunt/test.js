/**
 * Tests tasks
 *
 * grunt test
 * grunt connect:test watch:test
 */
module.exports = function(grunt) {

    /**
     * Get the list of unit tests URLS
     * The urls contains grunt templates
     */
    var getTests = function getTests(){
        var baseDir = grunt.config('pkg').cfg.baseDir;
        return grunt.file.expand(baseDir + '/js/test/**/test.html')
                .map(function(url) {
                    return 'http://<%=pkg.cfg.host%>:<%=pkg.cfg.port%>/' + url.replace(baseDir, '');
                });
    };

    grunt.config.merge({

        browserify: {
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

        qunit: {
            test: {
                options: {
                    urls: getTests()
                }
            }
        },

        //global options define on Gruntfile.js
        connect: {
            test: {
            }
        },

        watch: {
            test: {
                files: ['<%= pkg.cfg.baseDir %>js/test/**/test.js', '<%= pkg.cfg.baseDir %>js/src/**/*.js'],
                tasks: ['browserify:test', 'qunit:test']
            },
            options: {
                livereload: true
            }
        }
    });

    grunt.registerTask('test', 'Run client side tests', ['browserify:test', 'connect:test', 'qunit:test']);
};
