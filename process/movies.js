var _ = require('underscore')
  , tmdb = require('../scrappers/tmdb')
  , logger = require('ezseed-logger', {}, 'watcher')
  , findIndex = require('./helpers').findIndex
  , db = require('ezseed-database').db

/**
* Main function to process the movies
* @param videos : list of video files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
* @call : see "parseMovies" below
**/
module.exports.processMovies = function(params, callback) {
	var videos = params.videos, pathToWatch = params.pathToWatch

	/**
	* Declaration within the module because of "pathToWatch"
	* Process the array of movies asynchronously
	* Must be async because we might call allocine to gather some infos
	* + in serie, wait until previous has finish
	* @param arr : list of videos files
	* @param cb : callback when everything is done
	* @param i : cursor
	* @param movies : movies array spawned on the fly
	* @return callback
	**/
	var parseMovies = function(arr, cb, movies) {

		movies = movies === undefined ? [] : movies

		if(arr.length === 0)
			return cb(movies)

		var e = arr.shift()

		var exists = false

		for(var p in params.existing) {
			for(var o in params.existing[p].videos) {
				if(params.existing[p].videos[o].path.indexOf(e.path) !== -1 ) {
					exists = true
					break
				}
			}
		}

		if(!exists) {

			//Getting some informations
			e = _.extend(e, require('../parser/movies')(e.path))

			var indexMatch = null, moviesMatch = null

			//If movies are in the same directory
			if(pathToWatch != e.prevDir)
				indexMatch = findIndex(movies, function(movie) {
					return movie.prevDir == e.prevDir
				})

			if(indexMatch !== null) {

				console.log('debug', 'index Match on prevDir : '+e.prevDir)

				movies[indexMatch].videos.push(e)

				setImmediate(function() { parseMovies(arr, cb, movies) })

			} else {

				if(e.movieType == 'tvseries') {

					//Searching for a similar name && an equal season on existing
					indexMatch = match(params.existing, movies, e)

				} else {
					//same on movies
					moviesMatch = match(params.existing, movies, e)
				}

				if(indexMatch !== null) {
					console.log('debug', 'Index match series', indexMatch)

					if(indexMatch.match == 'existing') {
						db.movies.video.add(params.existing[indexMatch.existing]._id, e, function(err) {
							
							if(err) {
								logger.error('Error by adding the video in the movie', err, e)
							}

							setImmediate(function() { parseMovies(arr, cb, movies) })
						})
					} else {
						movies[indexMatch.movies].videos.push(e)

						setImmediate(function() { parseMovies(arr, cb, movies) })
					}
				} else if (moviesMatch !== null) {

					if(moviesMatch.match == 'existing') {

						db.movies.video.add(params.existing[moviesMatch.existing]._id, e, function(err) {
							
							if(err) {
								logger.error('Error by adding the video in the movie', err, e)
							}

							setImmediate(function() { parseMovies(arr, cb, movies) })
						})
					} else {
						movies[moviesMatch.movies].videos.push(e)

						setImmediate(function() { parseMovies(arr, cb, movies) })
					}
				} else {

					tmdb.search(e, function(err, infos) {
						movies.push({
							movieType : e.movieType,
							name : e.name,
							season : e.season,
							title : infos.title,
							synopsis : infos.synopsis,
							trailer : infos.trailer,
							picture : infos.picture,
							quality : e.quality,
							subtitles : e.subtitles,
							language : e.language,
							audio : e.audio,
							format : e.format,

							// allocine : infos.code,

							videos : [e],
							prevDir : e.prevDir,
							prevDirRelative : e.prevDir.replace(process.ezseed.root, '')
						})

						setImmediate(function() { parseMovies(arr, cb, movies) })
					})
				}

			}
		} else {
			setImmediate(function() { parseMovies(arr, cb, movies) })
		}

	}


	parseMovies(videos, function(movies) {
		callback(null, movies)
	})
}
