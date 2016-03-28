/**
 * Sass compilation tasks
 *
 * grunt sass:compile
 * grunt watch:sass
 */
module.exports = function(grunt) {

    grunt.config.merge({
        sass :  {
            options: {
                sourceMap: true,
                outputStyle: 'compressed'
            },
            compile: {
                files : [{
                    dest: '<%= pkg.cfg.baseDir %>/css/foodprint.css',
                    src : '<%= pkg.cfg.baseDir %>/scss/foodprint.scss'
                }]
            }
        },
        watch: {
            sass: {
                files: ['<%= pkg.cfg.baseDir %>/scss/**/*.scss'],
                tasks: ['sass:compile'],
                options: {
                    livereload: true
                }
            }
        }
    });
};
