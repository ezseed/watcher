var axon = require('axon')
  , sh = require('shelljs')
  , p = require('path')
  , fs = require('fs')
  , sock = axon.socket('pull')
  , db = require('ezseed-database').db
  , expect = require('chai').expect
  , pathToWatch
  , can_go_on = false
  , results

var others, movies, albums

var opts = {
	db: {database: 'ezseed-test'},
}

var timer = {
	mstart: null,
	mend: null,
	index: -1,
	start: function() {
		this.mstart = Date.now()
	},
	end: function() {
		this.mend = Date.now()
	},
	diff: function() {
		return this.mend - this.mstart
	},
	save: function() {
		this.end()
		this.intervals.push(this.diff())
		this.index++
	},
	print: function() {
		return '+' + this.intervals[this.index] + 'ms'
	},
	intervals: []
}

//hack to wait until task finishes 
//update complete is send through an axon socket event
var wait_until_task_complete = function(cb) {
	var interval = setInterval(function() {
		if(can_go_on === true) {
			can_go_on = !can_go_on
			clearInterval(interval)
			cb()
			//hack to get print after it('') statement does
			console.log(timer.print())
		}
	}, 100)
}

var start = function() {
	var tobewatch = p.resolve(pathToWatch.path, '../tobewatch')

	sh.cp('-R', tobewatch+'/*', pathToWatch.path)
}

var remove = function() {
	sh.rm('-rf', pathToWatch.path + '/*')
}

describe('watcher', function() {
	this.timeout(10000)
	this.watcher = null
	var self = this

	it('should start watcher', function(cb) {
		//start watcher - async to make sure db is opened
		require('../')(opts, function(err, watcher) {
			
			self.watcher = watcher

			sock.connect(process.ezseed_watcher.socket)

			sock.on('connect', function() {			
				//create a path to watch
				cb()
			})

			sock.on('message', function(msg, update){
				timer.save()
				expect(msg).to.equal('update')
				expect(update).to.have.length.of(1)
				can_go_on = true
			})


		})
	})

	it('should create a path', function(cb) {

		db.paths.save(process.ezseed_watcher.path.absolute, function(err, doc) {
					
			if(err) {
				db.paths.get(process.ezseed_watcher.path.absolute, function(err, doc) {
					expect(err).to.be.null
					pathToWatch = doc
					cb()
				})
			} else {
				expect(err).to.be.null
				pathToWatch = doc
				cb()
			}

		})

	})

	it('should parse the folder and send a message through socket', function(cb) {

		start()
		timer.start()

		wait_until_task_complete(cb)
	})


	it('should get paths from db', function(cb) {

		db.paths.get(pathToWatch._id, function(err, docs) {
			expect(err).to.be.null

			results = docs
			others = docs.others, movies = docs.movies, albums = docs.albums

			cb()

		})

	})


	it('should have the right amount of movies', function(cb) {
		expect(movies).to.have.length.of(5)
		//hack to force async
		setTimeout(cb, 10)
	})

	it('should have 2 series and 3 movies', function(cb) {
		var series = 0, films = 0

		for (var i = 0; i < movies.length; i++) {
			if(movies[i].movieType == 'tvseries') {
				if(movies[i].name.toUpperCase() == 'LOL')
					expect(movies[i].videos).to.have.length.of(3)

				series++
			} else if(movies[i].movieType == 'movie')
				films++
		}

		expect(series).to.equal(2)
		expect(films).to.equal(3)

		setTimeout(cb, 10)

	})

	it('should have the right amount of albums and songs', function(cb) {
		expect(albums).to.have.length.of(4)

		var l = albums.length

		while(l--) {
			expect(albums[1].songs.length).to.be.at.least(1)
			expect(albums[1].songs.length).to.be.at.most(3)
		}

		setTimeout(cb, 10)

	})

		
	it('should have the right number of others', function(cb) {

		expect(others).to.have.length.of(3)

		setTimeout(cb, 10)

	})


	it('should trigger watcher again [change]', function(cb) {

		fs.writeFileSync(pathToWatch.path+'/other/test1.txt', 'another test data')
		timer.start()

		wait_until_task_complete(cb)
	})


	it('should get same results as before', function(cb) {

		db.paths.get(pathToWatch._id, function(err, docs) {
			expect(err).to.be.null

			expect(results.toObject()).to.deep.equal(docs.toObject())
			cb()

		})

	})
	
	//yup files existed in db
	it('should have been faster than before', function(cb) {
		expect(timer.intervals[0] > timer.intervals[1]).to.be.true
		cb()
	})

	it('should trigger watcher again [add]', function(cb) {

		fs.writeFileSync(pathToWatch.path+'/video/LOL.S04E16.1080p-crew.mkv', 'another test data')
		timer.start()

		wait_until_task_complete(cb)
	})

	it('should have added the tvseries to the right item', function(cb) {
		
		db.paths.get(pathToWatch._id, function(err, docs) {
			expect(err).to.be.null

			expect(docs.movies).to.have.length.of(results.movies.length)
			cb()

		})

	})

	it('should trigger watcher again [remove]', function(cb) {

		remove()
		timer.start()

		wait_until_task_complete(cb)

	})

	it('should have removed files', function(cb) {
		db.paths.get(pathToWatch._id, function(err, docs) {
			expect(err).to.be.null

			results = docs
			others = docs.others, movies = docs.movies, albums = docs.albums

			expect(docs.movies).to.be.empty
			expect(docs.albums).to.be.empty
			expect(docs.others).to.be.empty

			cb()

		})

	})


	after(function(cb) {
		self.watcher.close()
		db.paths.remove(pathToWatch._id, function(err) {
			sh.rm('-rf', process.ezseed_watcher.tmp)
			sh.rm('-rf', p.join(process.ezseed_watcher.root, 'ezeed.sock'))
			expect(err).to.be.null
			cb()
		})
	})

})

