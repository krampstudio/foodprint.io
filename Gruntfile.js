
module.exports = function(grunt) {

    grunt.initConfig({

        sass: {
            compile: {
                files: {
                    'public/css/foodprint.css': ['public/scss/*.scss']
                },
                options: {
                    sourceMap: true,
                    outputStyle: 'compressed'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-sass');

};
