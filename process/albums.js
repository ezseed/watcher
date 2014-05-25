var p = require('path')
  , _ = require('underscore')
  , _s = require('underscore.string')
  , itunes = require('../scrappers/itunes')
  , logger = require('ezseed-logger')('watcher')
  , findIndex = require('./helpers').findIndex
  , async = require('async')
  , debug = require('debug')('ezseed:watcher:process:albums')

/**
* Main function to process the albums
* @param audios : list of audio files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
**/
module.exports = function(params, cb) {
	var audios = params.audios, pathToWatch = params.pathToWatch, albums = []

	var q = async.queue(function (e, callback) {

		//Redifine prevDir
		var lastDir = p.dirname(e.prevDir)

		e.specific = {}

		var matches = /^(CD|DISC)\s?(\d+)$/ig.exec(lastDir)

		//catch CD/DISC
		if(matches) {
			e.specific.disc = parseInt(matches[2])
		}

		var exists = false, indexMatch = null

		var j = params.existing.length, o = 0

		while(j-- && !exists) {
			o = params.existing[j].songs.length
			while(o--) {
				if(params.existing[j].songs[o] !== null && params.existing[j].songs[o].path.indexOf(e.path) !== -1 ) {
					exists = true
					break
				}
			}
		}

		if(exists === true)
			return callback()

		if(e.prevDir != pathToWatch)
			indexMatch = findIndex(albums, function(album) { return e.prevDir == album.prevDir })

		//It's a song within an album
		if(indexMatch !== null) {
			require('../parser/albums')(e.path, function(err, infos) {
					
				//this tests if the artist don't match one of the songs already there it's a Various Artist album
				if(infos.artist !== null && albums[indexMatch].artist !== 'VA') { 
					var a = _s.slugify(albums[indexMatch].artist)
					var b = _s.slugify(infos.artist)

					if(a.indexOf(b) === -1 || b.indexOf(a) === -1) {
						albums[indexMatch].artist = 'VA'
					}
				}

				infos.specific.disc = e.specific.disc || infos.specific.disc

				e.specific = infos.specific 

				debug('%s is a song in an album %s', e.name, albums[indexMatch].album)

				albums[indexMatch].songs.push(e)
				
				return callback()
			})
		//new album detected
		} else {
			indexMatch = null

		    require('../parser/albums')(e.path, function(err, infos) {

				var e_album = _s.slugify(infos.album)

				if(e_album) {
					//Index match on album we needed the album informations to do this test
					indexMatch = findIndex(albums, function(album) { 
						var a_album = _s.slugify(album.album)

						if(!a_album)
							return false
						else if(e_album !== null && a_album !== null && a_album.indexOf(e_album) !== -1)
							return true
						else
							return false
					})
				}

				if(indexMatch !== null) {

					albums[indexMatch].songs.push(e)
					
					return callback()

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
							prevDirRelative : e.prevDir.replace(process.ezseed_watcher.root, '')
						}

					if(a.picture == null) {
						itunes.infos(a, function(err, results) {
							if(err === null) {
								a.picture = results.artworkUrl100.replace('100x100', '400x400')
								albums.push(a)
							} else {
								logger.error('iTunes %s', err)
								albums.push(a)
							}

							
							return callback()
						})
					} else {
						albums.push(a)
						return callback()
					}
				}
			})
		}

	}, 1)

	q.push(audios, function(err) {
		if(err)
			logger.log('Error while processing audio', err)
	})

	q.drain = function() {
		cb(null, albums)
	}

}