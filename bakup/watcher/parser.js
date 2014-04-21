var console = require(global.conf.root + '/core/logger');
var pathInfos = require('path')
  , mime = require('mime')
  , explorer = require('explorer')
  , async = require('async')
  , _ = require('underscore')
  , _s = require('underscore.string')
  , release = require('./release.js')
  , db = require('../core/database')
  , fs = require('fs')
  , tmdb = require('../scrappers/tmdb')
  , itunes = require('../scrappers/itunes')
  ;

/**
* Similar to _.find but return the first index of the array matching the iterator
**/
var findIndex = function(arr, iterator) {
	var i = arr.length - 1, index = null;

	if(i >= 0){
		do {
			if(iterator(arr[i])) {
				index = i;
				break;
			}
		} while(i--)
	}

	return index;
}

/**
* Main function to process the albums
* @param audios : list of audio files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
**/
module.exports.processAlbums = function(params, callback) {
	var audios = params.audios, pathToWatch = params.pathToWatch;

	var parseAudios = function(arr, cb, albums) {

		albums = albums === undefined ? [] : albums;

		if(arr.length == 0)
			return cb(albums);
	
		var e = arr.shift();
		
		//Redifine prevDir
		var lastDir = e.prevDir.split('/'), dirsNb = lastDir.length - 1;
			lastDir = lastDir[dirsNb];

		var matches = /^(CD|DISC)\s?(\d+)$/ig.exec(lastDir);

		//catch CD/DISC
		if(matches) {
			e.disc = parseInt(matches[2]);
			e.prevDir = e.prevDir.split('/').splice(0, dirsNb).join('/');
		}

		var existingFile = _.where(params.existing, {prevDir : e.prevDir})
		  , nbExisting = existingFile.length
		  , exists = false, indexMatch = null;

		if(nbExisting)
			while(nbExisting-- && !exists)
				if(_.findWhere(existingFile[nbExisting].songs, {path : e.path}))
					exists = true;

		if(!exists) {

			if(e.prevDir != pathToWatch)
				indexMatch = findIndex(albums, function(album) { return e.prevDir == album.prevDir; });

			if(indexMatch !== null) {
				release.getTags.audio(e.path, false, function(err, infos) {

					if(infos.artist !== null && albums[indexMatch].album !== null && albums[indexMatch].artist !== 'VA') { 
						var a = _s.slugify(albums[indexMatch].artist);
						var b = _s.slugify(infos.artist);
						
						if(a.indexOf(b) === -1 && b.indexOf(a) === -1)
							albums[indexMatch].artist = 'VA';
					}

					albums[indexMatch].songs.push(e);
					
					setImmediate(function() { parseAudios(arr, cb, albums); });

				});
			} else {
		    	indexMatch = null;

			    release.getTags.audio(e.path, true, function(err, infos) {

			    	var e_album = _s.slugify(infos.album);
			    	
					//Index match album
					indexMatch = findIndex(albums, function(album) { 
						var a_album = _s.slugify(_s.trim(album.album));


						if(a_album.length == 0)
							return false
						else if(e_album == null)
							return false; 
						else if(e_album == null && infos.artist == null)
							return false;
						else if(e_album !== null && a_album !== null && a_album == e_album)
							return true;
						else
							return false;
					});
					
					if(indexMatch !== null) {

						albums[indexMatch].songs.push(e);
						
						setImmediate(function() { parseAudios(arr, cb, albums); });
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
								prevDirRelative : e.prevDir.replace(global.rootPath, '')
							};

						if(a.picture === null) {
							ituns.infos(a, function(err, results) {
								if(!err)
									albums.push( _.extend(a, {picture: results.artworkUrl100.replace('100x100', '400x400')} ));
								else
									albums.push(a);

								
								setImmediate(function() { parseAudios(arr, cb, albums); });
							})
						} else {
							albums.push(a);
							
							setImmediate(function() { parseAudios(arr, cb, albums); });
						}
					}
				});
			}
		} else {
			
			setImmediate(function() { parseAudios(arr, cb, albums); });
		}
	}

	parseAudios(audios, function(albums) {
		delete audios;
		return callback(null, albums);
	});

}

/**
* Main function to process the movies
* @param videos : list of video files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
* @call : see "parseMovies" below
**/
module.exports.processMovies = function(params, callback) {
	var videos = params.videos, pathToWatch = params.pathToWatch;


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

		movies = movies === undefined ? [] : movies;

		if(arr.length == 0)
			return cb(movies);

		var e = arr.shift();

		var exists = false;

		for(var p in params.existing) {
			for(var o in params.existing[p].videos) {
				if(params.existing[p].videos[o].path.indexOf(e.path) !== -1 ) {
					exists = true;
					break;
				}
			}
		}

		if(!exists) {

			//Getting some informations
			e = _.extend(e, release.getTags.video(e.path));

			// e = _.extend(e, release.getTags.video(e.path));
			var indexMatch = null, moviesMatch = null;

			//If movies are in the same directory
			if(pathToWatch != e.prevDir)
				indexMatch = findIndex(movies, function(movie) {
					return movie.prevDir == e.prevDir;
				});

			if(indexMatch !== null) {

				console.log('debug', 'index Match on prevDir : '+e.prevDir);

				movies[indexMatch].videos.push(e);

				setImmediate(function() { parseMovies(arr, cb, movies); });

			} else {

				if(e.movieType == 'tvseries') {

					//Searching for a similar name && an equal season on existing
					indexMatch = match(params.existing, movies, e);

				} else {
					//same on movies
					moviesMatch = match(params.existing, movies, e);
				}

				if(indexMatch !== null) {
					console.log('debug', 'Index match series', indexMatch);

					if(indexMatch.match == 'existing') {
						db.files.movies.addVideo(params.existing[indexMatch.existing]._id, e, function(err) {
							
							if(err) {
								console.log('err', 'Error by adding the video in the movie', err);
								console.log('debug', e);
							}

							setImmediate(function() { parseMovies(arr, cb, movies); });
						});
					} else {
						movies[indexMatch.movies].videos.push(e);

						setImmediate(function() { parseMovies(arr, cb, movies); });
					}
				} else if (moviesMatch !== null) {
					console.log('debug', 'Index match movies');

					if(moviesMatch.match == 'existing') {

						db.files.movies.addVideo(params.existing[moviesMatch.existing]._id, e, function(err) {
							
							if(err) {
								console.log('err', 'Error by adding the video in the movie', err);
								console.log('debug', e);
							}

							setImmediate(function() { parseMovies(arr, cb, movies); });
						});
					} else {
						movies[moviesMatch.movies].videos.push(e);

						setImmediate(function() { parseMovies(arr, cb, movies); });
					}
				} else {
					var infos = {
						title: e.name,
						synopsis: null,
						trailer: null,
						picture: null
					};

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
							prevDirRelative : e.prevDir.replace(global.rootPath, '')
						});

						setImmediate(function() { parseMovies(arr, cb, movies); });
					});
				}

			}
		} else {
			setImmediate(function() { parseMovies(arr, cb, movies); });
		}

	}


	parseMovies(videos, function(movies) {
		delete videos;
		callback(null, movies);
	});
}


/**
 * Movies match helper
 * @param  {array}   existing   Existing files
 * @param  {array}   movies     Movies just parsed
 * @param  {element}   e        Current parsed element
 * @return {Object}  result     { match - existing|movies, movies: index|null, existing: index|null
 */
var match = function(existing, movies, e) {
		var result = {
			match: null,
			existing: null,
			movies: null
		};

		result.existing = findIndex(existing, function(movie){ 

			if(movie.movieType == e.movieType) {
				var m_name = _s.slugify(e.name)
				  ,	movie_name = _s.slugify(movie.name);

				  	if(e.movieType == 'tvseries')
						return movie_name == m_name && movie.season == e.season; 
					else
						return movie_name == m_name;
			} else
				return false;
		});

		result.movies = findIndex(movies, function(movie){ 

			if(movie.movieType == e.movieType) {
				var m_name = _s.slugify(e.name)
				  ,	movie_name = _s.slugify(movie.name);

				  	if(e.movieType == 'tvseries')
						return movie_name == m_name && movie.season == e.season; 
					else
						return movie_name == m_name;
			} else
				return false;
		});

		if(result.existing !== null)
			result.match = 'existing';
		else if(result.movies)
			result.match = 'movies';
		else
			result = null;

		// if(result !== null && result.match == 'existing')
		// 	console.log(e, existing[result.existing]);

		return result;
	}


/**
* Parses files, search if there is a movie / an audio file
* Another solution would be to check in the movies/albums if prevDir = prevDir,
* but after some tests it's faster to do this one
* @param files : fs.readDirSync(prevDir) - see processOthers
**/
var checkIsOther = function (files, i) {
	var i = i == undefined ? 0 : i;
		
	if( i < files.length ) {
		//no hidden files
		if(!/^\./.test(pathInfos.basename(files[i]))) {

			if(fs.existsSync(files[i])) {

				var stats = fs.statSync(files[i]);
				
				if(stats.isDirectory()) {

					var directoryFiles = fs.readdirSync(files[i])
					  , arr = _.map(directoryFiles, function(p){ return pathInfos.join(files[i], p); });

					if(!checkIsOther(arr))
						return false;
					else
						setImmediate(function() { return checkIsOther(files, i + 1); });
				} else {
					var t = mime.lookup(files[i]).split('/')[0];

					if( (t == 'audio' || t == 'video'))
					{
						return false;
					} else
						setImmediate(function() { return checkIsOther(files, i + 1); });
				}
			} else {
				setImmediate(function() { return checkIsOther(files, i + 1); });
			}
		} else
			setImmediate(function() { return checkIsOther(files, i + 1); });
	} else 
		return true;
}
var cache = require('memory-cache')


/**
* Main function to process files
* @param othersFiles : list of others files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
**/

module.exports.processOthers = function(params, callback) {

	//Redis would be prefered
	var cached = cache.get('others') ? cache.get('others') : [];

	var pathToWatch = params.pathToWatch, parsed = 0;

	var parseOthers = function(arr, cb, others) {

		parsed++;

		others = others === undefined ? [] : others;

		if(arr.length == 0)
			return cb(others);

		var e = arr.shift()
		  , exists = false;

		//Test if the file already exists by path
		var k = params.existing.length, z = cached.length, j = 0;

		//Search paths in cached values (only files belonging to an album or a movie nfo|pictures etc.)
		while(z--)
			if(e.path == cached[z])
				exists = true;
		
		if(!exists) {

			//Same but on existing files (database)
			while(k--) {
				j = params.existing[k].files.length;
				while(j--) {
					if(params.existing[k].files[j].path == e.path)
						exists = true;
				}
			}

		}

		if(exists) {
			setImmediate(function() { parseOthers(arr, cb, others); });
		} else {

			var indexMatch = null
			  , name = ''
			  , single = false;

			if(e.prevDir != pathToWatch) {

				// console.log(e.prevDir);
				e.prevDir = 
					pathInfos.join(
						pathToWatch, 
						e.prevDir.replace(pathToWatch, '').split('/')[1]
					);
				
				// console.log(e.prevDir);

				indexMatch = findIndex(others, function(other) { return e.prevDir == other.prevDir; });
				name = pathInfos.basename(e.prevDir);
				single = false;
			} else {
				single = true;
				name = e.name;
			}

			// console.log('info', e.prevDir);

			if(single) {
				//var t = mime.lookup(e.path).split('/')[0];

				//if(e.prevDir == pathToWatch && t != 'audio' && t != 'video')
				//{
				others.push({
					name : name,
					files : [e],
					prevDir : e.prevDir,
					prevDirRelative : e.prevDir.replace(global.conf.root, '')
				});
				
				setImmediate(function() { parseOthers(arr, cb, others); });

				//}
			} else if(indexMatch !== null) {
				others[indexMatch].files.push(e);

				setImmediate(function() { parseOthers(arr, cb, others); });
			} else {

				indexMatch = findIndex(params.existing, function(other) { return e.prevDir == other.prevDir});

				if(indexMatch !== null)
					console.log('error', 'Find existsing in database ?');

				//Checking if the directory contains a video/audio file
				var directoryFiles = fs.readdirSync(e.prevDir)
				  , map = _.map(directoryFiles, function(p){ return pathInfos.join(e.prevDir, p); });
				
				if(checkIsOther(map)) {
					others.push({
						name : name,
						files : [e],
						prevDir : e.prevDir,
						prevDirRelative : e.prevDir.replace(global.conf.root, '')
					});
				} else {
					cached.push(e.path);
					cache.put('others', cached);
				}

				setImmediate(function() { parseOthers(arr, cb, others); });
			}
		}
	};
	
	var othersFiles = params.others;

	parseOthers(othersFiles, function(others) {
		console.log('debug', 'Parsed objects: ', parsed);
		console.log('debug', 'News', others.length);
		delete othersFiles;
		callback(null, others);
	});

}