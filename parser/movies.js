var p = require('path')
  , _s = require('underscore.string')
  , tag = require('./helpers').tag
  , dummyName = require('./helpers').dummyName

//Tags (to be improved)
var qualities = ['720p', '1080p', 'cam', 'ts', 'dvdscr', 'r5', 'dvdrip', 'dvdr', 'tvrip', 'hdtvrip', 'hdtv', 'brrip']

  , subtitles = ['fastsub', 'proper', 'subforced', 'fansub']

  , languages = ['vf', 'vo', 'vostfr', 'multi', 'french', 'truefrench']

  , audios = ['ac3', 'dts']

  , format = ['xvid', 'x264'];
  
module.exports = function(path) {

	var basename = p.basename(path), prevDir = path.replace('/' + basename, '').split('/')

	prevDir = prevDir[prevDir.length - 1]

	if(prevDir.length > basename.length)
		basename = prevDir

	var err = null

	  , name = basename.replace(p.extname(basename), '')
	  		.replace(/^\-[\w\d]+$/i, '') //team name
	  		.replace(/\-|_|\(|\)/g, ' ') //special chars
	  		.replace(/([\w\d]{2})\./ig, "$1 ") //Replacing dot with min 2 chars before
	  		.replace(/\.\.?([\w\d]{2})/ig, " $1")
	  		.replace(/\s\s+/, ' ') //same with 2 chars after

      , words = _s.words(name)

	  , movie = {
			quality : tag(words, qualities),
			subtitles : tag(words, subtitles),
			language : tag(words, languages),
			audio : tag(words, audios),
			format : tag(words, format),
			movieType : 'movie',
		}
		
	  , r = new RegExp(/EP?[0-9]{1,2}|[0-9]{1,2}x[0-9]{1,2}/i) //searches for the tv show
	  , y = new RegExp(/([0-9]{4})/) //Year regex
	  

	//Found a tv show
	if(r.test(name)) {

		movie.movieType = 'tvseries'

		//Searches for the Season number + Episode number
		r = new RegExp(/(.+)S([0-9]+)EP?([0-9]+)/i)
		var r2 = new RegExp(/(.+)([0-9]+)x([0-9])+/i)

		var ar = name.match(r)

		//If it matches
		if(ar != null) {
			movie.name = dummyName(ar[1], movie)
			movie.season = ar[2]
			movie.episode = ar[3]
		} else {
			ar = name.match(r2)
			if(ar) {
				movie.name = dummyName(ar[1], movie)
				movie.season = ar[2]
				movie.episode = ar[3]
			} else {
				movie.name = dummyName(name, movie)
			}
		}
	} else if(y.test(name)) {

		movie.movieType = 'movie'

		var ar = name.match(y)

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

	return movie
}