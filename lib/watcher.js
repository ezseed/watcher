var db = require('ezseed-database').db
  , explorer = require('./explorer')
  , fs = require('fs')
  , debug = require('debug')('ezseed:watcher:watch')

var watcher = {
  watcher: null,
  watching: false,
  waiting: 0,
  //used to try watching once all events are done - see below
  timeout: null,
  close: function() {
    if(this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    if(fs.existsSync(process.ezseed_watcher.socket.replace('unix://', ''))) {
      fs.unlinkSync(process.ezseed_watcher.socket.replace('unix://', ''))
    }

    if(fs.existsSync(process.ezseed_watcher.rpc_socket.replace('unix://', ''))) {
      fs.unlinkSync(process.ezseed_watcher.rpc_socket.replace('unix://', ''))
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

    this.options.rpc.expose('refresh', function(paths, cb) {
      self.watching = true
      self.options.socket.send('watching', true)
      explorer.explore({paths: paths}, function(err, update) {
        self.watching = false
        self.options.socket.send('watching', false)
        cb(err, update)
      })
    })

    debug('Watching %s', this.path)

    var run = function(done) {
      debug('Running explorer')
      self.options.socket.send('watching', true)

      db.paths.get(function(err, docs) {

        if(err)
          throw new Error(err)

        explorer.explore({paths : docs}, function(err, update) {
          debug('End watching %s', self.path)

          self.options.socket.send('update', update)

          //starting it back
          // self.watch()
          self.watching = false
          self.options.socket.send('watching', false)
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

      //if we got a lot of events at the same time this is to wait until we received all events
      //in a small period of time before running the actual file explorer on the paths
      if(self.timeout) {
        clearTimeout(self.timeout)
      }

      self.timeout = setTimeout(function() {
        
        if(self.watching === true) {
          debug('Already watching - wait until finished')
          self.waiting++
          return
        }

        //closing watcher once we started
        self.watching = true
        run(runAgain)
        // self.close()
    }, 10)

  })
    
    return self
  }
}

module.exports = watcher
