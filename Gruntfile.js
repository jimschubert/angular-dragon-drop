/*global module:false*/
module.exports = function (grunt) {
    var pkg = grunt.file.readJSON('package.json');

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: pkg,
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name || pkg.author %>;' +
        ' License: <%= pkg.license %> */\n',
        // Task configuration.
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            dist: {
                src: ['<%= pkg.name %>.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '<%= banner %>',
                sourceMap: true
            },
            dist: {
                src: '<%= concat.dist.dest %>',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                browser: true,
                globals: {
                    jQuery: true
                }
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            //lib_test: {
            //  src: ['lib/**/*.js', 'test/**/*.js']
            //}
        },
        //qunit: {
        //  files: ['test/**/*.html']
        //},
        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile']
            },
            //lib_test: {
            //  files: '<%= jshint.lib_test.src %>',
            //  tasks: ['jshint:lib_test', 'qunit']
            //}
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Modify bower.json on build to keep version numbers in sync.
    grunt.registerTask('bowup', function () {
        var bowerJSON = "bower.json";

        if (!grunt.file.exists(bowerJSON)) {
            grunt.log.error("%s does not exist", bowerJSON);
        } else {
            var bower = grunt.file.readJSON(bowerJSON);
            bower.version = pkg.version;

            grunt.file.write(bowerJSON, JSON.stringify(bower, null, 4));
        }
    });

    // Default task.
    grunt.registerTask('default', ['jshint', /* 'qunit', */ 'concat', 'uglify', 'bowup']);
};
