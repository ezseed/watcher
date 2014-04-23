var expect = require('chai').expect
  , parser = require('../../parser/movies')
  , fs = require('fs')
  , p = require('path')
  , fixtures_path = p.join(__dirname, '../fixtures/video')
  , videos, l, movie, video

/**
 * Transforms a file to an object
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

	before(function() {
		videos = fs.readdirSync(fixtures_path)
		l = videos.length
	})

	it('should parse videos', function() {

		while(l--) {
			videos[l] = p.join(fixtures_path, videos[l])
			
			//parse movie path
			movie = parser(videos[l])
			video = fileToObject(videos[l])

			for(var i in movie) {
				if(i in video) {
					expect(movie[i].toLowerCase()).to.contain(video[i].toLowerCase())
				}
			}

		}
	})	


})