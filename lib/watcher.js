var db = require('ezseed-database').db
  , explorer = require('./explorer')
  , debug = require('debug')('ezseed:watcher:watch')

var watcher = {
  watcher: null,
  watching: false,
  waiting: 0,
  close: function() {
    if(this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    return this
  },
  path: null,
  options: null,
  watch: function(pathToWatch, options) {
    var self = this

    this.path = this.path !== null ? this.path : pathToWatch
    this.options = this.options !== null ? this.options : options

    this.watcher = require('chokidar').watch(this.path, this.options)

    debug('Watching %s', this.path)

    var run = function(done) {
      db.paths.get(function(err, docs) {

        var paths = []

        if(err)
          throw new Error(err)

        for(var p in docs)
          paths.push(docs[p].path)

        explorer.explore({docs : {paths : docs}, paths : paths}, function(err, update) {
          debug('End watching %s', self.path)

          self.options.socket.send('update', update)

          //starting it back
          // self.watch()
          self.watching = false
          return done ? done() : null
        })

      })
    }

    var runAgain = function() {
        if(self.waiting > 0) {
          debug('Running again, '+ self.waiting+ ' events not processed')
          self.watching = true
          self.waiting = 0
          run(runAgain)
        } else {
          return;
        }
    }

    this.watcher.on('all', function(event, item) {

      debug(event, item)
    
      if(self.watching === true) {
        debug('Already watching - wait until finished')
        self.waiting++
        return
      }

      //closing watcher once we started
      self.watching = true
      run(runAgain)
      // self.close()

    })

    return self
  }
}

module.exports = watcher
