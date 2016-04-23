
module.exports = function(grunt) {

    grunt.initConfig({

        sass: {
            options: {
                sourceMap: true,
                outputStyle: 'compressed'
            },
            compile: {
                files: {
                    'public/css/foodprint.css': ['public/scss/foodprint.scss']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-sass');

};
