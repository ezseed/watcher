var _ = require('underscore')
  , tmdb = require('../scrappers/tmdb')
  , logger = require('ezseed-logger')('watcher')
  , findIndex = require('./helpers').findIndex
  , match = require('./helpers').match
  , async = require('async')
  , db = require('ezseed-database').db
  , debug = require('debug')('ezseed:watcher:process:movies')

/**
* Main function to process the movies
* @param videos : list of video files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
* @call : see "parseMovies" below
**/
module.exports = function(params, cb) {
  var videos = params.videos, pathToWatch = params.pathToWatch, movies = []
  
  /**
  * Process the array of movies asynchronously
  * Must be async because we might call scrapper to gather some infos
  * Concurrency to 1, wait until previous has finish
  **/
  var q = async.queue(function (e, callback) {
    
    var exists = false, j = params.existing.length, o = 0

    while(j-- && !exists) {
      o = params.existing[j].videos ? params.existing[j].videos.length : 0
      while(o--) {
        if(params.existing[j].videos[o] !== null && params.existing[j].videos[o].path.indexOf(e.path) !== -1 ) {
          exists = true
          break
        }
      }
    }

    if(exists)
      return callback()

    //Getting some informations
    e = _.extend(e, require('../parser/movies')(e.path))

    var indexMatch = match(params.existing, movies, e)

    if(indexMatch !== null) {

      if(indexMatch.match == 'existing') {
        db.movies.videos.add(params.existing[indexMatch.existing]._id, e, callback)
      } else {
        movies[indexMatch.movies].videos.push(e)

        return callback()
      }
    } else {

      indexMatch = null

      //If movies are in the same directory
      if(pathToWatch != e.prevDir)
        indexMatch = findIndex(movies, function(movie) {
          return movie.prevDir == e.prevDir
        })

      if(indexMatch !== null) {

        debug('Match on prevDir : '+e.prevDir)

        movies[indexMatch].videos.push(e)

        return callback()
      
      } else {

        tmdb.search(e, function(err, infos) {
          //if season search
          movies.push({
            movieType : e.movieType,
            name : e.name,
            season : e.season,
            seasonInfos: infos.season_infos || {},
            title : infos.title,
            synopsis : infos.synopsis,
            trailer : infos.trailer,
            picture : infos.picture,
            backdrop: infos.backdrop,
            quality : e.quality,
            subtitles : e.subtitles,
            language : e.language,
            audio : e.audio,
            format : e.format,
            code : infos.code,
            infos: infos.infos || null,

            // allocine : infos.code,

            videos : [e],
            prevDir : e.prevDir,
            prevDirRelative : e.prevDir.replace(process.ezseed_watcher.root, '')
          })

          return callback()
        })
      }

    }

  }, 1)

  q.push(videos, function(err) {
    if(err)
      logger.log('Error while processing video', err)
  })

  q.drain = function() {
    cb(null, movies)
  }
}
