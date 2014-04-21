var request = require('request')


// http://www.apple.com/itunes/affiliates/resources/documentation/itunes-store-web-service-search-api.html#searching
// options example:
// options = {
//    media: "movie" // options are: podcast, music, musicVideo, audiobook, shortFilm, tvShow, software, ebook, all
//  , entity: "movie"
//  , attribute: "movie"
//  , limit: 50
//  , explicit: "No" // explicit material
// }


//Method : search | lookup
var itunes = {
   search : function(method, options, callback) {

      var optionsString = ""

      for (item in options)
         optionsString += "&" + item + "=" + encodeURIComponent(options[item])


      var url = method == 'search' ? "http://itunes.apple.com/search?country=fr" + optionsString : "http://itunes.apple.com/lookup?country=fr" + optionsString

      request( url, function(err, response, body) {

         callback( JSON.parse(body) )

      })

   },

   lucky : function(search, callback) {

      var options = {
          media: "music"
        , limit: 1
        , entity: "album"
        , term: search
      }

      itunes.search('search', options, function(response) {
         if(response.resultCount) {
            callback(null, response.results[0])
         } else {
            callback("Aucun résultat", {})
         }
      })

   },
   /*
    * Shortcut to search from album item
    */
   infos: function(album, cb) {
    var search = album.album !== null && album.artist !== null ? album.artist + ' ' + album.album : null

    if(search === null) {
      if(album.album !== null)
        search = album.album
      else if(album.artist !== null)
        search = album.artist
    }

    if(search) {
      this.lucky(search, function(err, results) {
        cb(err, results)
      })
    } else {
      cb("Nothing to search", {})
    }
   }
}

module.exports = itunes
