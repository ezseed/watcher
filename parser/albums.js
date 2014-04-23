var fs = require('fs')
  , Buffer = require('buffer').Buffer
  , logger = require('ezseed-logger', {}, 'watcher')
  , p = require('path')
  , ID3 = require('id3')
  
module.exports = function(filePath, picture, cb) {

	picture = picture === undefined || typeof picture == 'function' ? false : picture
	cb = typeof picture == 'function' ? picture : cb

	//Picture should be < than 16 Mb = 1677721 bytes
	//http://getid3.sourceforge.net/source/write.id3v2.phps fread_buffer_size
	var bufferSize = picture ? 1677721 + 32768 : 32768 
	
	fs.open(filePath, 'r', function(status, fd) {
		var buffer = new Buffer(bufferSize) 

		if(status) {
			logger.error(status)
			cb(status, {})
		} else {

			fs.read(fd, buffer, 0, bufferSize, 0, function(err, bytesRead, buffer) {		

				var id3 = new ID3(buffer) //memory issue large file

				fs.closeSync(fd)

				id3.parse()

				var tags = {
						"title" : id3.get("title") || '',
						"artist" :id3.get("artist") || '',
						"album"  :id3.get("album") || '',
						"year"   :id3.get("year") || '',
						"genre"  :id3.get("genre") || ''
					}

				var datas = id3.get('picture')

				id3 = null

				if(picture) {
					var pictureFounded = false

					if(datas !== null && (datas.data !== undefined && datas.format !== undefined) ) {

						var coverName = new Buffer(tags.artist + tags.album).toString().replace(/[^a-zA-Z0-9]+/ig,'')

						  , file = p.join(process.ezseed.tmp, coverName)

						  , type = datas.format.split('/')

						if(type[0] == 'image') {
							pictureFounded = true

							file = file + '.' + type[1]

							if(!fs.existsSync(file))
								fs.writeFileSync(file, datas.data)
							
							tags.picture = file
						}

					}
					
					if(!pictureFounded)
						tags.picture = require('./helpers').findCoverInDirectory(p.dirname(filePath))
					
				}

				cb(err, tags)
			})
		}
	})
}