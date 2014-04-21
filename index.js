var fs = require('fs'), p = require('path'), db = require('ezseed-database')

module.exports = function(options) {
	
	options.root = options.root || __dirname
	options.tmp = options.tmp || p.join(options.root, '/tmp')

	if(!fs.existsSync(options.tmp))
		fs.mkdirSync(options.tmp, '0775');

	//storing configuration into env
	process.env.ezseed = options

	db(function(){
		db = db.db

		require('chokidar')
			.watch('file or dir', {ignored: /[\/\\]\./, persistent: true})
			//all => path + add to db, chokidar just launches parsing once
			.on('all', function(event, path) {
			   console.log(event, path)
/*
			   	database.paths.getAll(function(err, docs) {

			var paths = [];

			if(docs) {
				for(var p in docs)
					paths.push(docs[p].path);

				explorer.explore({docs : {paths : docs}, paths : paths}, function(err, update) {
					self.setInterval();
				});
			} else {
				self.setInterval();
			}
		});*/
			})

	})
}