var debug = require('debug')('ezseed:watcher:scrapper')
  , _s = require('underscore.string')
  , logger = require('ezseed-logger')('watcher:scrapper')
  , dummyName = require('../parser/helpers').dummyName
  , scrapper = require('ezseed-database').db.movies.scrapper

var tmdb = require('tmdb-3')("7c5105894b0446bb59b01a30cf235f3b")

var search = function(movie, cb) {

  movie.search = movie.search !== undefined ? movie.search : dummyName(movie.name, movie)
  movie.title = movie.title === undefined ? _s.titleize(movie.name) : movie.title
  movie.synopsis = ''
  movie.trailer = ''
  movie.picture = ''

  debug('Gathering infos on', movie.search)

  var search_options = {
    query: movie.search,
    language: process.ezseed_watcher.lang
  }

  if(movie.year !== undefined)
    search_options.year = movie.year

  tmdb.search(movie.movieType == 'tvseries' ? 'tv' : 'movie', search_options, function(err, res) {

    if(err) return cb(err, movie)

    if(res.total_results > 0) {
      var infos = res.results

      if(infos !== undefined) {

        //Index allocine info
        var index = false

        var m_name = _s.slugify(movie.search)

        //Parse each infos founded, if title matchs, break
        var nb_resultats = infos.length, i = 0

        //loop beginning with best match !
        while(i < nb_resultats - 1 && index === false) {

          var e = infos[i],
            //slugifying names - matches are better
            e_title = _s.slugify(e.title), 
            e_original = _s.slugify(e.originalTitle)

          if(
            ( e.title !== undefined && e_title.indexOf(m_name) !== -1 ) ||
            ( e.originalTitle !== undefined && e_original.indexOf(m_name) !== -1 )
          )	{
            index = i
          }

          i++
        }

        if(index === false)
               index = 0 

        movie.code = infos[index].id

        //default
        infos = infos[index]
        movie.title = infos.title !== undefined ? infos.title : infos.original_title
        movie.picture = infos.poster_path !== undefined ? infos.poster_path : null
        movie.backdrop = infos.backdrop_path ? infos.backdrop_path : null

        scrapper.exists(movie.code, movie.season ? movie.season : null, function(err, doc) {

          if(err) logger.err('Error by finding existing scrapper', err)

          if(err || !doc) {
            //Searching for a specific cod
            tmdb.infos(movie.movieType == 'tvseries' ? 'tv' : 'movie', movie.code, {language: process.ezseed_watcher.lang}, function(err, specific_infos) { 
              if(err || !specific_infos)
                cb(err, movie)

              movie.picture = specific_infos.poster_path ? specific_infos.poster_path : null
              movie.backdrop = specific_infos.backdrop_path ? specific_infos.backdrop_path : null

              movie.synopsis = specific_infos.overview ? _s.trim(specific_infos.overview.replace(/(<([^>]+)>)/ig, '')) : ''

              if(movie.movieType == 'tvseries') {
                movie.title = specific_infos.name ? specific_infos.name : specific_infos.original_name
                tmdb.season(parseInt(movie.season), movie.code, {language: process.ezseed_watcher.lang}, function(err, season_infos) {
                  movie.picture = season_infos.poster_path
                  movie.synopsis = season_infos.overview ? _s.trim(specific_infos.overview.replace(/(<([^>]+)>)/ig, '')) : movie.synopsis 
                  movie.title = season_infos.name ? season_infos.name : movie.title

                  movie.season_infos = season_infos
                  return cb(err, movie)
                })
              } else {
                movie.title = specific_infos.title != null ? specific_infos.title : specific_infos.original_title
                return cb(err, movie)
              }
            })
          } else {
            movie.infos = docs._id
            return cb(err, movie)
          }

        })


          //no synopsis try english
          // if(specific_infos.overview != null && specific_infos.overview.length === 0) {
          //   tmdb.infos(movie.movieType == 'tvseries' ? 'tv' : 'movie', movie.code, {}, function(err, specific_infos_en) { 
          //     movie.synopsis = specific_infos_en.overview ? _s.trim(specific_infos_en.overview.replace(/(<([^>]+)>)/ig, '')) : ''
          //     return cb(err, movie)
          //   })
          // } else {
          //   movie.synopsis = specific_infos.overview ? _s.trim(specific_infos.overview.replace(/(<([^>]+)>)/ig, '')) : ''
          //   return cb(err, movie)
          // }
          
      } else {
        return cb(err, movie)       
      }
    //No results
    } else {
      return cb(err, movie)
    }
  })
}

module.exports.search = search
