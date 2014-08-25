var expect = require('chai').expect
  , parser = require('../../parser/movies')
  , readdir = require('recursive-readdir')
  , fs = require('fs')
  , p = require('path')
  , fixtures_path = p.join(__dirname, '../fixtures/parser/video')
  , videos, l, movie, video
  , _ = require('underscore')

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

	before(function(cb) {
		readdir(fixtures_path, function (err, files) {
			videos = _.reject(files, function(path){ return /^\./.test(p.basename(path)) })
			l = videos.length
			cb()
		})
	})

	it('should parse videos', function() {

		while(l--) {

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
