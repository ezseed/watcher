var cache = require('memory-cache')
  , findIndex = require('./helpers').findIndex
  , checkIsOther = require('./helpers').checkIsOther
  , p = require('path')
  , fs = require('fs')
  , _ = require('underscore')
  , debug = require('debug')('ezseed:watcher:process:others')

/**
* Main function to process files
* @param othersFiles : list of others files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
**/

module.exports = function(params) {

	//Redis would be prefered
	var cached = cache.get('others') ? cache.get('others') : []

	var pathToWatch = params.pathToWatch
      , files = params.others
	  , e
	  , others = []

	debug('Has %s files to parse', files.length)

	if(!files.length)
		return others

	while(e = files.shift()) {
		
		var exists = false

		//Test if the file already exists by path
		var k = params.existing.length, z = cached.length, j = 0

		//Search paths in cached values (only files belonging to an album or a movie nfo|pictures etc.)
		while(z--)
			if(e.path == cached[z])
				exists = true
		
		if(!exists) {

			//Same but on existing files (database)
			while(k--) {
				j = params.existing[k].files.length
				while(j--) {
					if(params.existing[k].files[j] !== null && params.existing[k].files[j].path == e.path)
						exists = true
				}
			}

		}

		if(!exists) {

			var indexMatch = null
			  , name = ''
			  , single = false

			if(e.prevDir != pathToWatch) {

				// e.prevDir = 
				// 	p.join(
				// 		pathToWatch, 
				// 		e.prevDir.replace(pathToWatch, '').split('/')[1]
				// 	)
				
				indexMatch = findIndex(others, function(other) { return e.prevDir == other.prevDir })
				name = p.basename(e.prevDir)
				single = false
			} else {
				single = true
				name = e.name
			}

			debug('%s is single ?', e.name, single)

			if(single) {
				//var t = mime.lookup(e.path).split('/')[0]

				//if(e.prevDir == pathToWatch && t != 'audio' && t != 'video')
				//{
				others.push({
					name : name,
					files : [e],
					prevDir : e.prevDir,
					prevDirRelative : e.prevDir.replace(process.ezseed.root, '')
				})
				//}
			} else if(indexMatch !== null) {
				others[indexMatch].files.push(e)

			} else {

	/*			indexMatch = findIndex(params.existing, function(other) { return e.prevDir == other.prevDir})

				if(indexMatch !== null)
					console.log('error', 'Find existsing in database ?')
	*/
				//Checking if the directory contains a video/audio file
				var directoryFiles = fs.readdirSync(e.prevDir)
                  , map = _.map(directoryFiles, function(path){ return p.join(e.prevDir, path) })
				
				if(checkIsOther(map)) {
					others.push({
						name : name,
						files : [e],
						prevDir : e.prevDir,
						prevDirRelative : e.prevDir.replace(process.ezseed.root, '')
					})
				} else {
					//we cache files that aren't others, checkIsOther is heavy...
					debug('%s was a part of an album or a movie, skipping', e.path)
					cached.push(e.path)
					cache.put('others', cached)
				}

			}
		}
	}
	
	return others

}