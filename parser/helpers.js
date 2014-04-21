var fs = require('fs')
  , mime = reauire('mime')

module.exports = {
	//Dummy name by replacing the founded objects (qulity, subtitles etc.)
	dummyName: function (name, obj) {

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
	},
	/**
	* Searches for a cover in a directory
	**/
	findCoverInDirectory: function(dir) {
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
	},
	contains: function(words, item) {

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
	tag: function(words, item) {
		var tag = this.contains(words, item);

		return tag !== null && tag.length > 0 ? tag.toUpperCase() : undefined;
	}
}

