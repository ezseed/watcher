var expect = require('chai').expect
  , parser = require('../../parser/albums')
  , p = require('path')
  , fs = require('fs')
  , fixtures_path = p.join(__dirname, '../fixtures/audio')
  , rm = require('rimraf')

process.ezseed = {}
process.ezseed.tmp = p.join(__dirname, './tmp')

describe('audio parser', function() {

	before(function(cb) {
		fs.mkdir(process.ezseed.tmp, 0755, function(err) {
			expect(err).to.be.null
			cb()
		})
	})

	it('should parse ID3 tags', function(cb) {
		parser(p.join(fixtures_path, 'ezseed.mp3'), true, function(err, tags) {
			expect(err).to.be.null


			expect(tags).to.have.property('title', 'ezseed')
			expect(tags).to.have.property('artist', 'ezseed')
			expect(tags).to.have.property('album', 'ezseed')
			expect(tags).to.have.property('genre', 'reggae')

			expect(tags.picture).to.contain(process.ezseed.tmp)
			expect(fs.existsSync(tags.picture)).to.be.true

			cb()
		})

	})

	it('should parse ID3 tags without picture', function(cb) {
		parser(p.join(fixtures_path, 'ezseed.mp3'), false, function(err, tags) {
			expect(err).to.be.null
			expect(tags.picture).to.be.empty
			cb()
		})
	})

	it('should find picture in file parent directory', function(cb) {
		parser(p.join(fixtures_path, 'cover', 'ezseed.mp3'), true, function(err, tags) {
			expect(err).to.be.null
			expect(tags.picture).to.contain(p.join(fixtures_path, 'cover'))
			expect(tags.picture).not.to.be.empty
			cb()
		})
	})

	after(function(cb) {
		rm(process.ezseed.tmp, function(err) {
			expect(err).to.be.null
			cb()
		})
	})
})