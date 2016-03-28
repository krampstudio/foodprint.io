module.exports = function(grunt) {

    grunt.config.merge({
        // update db
        foodfact: {
            update: {
                urls: [
                    'http://world.openfoodfacts.org/data/data-fields.txt',
                    'http://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv'
                ],
                files: {
                    '<%= pkg.cfg.dataDir %>/db.json': '<%= pkg.cfg.dataDir %>/*.csv'
                },
                options: {
                    download: false
                }
            }
        },
        clean: {
            update: ['<%= pkg.cfg.dataDir %>/db.json']
        }
    });
};
