module.exports = function(grunt) {

    grunt.initConfig({
        eslint: {
            all: ['**/*.js', '!node_modules/**/*.js']
        }
    });

grunt.loadNpmTasks('grunt-eslint');
};

