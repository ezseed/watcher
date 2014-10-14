var expect = require('chai').expect
  , parser = require('../../parser/albums')
  , p = require('path')
  , fs = require('fs')
  , fixtures_path = p.join(__dirname, '../fixtures/parser/audio')
  , rm = require('rimraf')

process.ezseed_watcher = {}
process.ezseed_watcher.tmp = p.join(__dirname, './tmp')

describe('audio parser', function() {

  before(function(cb) {
    fs.mkdir(process.ezseed_watcher.tmp, 0755, function(err) {
      expect(err).to.be.null
      cb()
    })
  })

  it('should parse ID3 tags', function(cb) {
    parser(p.join(fixtures_path, '/ezseed/ezseed.mp3'), function(err, tags) {
      expect(err).to.be.null

      expect(tags).to.have.property('title', 'ezseed')
      expect(tags).to.have.property('artist', 'ezseed')
      expect(tags).to.have.property('album', 'ezseed')
      expect(tags).to.have.property('genre', 'reggae')

      expect(tags.picture).to.contain('tmp')
      expect(fs.existsSync(tags.picture.replace('tmp', process.ezseed_watcher.tmp))).to.be.true

      cb()
    })

  })

  it('should find picture in file parent directory', function(cb) {
    var no_cover = p.join(fixtures_path, 'ezseed-no-cover')

    parser(p.join(no_cover, 'ezseed.mp3'), function(err, tags) {
      expect(err).to.be.null
      expect(tags.picture).not.to.be.empty
      expect(tags.picture).to.contain(no_cover)
      cb()
    })
  })

  it('should find absolutly no cover', function(cb) {
    var no_cover = p.join(fixtures_path, 'ezseed-no-cover-at-all')

    parser(p.join(no_cover, 'toxicity.mp3'), function(err, tags) {
      expect(err).to.be.null
      expect(tags.picture).to.be.null
      cb()
    })  
  })

  it('should send an error', function(cb) {
    parser(p.join(fixtures_path, '/something.txt'), function(err, tags) {
      expect(err).not.to.be.null
      cb()
    })

  })

  it('should find no tags', function(cb) {
    parser(p.join(fixtures_path, 'ezseed-nothing.mp3'), function(err, tags) {
      expect(err).not.to.be.null
      expect(tags.artist).to.equal('Unknown')
      cb()
    })

  })

  after(function(cb) {
    rm(process.ezseed_watcher.tmp, function(err) {
      expect(err).to.be.null
      cb()
    })
  })
})
