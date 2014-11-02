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
           .replace(/\[[a-z0-9]+\]$/i, '')
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
  
  var not_year = name.match(new RegExp('([0-9])([0-9]{2})[0-9]?'), 'i')

  //Found a tv show
  if(r.test(name) || (not_year && not_year[0].length < 4)) {

    movie.movieType = 'tvseries'

    //Searches for the Season number + Episode number
    var series = ['S([0-9]{1,3})EP?([0-9]{1,3})', '([0-9]{1,3})x([0-9]{1,3})', '(0?[0-9])([0-9]{2})']

    for(var i in series) {
      ar = name.match(new RegExp(series[i], 'i'))

      if(ar !== null) {
        name = name.replace(new RegExp(series[i], 'ig'), '}|').split('}|')

        name = dummyName(name[0], movie) || dummyName(name[1], movie)

        var year = name.match(y)

        if(year && year[0] > 1900) {
          name = name.replace(year[0], '') 
        }

        movie.name = name

        movie.season = '0' + parseInt(ar[1])
        movie.episode = ar[2]

        break;
      }
    }
    
    if(!movie.name) {
      movie.name = dummyName(name, movie)
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
