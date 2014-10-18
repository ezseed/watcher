var _s = require('underscore.string')
  , p = require('path')
  , fs = require('fs')
  , mime = require('mime')
  , debug = require('debug')('ezseed:watcher:process:helpers')

/**
* Returnn the first index of the array matching the iterator
**/

var findIndex = function(arr, iterator) {
  var i = arr.length - 1, index = null

  if(i >= 0){
    do {
      if(iterator(arr[i])) {
        index = i
        break
      }
    } while(i--)
  }

  return index
}

module.exports.findIndex = findIndex

/**
 * Movies match helper
 * @param  {array}   existing   Existing files
 * @param  {array}   movies     Movies just parsed
 * @param  {element}   e        Current parsed element
 * @return {Object}  result     { match - existing|movies, movies: index|null, existing: index|null
 */
module.exports.match = function(existing, movies, e) {
  var result = {
    match: null,
    existing: null,
    movies: null
  }

  result.existing = findIndex(existing, function(movie){ 

    if(movie.movieType == e.movieType) {
      var m_name = _s.slugify(e.name)
        , movie_name = _s.slugify(movie.name)

      // debug('test existing '+movie_name +'=='+ m_name)
      if(e.movieType == 'tvseries') {
        return movie_name == m_name && movie.season == e.season 
      } else {
        return movie_name == m_name
      }
    } else
      return false
  })

  result.movies = findIndex(movies, function(movie){ 

    if(movie.movieType == e.movieType) {
      var m_name = _s.slugify(e.name)
        , movie_name = _s.slugify(movie.name)

      // debug('test parsed '+movie_name +'=='+ m_name)
      if(e.movieType == 'tvseries') {
        return movie_name == m_name && movie.season == e.season 
      } else {
        return movie_name == m_name
      }
    } else
      return false
  })

  if(result.existing !== null)
    result.match = 'existing'
  else if(result.movies !== null)
    result.match = 'movies'
  else
    result = null

  debug('movie exists ? %s', result ? result.existing ? 'yes in existing' : result.match ? 'in parsed items' : 'no' : 'no')

  return result
}

/**
* Parses files, search if there is a movie / an audio file
* Another solution would be to check in the movies/albums if prevDir = prevDir,
* but after some tests it's faster to do this one
* @param files : fs.readDirSync(prevDir) - see processOthers
**/
var checkIsOther = function (files) {      

  debug('files.length %s checkIsOther', files.length)

  if( files.length === 0 )
    return true

  var file = files.shift()

  debug('checkisOther file %s', file)

  //no hidden files
  if(/^\./.test(p.basename(file))) {
    debug('checkIsOther hidden')
    return checkIsOther(files)
  }

  if(!fs.existsSync(file)) {
    debug('checkIsOther no file')
    return checkIsOther(files)
  }
  
  var stats = fs.statSync(file)

  //if it's a directory do this recursively
  if(stats.isDirectory()) {
    debug('checkIsOther is directory', file)

    var directoryFiles = fs.readdirSync(file)
      , arr = directoryFiles.map(function(path){ return p.join(file, path) })

    if(!checkIsOther(arr)) {
      return false
    } else {
      return checkIsOther(files)
    }
  } else {
    var t = mime.lookup(file).split('/')[0]
    debug('checkIsOther type %s', t)

    if( (t == 'audio' || t == 'video'))
    {
      return false
    } else {
      return checkIsOther(files)
    }
  }
  

}

module.exports.checkIsOther = checkIsOther
