module.exports = function(grunt) {
  grunt.initConfig({
    clean: ['dist/'],
    browserify: {
      app: {
        src: ['src/lib/sonos.js', 'src/page_action/page_action.js'],
        dest: 'dist/js/app.js',
        options: {
          alias: ['./src/lib/sonos.js:sonos']
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
      background: {
        expand: true,
        src: 'src/js/**',
        dest: 'dist/js/',
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