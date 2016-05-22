module.exports = function(grunt){

    grunt.config('qunit', {
        test: {
            options: {
                urls: grunt.file.expand('public/js/test/**/test.html')
                    .map(function(url) {
                        return 'http://<%= pkg.cfg.server.host %>:<%= pkg.cfg.server.port %>/' + url.replace('public/', '');
                    })
            }
        }
    });

    grunt.config('watch', {
        test: {
            files: ['<%= pkg.cfg.baseDir %>js/test/**/test.js', '<%=pkg.cfg.baseDir%>js/src/**/*.js'],
            tasks: ['browserify:test', 'qunit:test']
        }
    });
};
