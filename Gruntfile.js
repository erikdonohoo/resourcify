'use strict';

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Define the configuration for all the tasks
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    // Concat files
    concat: {
      dist: {
        src: [
          'module.prefix',
          '.tmp/main.js',
          '.tmp/*.js',
          'module.suffix'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },

    // Clean
    clean: ['.tmp/', 'dist/'],

    // Remove 'use strict' repetition
    replace: {
      strict: {
        src: ['src/**/*.js'],
        dest: '.tmp/',
        replacements: [{
          from: '\'use strict\';\n\n',
          to: ''
        }]
      }
    },

    // Minify
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> v<%= pkg.version %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },

    // JShint
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: ['src/**/*.js'],
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/**/*.js']
      }
    },

    // Test Server
    connect: {
      test: {
        options: {
          port: 9001,
          base: [
            '.tmp',
            'test',
            'src'
          ]
        }
      }
    },

    // Test settings
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        singleRun: true
      }
    },

    bumpup: {
      files: ['package.json', 'bower.json']
    }

  });

  // Register tasks
  grunt.registerTask('build', ['clean', 'jshint:all', 'replace:strict', 'concat', 'uglify']);
  grunt.registerTask('test', ['jshint:all', 'jshint:test', 'connect:test', 'karma']);
  grunt.registerTask('default', ['test', 'build']);

  // When version bump is occurring, test, bump version, build and update changelog
  grunt.registerTask('bump', function (version) {
    var tasks = [], type;
    if (version === 'pre') {
      type = 'prerelease';
    } else if (version === 'bug') {
      type = 'patch';
    } else if (version === 'minor') {
      type = 'minor';
    } else if (version === 'major') {
      type = 'major';
    } else {
      type = version;
    }

    tasks.push('test');
    tasks.push('bumpup:' + type);
    tasks.push('build');

    grunt.task.run(tasks);
  });
};
