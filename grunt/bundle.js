/**
 * Client side source bundling
 *
 * grunt bundle
 * grunt watch:bundle
 */
module.exports = function(grunt) {

    var banner = '/* <%= pkg.name %> - <%= pkg.version %>\n'  +
                 ' * © <%= grunt.template.today("yyyy") %>\n' +
                 ' * @author <%= pkg.author %>\n' +
                 ' * @lisence <%= pkg.license %>\n' +
                 ' */';


    grunt.config.merge({

        browserify: {
            bundle: {
                files: [{
                    src : ['<%= pkg.cfg.baseDir %>/js/src/main.js'],
                    dest : '<%= pkg.cfg.baseDir %>/js/bundle.js'
                }]
            }
        },

        exorcise: {
            options: {
                base: '<%= pkg.cfg.baseDir %>'
            },
            bundle: {
                files: [{
                    src : ['<%= pkg.cfg.baseDir %>/js/bundle.js'],
                    dest : '<%= pkg.cfg.baseDir %>/js/bundle.js.map'
                }]

            }
        },

        uglify: {
            bundle: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapIn: '<%= pkg.cfg.baseDir %>/js/bundle.js.map',
                    banner: banner
                },
                files: [{
                    src  : ['<%= pkg.cfg.baseDir %>/js/bundle.js'],
                    dest : '<%= pkg.cfg.baseDir %>/js/bundle.min.js'
                }]
            }
        },

        clean: {
            bundle: {
                files: [{
                    expand: true,
                    cwd: '<%= pkg.cfg.baseDir %>/js',
                    src: ['bundle.js*']
                }]
            }
        },


        watch: {
            bundle: {
                files: ['<%= pkg.cfg.baseDir %>/js/src/**/*.js'],
                tasks: ['bundle'],
                options: {
                    livereload: true
                }
            }
        }
    });

    grunt.registerTask('bundle', 'Compile client side code', ['browserify:bundle', 'exorcise:bundle', 'uglify:bundle', 'clean:bundle']);
};
