var Buffer = require('buffer').Buffer
  , _ = require('underscore')
  , _s = require('underscore.string')
  , fs = require('fs')
  , p = require('path')
  , mime = require('mime')
  , itunes = require('./helpers/iTunes')
  , ID3 = require('id3');


// /*
// * Get an object by the string
// * Example :
// * var file.type = "movie";
// * var x = {movie:[0,1,2,3]}
// * Object.byString(x, file.type);
// * Output [0,1,2,3 ]
// */
// Object.byString = function(o, s) {
//     s = s.replace(/\[(\w+)\]/g, '.$1');  // convert indexes to properties
//     s = s.replace(/^\./, ''); // strip leading dot
//     var a = s.split('.');
//     while (a.length) {
//         var n = a.shift();
//         if (n in o) {
//             o = o[n];
//         } else {
//             return;
//         }
//     }
//     return o;
// }

//Tags (to be improved)
var qualities = ['720p', '1080p', 'cam', 'ts', 'dvdscr', 'r5', 'dvdrip', 'dvdr', 'tvrip', 'hdtvrip', 'hdtv', 'brrip']

  , subtitles = ['fastsub', 'proper', 'subforced', 'fansub']

  , languages = ['vf', 'vo', 'vostfr', 'multi', 'french', 'truefrench']

  , audios = ['ac3', 'dts']

  , format = ['xvid', 'x264'];

//Dummy name by replacing the founded vars
var dummyName = function (name, obj) {

	var o = {quality: '', subtitles: '', language: '', format: ''};

	_.each(o, function(e, i) {
		if(obj[i] === undefined)
			obj[i] = '';
	});

	if(name !== undefined)
		name = name.toLowerCase()
				.replace(obj.quality.toLowerCase(), '')
				.replace(obj.subtitles.toLowerCase(), '')
				.replace(obj.language.toLowerCase(), '')
				.replace(obj.format.toLowerCase(), '');
	

	return _s.titleize(_s.trim(name));
}

module.exports.dummyName = dummyName;

/**
* Searches for a cover in a directory
**/
var findCoverInDirectory = function(dir) {
	var files = fs.readdirSync(dir);
	
	var m, type, cover;

	for(var i in files) {
		m = mime.lookup(files[i]);
		type = m.split('/');
		if(type[0] == 'image') {
			cover = files[i];
			break;
		}
	}
	
	return cover === undefined ? null : p.join(dir, cover).replace(global.conf.path, '/downloads');
}

var contains = function(words, item) {

	var v = '', result = null;

	for(var j in words) {
		v = words[j];

		for(var i in item) {
			if ( _s.trim(v.toLowerCase()) == item[i] ) 
				result = item[i];
		}
	}

	return result;
},
	tag = function(words, item) {
		var tag = contains(words, item);

		return tag !== null && tag.length > 0 ? tag.toUpperCase() : undefined;
}

module.exports.getTags  = {
	//Searches the video type
	//Algorithm from : https://github.com/muttsnutts/mp4autotag/issues/2
	video: function(path) {

		var basename = p.basename(path), prevDir = path.replace('/' + basename, '').split('/');

		prevDir = prevDir[prevDir.length - 1];

		if(prevDir.length > basename.length)
			basename = prevDir;

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
		  ;

		//Found a tv show
		if(r.test(name)) {

			movie.movieType = 'tvseries';

			//Searches for the Season number + Episode number
			r = new RegExp(/(.+)S([0-9]+)EP?([0-9]+)/i);
			var r2 = new RegExp(/(.+)([0-9]+)x([0-9])+/i);

			var ar = name.match(r);

			//If it matches
			if(ar != null) {
				movie = _.extend(movie, {
					name : dummyName(ar[1], movie),
					season : ar[2],
					episode : ar[3]
				});
			} else {
				ar = name.match(r2);
				if(ar) {
					movie = _.extend(movie, {
						name: dummyName(ar[1], movie),
						season: ar[2],
						episode: ar[3]
					});
				} else {
					movie.name = dummyName(name, movie);
				}
			}
		} else if(y.test(name)) {

			movie.movieType = 'movie';

			var ar = name.match(y);

			//year > 1900
			if(ar != null && ar[0] > 1900) {
				var parts = name.split(ar[0]);
				movie : _.extend(movie, {
					name : dummyName(parts[0], movie),
					year : ar[1]
				});
			} else {
				movie.name = dummyName(name, movie);
			}
		} else {
			movie.name = dummyName(name, movie);
		}

		return movie;
	}, 
	audio: function(filePath, picture, cb) {

		picture = picture === undefined ? false : picture;

		//Picture should be < than 16 Mb = 1677721 bytes
		var bufferSize = picture ? 1677721 + 32768 : 32768; //http://getid3.sourceforge.net/source/write.id3v2.phps fread_buffer_size

		fs.open(filePath, 'r', function(status, fd) {
			var buffer = new Buffer(bufferSize); 

			if(status) {
				console.error(status);
				cb(status, {});
			} else {

				fs.read(fd, buffer, 0, bufferSize, 0, function(err, bytesRead, buffer) {		

					var id3 = new ID3(buffer); //memory issue large file

					delete buffer;
					fs.closeSync(fd);

					id3.parse();

					var tags = {
							"title" : id3.get("title"),
							"artist" :id3.get("artist"),
							"album"  :id3.get("album"),
							"year"   :id3.get("year"),
							"genre"  :id3.get("genre")
						};

					var datas = id3.get('picture');

					id3 = null;

					if(picture) {
						var pictureFounded = false;

						if(datas !== null && (datas.data !== undefined && datas.format !== undefined) ) {

							var coverName = new Buffer(tags.artist + tags.album).toString().replace(/[^a-zA-Z0-9]+/ig,'')

							  , file = p.join(global.conf.root, '/public/tmp/', coverName)

							  , type = datas.format.split('/');

							if(type[0] == 'image') {
								pictureFounded = true;

								file = file + '.' + type[1];

								if(!fs.existsSync(file))
									fs.writeFileSync(file, datas.data);

								delete datas;
								
								tags = _.extend(tags, {picture: file.replace(global.conf.root + '/public', '')});
							}

						}
						
						if(!pictureFounded)
							tags = _.extend(tags, {picture: findCoverInDirectory(p.dirname(filePath)) });
						
					}

					cb(err, tags);
				});
			}
		});
	}
};