var p = require('path')
  , _s = require('underscore.string')
  , tag = require('./helpers').tag
  , dummyName = require('./helpers').dummyName
  , debug = require('debug')('ezseed:watcher:parser:movies')

//Tags (to be improved)
var qualities = ['720p', '1080p', 'cam', 'ts', 'dvdscr', 'r5', 'dvdrip', 'dvdr', 'tvrip', 'hdtvrip', 'hdtv', 'brrip']

  , subtitles = ['fastsub', 'proper', 'subforced', 'fansub']

  , languages = ['vf', 'vo', 'vostfr', 'multi', 'french', 'truefrench']

  , audios = ['ac3', 'dts']

  , format = ['xvid', 'x264'];
  
module.exports = function(path) {

  var basename = p.basename(path), prevDir = p.basename(p.dirname(path))

  if(prevDir.length > basename.length)
    basename = prevDir + '.' + p.extname(basename)

  debug('basename', basename)

  var name = basename.replace(p.extname(basename), '')
           .replace(new RegExp('-[a-z0-9]+$', 'i'), '') //team name
           .replace(/\-|_|\(|\)/g, ' ') //special chars
           .replace(/([\w\d]{2})\./ig, "$1 ") //Replacing dot with min 2 chars before
           .replace(/\.\.?([\w\d]{2})/ig, " $1")  //same with 2 chars after
           .replace(/part\s?\d{1}/ig, '') //part
           .replace(new RegExp(' {2,}', 'g'), ' ') //double space

      , words = _s.words(name)

    , movie = {
      quality : tag(words, qualities),
      subtitles : tag(words, subtitles),
      language : tag(words, languages),
      audio : tag(words, audios),
      format : tag(words, format),
      movieType : 'movie',
    }
    
    , r = new RegExp('EP?[0-9]{1,2}|[0-9]{1,2}x[0-9]{1,2}', 'i') //searches for the tv show
    , y = new RegExp('([0-9]{4})') //Year regex
    , ar = []
  
  debug('name', name)

  //Found a tv show
  if(r.test(name)) {

    movie.movieType = 'tvseries'

    //Searches for the Season number + Episode number
    r = 'S([0-9]{1,3})EP?([0-9]{1,3})'
    var r2 = '([0-9]{1,3})x([0-9]{1,3})'

    ar = name.match(new RegExp(r, 'i'))

    //If it matches
    if(ar != null) {
      name = name.replace(new RegExp(r, 'ig'), '}|').split('}|')

      movie.name = dummyName(name[0], movie) || dummyName(name[1], movie)

      movie.season = ar[1]
      movie.episode = ar[2]
    } else {
      ar = name.match(new RegExp(r2, 'i'))
      if(ar) {
        name = name.replace(new RegExp(r2, 'ig'), '}|').split('}|')

        movie.name = dummyName(name[0], movie) || dummyName(name[1], movie)

        movie.season = ar[1]
        movie.episode = ar[2]
      } else {
        movie.name = dummyName(name, movie)
      }
    }
  } else if(y.test(name)) {

    movie.movieType = 'movie'

    ar = name.match(y)

    //year > 1900
    if(ar != null && ar[0] > 1900) {
      var parts = name.split(ar[0])
      movie.name = dummyName(parts[0], movie)
      movie.year = ar[1]
    } else {
      movie.name = dummyName(name, movie)
    }
  } else {
    movie.name = dummyName(name, movie)
  }

  debug('movie name', movie.name)

  movie.specific = {
    episode: movie.episode
  }

  return movie
}
