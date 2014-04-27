var fs = require('fs')
  , Buffer = require('buffer').Buffer
  , p = require('path')
  , logger = require('ezseed-logger')({}, 'watcher')
  , mm = require('musicmetadata'), tags
  
module.exports = function(filePath, cb) {

	var stream = fs.createReadStream(filePath)
	var parser = mm(stream)

	parser.on('metadata', function(meta) {

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

			  , file = p.join(process.ezseed.tmp, coverName)

				if(!fs.existsSync(file))
					fs.writeFileSync(file, meta.picture[0].data)
				
				tags.picture = file

		} else {
			tags.picture = require('./helpers').findCoverInDirectory(p.dirname(filePath))			
		}

		cb(null, tags)
	})

	parser.on('done', function (err) {
		stream.destroy()

		if (err) {
			logger.error('Error while parsing metadata', err)
			cb(err)
		}
	})

}