var fs = require('fs')
  , Buffer = require('buffer').Buffer
  , p = require('path')
  , logger = require('ezseed-logger')('watcher')
  , mm = require('musicmetadata')
  
  , debug = require('debug')('ezseed:process:albums')

module.exports = function(filePath, cb) {

  var stream = fs.createReadStream(filePath)
  var parser = mm(stream)

  var tags = {
    artist: 'Unknown',
    album: 'No album',
    title: p.basename(filePath),
    specific: {}
  }

  parser.on('metadata', function(meta) {

    debug('got metadata from id3')

    tags = {

      artist: meta.albumartist.join(' ') || meta.artist.join(' '),
      album: meta.album,
      genre: meta.genre.join(' '),
      title: meta.title,
      year: meta.year,
      specific: {
        track: meta.track,
        disk: meta.disk,
        artist: meta.artist.join(' ')
      }
    }

    if(meta.picture[0] && meta.picture[0].data) {

      var coverName = new Buffer(tags.artist + tags.album).toString().replace(/[^a-zA-Z0-9]+/ig,'') + '.' + meta.picture[0].format

        , file = p.join(process.ezseed_watcher.tmp, coverName)

        if(!fs.existsSync(file))
          fs.writeFileSync(file, meta.picture[0].data)
        
        tags.picture = file.replace(process.ezseed_watcher.tmp, 'tmp')

    } else {
      tags.picture = require('./helpers').findCoverInDirectory(p.dirname(filePath))      
    }
  })

  parser.on('done', function (err) {
    stream.destroy()

    if (err) {
      logger.error('Error while parsing metadata for file: '+filePath, err)
    }

    debug('Done parsing %s', filePath)

    cb(err || null, tags)
  })

}
