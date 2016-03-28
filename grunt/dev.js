/**
 * Development and preview mode
 *
 * grunt dev
 * grunt preview
 */
module.exports = function(grunt) {

    grunt.config.merge({
        connect: {
            options: {
                hostname: '<%= pkg.cfg.host %>',
                port: '<%= pkg.cfg.port %>',
                base: '<%= pkg.cfg.baseDir %>'
            },
            preview: { },
            dev: {
                options: {
                    livereload: true
                }
            }
        },

        open: {
            dev: {
                path: 'http://<%=pkg.cfg.host%>:<%=pkg.cfg.port%>/index.html',
                app: '<%= pkg.cfg.browser %>'
            }
        }
    });

    grunt.registerTask('preview', 'Preview the application', ['bundle', 'sass:compile', 'connect:preview:keepalive']);
    grunt.registerTask('dev',     'Run development mode',    ['connect:dev', 'open:dev', 'watch']);
};
