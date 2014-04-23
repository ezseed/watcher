var p = require('path')
  , _ = require('underscore')
  , _s = require('underscore.string')
  , itunes = require('../scrappers/itunes')
  , logger = require('ezseed-logger', {}, 'watcher')
  , findIndex = require('./helpers').findIndex

/**
* Main function to process the albums
* @param audios : list of audio files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
**/
module.exports = function(params, callback) {
	var audios = params.audios, pathToWatch = params.pathToWatch

	var parseAudios = function(arr, cb, albums) {

		albums = albums === undefined ? [] : albums

		if(arr.length === 0)
			return cb(albums)
	
		var e = arr.shift()
		
		//Redifine prevDir
		var lastDir = p.dirname(e.prevDir)

		var matches = /^(CD|DISC)\s?(\d+)$/ig.exec(lastDir)

		//catch CD/DISC
		if(matches) {
			e.disc = parseInt(matches[2])
			e.prevDir = lastDir
		}

		var existingFile = _.where(params.existing, {prevDir : e.prevDir})
		  , nbExisting = existingFile.length
		  , exists = false, indexMatch = null

		if(nbExisting)
			while(nbExisting-- && !exists)
				if(_.findWhere(existingFile[nbExisting].songs, {path : e.path}))
					exists = true

		if(!exists) {

			if(e.prevDir != pathToWatch)
				indexMatch = findIndex(albums, function(album) { return e.prevDir == album.prevDir })

			//It's a song within an album
			if(indexMatch !== null) {
				require('../parser/albums')(e.path, false, function(err, infos) {
						
					//this tests if the artist don't match it's a Various Artist album
					if(infos.artist !== null && albums[indexMatch].album !== null && albums[indexMatch].artist !== 'VA') { 
						var a = _s.slugify(albums[indexMatch].artist)
						var b = _s.slugify(infos.artist)
						
						if(a.indexOf(b) === -1 && b.indexOf(a) === -1)
							albums[indexMatch].artist = 'VA'
					}

					albums[indexMatch].songs.push(e)
					
					setImmediate(function() { parseAudios(arr, cb, albums) })

				})
			} else {
				indexMatch = null

			    require('../parser/albums')(e.path, true, function(err, infos) {

				var e_album = _s.slugify(infos.album)

					//Index match album
					indexMatch = findIndex(albums, function(album) { 
						var a_album = _s.slugify(_s.trim(album.album))


						if(a_album.length == 0)
							return false
						else if(e_album == null)
							return false 
						else if(e_album == null && infos.artist == null)
							return false
						else if(e_album !== null && a_album !== null && a_album == e_album)
							return true
						else
							return false
					})
					
					if(indexMatch !== null) {

						albums[indexMatch].songs.push(e)
						
						setImmediate(function() { parseAudios(arr, cb, albums) })
					} else {
						//New album detected
						var a = {
								artist : infos.artist,
								album : infos.album,
								year : infos.year,
								genre : infos.genre,
								songs : [e],
								picture : infos.picture,
								prevDir : e.prevDir,
								prevDirRelative : e.prevDir.replace(process.ezseed.root, '')
							}

						if(a.picture === null) {
							itunes.infos(a, function(err, results) {
								if(!err) {
									albums.push( _.extend(a, {picture: results.artworkUrl100.replace('100x100', '400x400')} ))
								} else {
									logger.error(err)
									albums.push(a)
								}

								
								setImmediate(function() { parseAudios(arr, cb, albums) })
							})
						} else {
							albums.push(a)
							
							setImmediate(function() { parseAudios(arr, cb, albums) })
						}
					}
				})
			}
		} else {
			
			setImmediate(function() { parseAudios(arr, cb, albums) })
		}
	}

	parseAudios(audios, function(albums) {
		return callback(null, albums)
	})

}