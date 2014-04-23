var fs = require('fs')
  , mime = require('mime')
  , p = require('path')
  , _s = require('underscore.string')

var helpers = {
	//Dummy name by replacing the founded objects (qulity, subtitles etc.)
	dummyName: function (name, obj) {

		var o = {quality: '', subtitles: '', language: '', format: ''}

		if(name !== undefined)
			name = name.toLowerCase()
					.replace(obj.quality.toLowerCase(), '')
					.replace(obj.subtitles.toLowerCase(), '')
					.replace(obj.language.toLowerCase(), '')
					.replace(obj.format.toLowerCase(), '')
					.replace(obj.audio.toLowerCase(), '')


		return _s.titleize(_s.trim(name))
	},
	/**
	* Searches for a cover in a directory
	**/
	findCoverInDirectory: function(dir) {
		var files = fs.readdirSync(dir)
		
		var m, type, cover

		for(var i in files) {
			m = mime.lookup(files[i])
			type = m.split('/')
			if(type[0] == 'image') {
				cover = files[i]
				break
			}
		}
		
		return cover === undefined ? null : p.join(dir, cover)
	},
	contains: function(words, item) {

		var v = '', result = null

		for(var j in words) {
			v = words[j]

			for(var i in item) {
				if ( _s.trim(v.toLowerCase()) == item[i] ) 
					result = result ? result + ' ' + item[i] : item[i] 
			}
		}

		return result
	},
	tag: function(words, item) {
		var tag = helpers.contains(words, item)

		return tag !== null && tag.length > 0 ? tag.toUpperCase() : ''
	}
}

module.exports = helpers