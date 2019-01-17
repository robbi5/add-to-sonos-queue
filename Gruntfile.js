module.exports = function(grunt) {
  grunt.initConfig({
    clean: ['dist/'],
    browserify: {
      background: {
        src: ['src/lib/sonos.js', 'src/js/background.js'],
        dest: 'dist/js/background.js',
        options: {
          alias: ['./src/lib/sonos.js:sonos']
        }
      },
      app: {
        src: ['src/lib/sonos.js', 'src/page_action/page_action.js'],
        dest: 'dist/js/app.js',
        options: {
          alias: ['./src/lib/sonos.js:sonos']
        }
      },
      content_sc: {
        src: ['src/lib/mutation-summary.js', 'src/content_script/sc/content.js'],
        dest: 'dist/js/sc/content.js',
        options: {
          alias: ['./src/lib/mutation-summary.js:mutation-summary']
        }
      },
      content_sc_widget: {
        src: ['src/lib/mutation-summary.js', 'src/content_script/sc/widget.js'],
        dest: 'dist/js/sc/widget.js',
        options: {
          alias: ['./src/lib/mutation-summary.js:mutation-summary']
        }
      },
      content_ht: {
        src: ['src/lib/mutation-summary.js', 'src/content_script/ht/content.js'],
        dest: 'dist/js/ht/content.js',
        options: {
          alias: ['./src/lib/mutation-summary.js:mutation-summary']
        }
      }
    },
    copy: {
      manifest: {
        src: 'src/manifest.json',
        dest: 'dist/manifest.json'
      },
      icons: {
        expand: true,
        src: 'src/icons/*.png',
        dest: 'dist/icons/',
        flatten: true,
        filter: 'isFile'
      },
      css: {
        expand: true,
        cwd: 'src/css',
        src: '**',
        dest: 'dist/css/',
        flatten: false,
        filter: 'isFile'
      },
      content_script: {
        expand: true,
        src: 'src/content_script/*.gif',
        dest: 'dist/content_script/',
        flatten: true,
        filter: 'isFile'
      },
      page_action: {
        expand: true,
        src: 'src/page_action/**',
        dest: 'dist/page_action/',
        flatten: true,
        filter: 'isFile'
      },
      settings: {
        expand: true,
        src: 'src/settings/**',
        dest: 'dist/settings/',
        flatten: true,
        filter: 'isFile'
      }
    },
    compress: {
      main: {
        options: {
          archive: 'add-to-sonos-queue.zip'
        },
        files: [
          {expand: true, src: ['**/*'], dest: '/', cwd: 'dist/'}
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.registerTask('default', ['clean', 'browserify', 'copy']);
  grunt.registerTask('pack', ['default', 'compress']);
};