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
    clean: ['.tmp/', 'dist/', 'coverage/'],

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

    // JSCS
    jscs: {
      main: {
        files: {
          src: ['src/**/*.js', 'test/spec/**/*.js']
        },
        options: {
          config: '.jscsrc'
        }
      }
    },

    // Test Server
    connect: {
      test: {
        options: {
          port: 9001,
          base: [
            'test',
            'src'
          ]
        }
      },
      coverage: {
        options: {
          port: 9090,
          open: 'http://localhost:9090',
          keepalive: true,
          base: ['coverage/html']
        }
      }
    },

    // Test settings
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      test: {},
      debug: {
        singleRun: false
      },
      'ci-test': {
        signleRun: true,
        browsers: ['PhantomJS']
      },
      coverage: {
        preprocessors: {
          'src/**/*.js': 'coverage'
        },
        reporters: ['coverage'],
        coverageReporter: {
          reporters: [{
            type: 'html',
            subdir: 'html'
          }, {
            type: 'text',
            subdir: 'text'
          }]
        }
      },
      'ci-coverage': {
        browsers: ['PhantomJS'],
        singleRun: true,
        preprocessors: {
          'src/**/*.js': 'coverage'
        },
        reporters: ['coverage'],
        coverageReporter: {
          reporters: [{
            type: 'text-summary',
            subdir: 'text-summary'
          }, {
            type: 'lcov',
            subdir: 'lcov'
          }]
        }
      }
    },

    bumpup: {
      files: ['package.json', 'bower.json']
    }

  });

  // Register tasks
  grunt.registerTask('build', ['clean', 'jshint:all', 'jscs', 'replace:strict', 'concat', 'uglify']);
  grunt.registerTask('test', ['clean', 'jshint:all', 'jscs', 'jshint:test', 'connect:test', 'karma:test', 'karma:coverage']);
  grunt.registerTask('coverage', ['connect:test', 'karma:coverage', 'connect:coverage']);
  grunt.registerTask('default', ['test', 'build']);
  grunt.registerTask('debug', ['connect:test', 'karma:debug']);
  grunt.registerTask('test-ci', ['clean', 'jshint:all', 'jshint:test', 'connect:test', 'karma:ci-test', 'karma:ci-coverage']);

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
