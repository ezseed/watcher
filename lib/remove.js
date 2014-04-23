var async = require('async')
  , db = require('ezseed-database')
  , fs = require('fs')
  , debug = require('debug')('ezseed:watcher:remove')
  , logger = require('ezseed-logger', {}, 'watcher')

//Remove 
var to_remove = []

var exists = function(params, callback) {
	
	var item = params.item

	if(!fs.existsSync(item.path)) {

		debug('%s has been deleted', item.path)

		to_remove.push({
			type: params.type,
			item: params.file._id,
			file: params.item._id
		})

		db[params.type][db.helpers.filename(params.type)].delete(item._id, params.file._id, callback)
		
	} else {
	
		callback(null, item)
	}

}

var find_missing = function(type, files, next) {

	async.map(files, function(file, done) {

		var paths = file.videos || file.songs || file.files
		  , file_type = file.videos ? 'videos' : file.songs ? 'songs' : 'files'

		if(paths.length)
			async.mapSeries(paths, function(path, callback) {

				exists(
					{
						type: type,
						item: path,
						file: file

					}, callback)

			}, function(err, exists) {

				if(err)
					logger.error('Error while searching for removed items', err)

				//we need back our files <type>
				file[file_type] = exists
				
				done(null, file)
			})
		else
			done(null, file)

	}, next)

	/*function(err, results) {
		next(err, _.flatten(results))
	}*/
}

var remove = function (existing, id_path, cb) {

	//Parallel on 3 types, find the missing ones
	async.parallel(
	{
	    movies: function(callback){
	        find_missing('movies', existing.movies, callback)
	    },
	    albums: function(callback){
	        find_missing('albums', existing.albums, callback)
	    },
	    others: function(callback) {
			find_missing('others', existing.others, callback)
	    }
	},
	function(err, results) {
		debug('%s files to be removed', to_remove.length)
		
		db.remove.store(id_path, to_remove, function(err, docs) {

			to_remove = []

			//Replacing original variables
			existing.movies = results.movies
			existing.albums = results.albums
			existing.others = results.others

		    cb(null, existing)
		})
		
	})	
}

module.exports = remove
