var expect = require('chai').expect
  , parser = require('../../parser/movies')
  , readdir = require('../../lib/readdir')
  , fs = require('fs')
  , p = require('path')
  , fixtures_path = p.join(__dirname, '../fixtures/parser/video')
  , videos, l, movie, video

/**
 * Transforms a file content to an object
 * key=value
 * @param  {String} path [file path]
 * @return {Object}
 */
var fileToObject = function(path) {
  var value, object = {}

  //reads the video file
  video = fs.readFileSync(videos[l]).toString().split('\n')

  for(var i in video) {
    value = video[i].split('=')
    object[value[0]] = value[1]
  }

  return object
}

describe('videos parser', function() {

  it('should parse videos', function() {

    videos = readdir(fixtures_path)
    l = videos.length

    while(l--) {

      //parse movie path
      movie = parser(videos[l])
      video = fileToObject(videos[l])

      for(var i in movie) {
        // console.log('testing %s', movie.name)
        if(i in video) {
          var n
          if(i == 'name') {
            n = movie.global_name || movie.name 
          } else {
            n = movie[i]
          }
                                      
          expect(n.toLowerCase()).to.contain(video[i].toLowerCase())
        }
      }

    }
  })  


})
