var db = require('ezseed-database').db
  , explorer = require('./explorer')
  , debug = require('debug')('ezseed:watcher:watch')

var watcher = {
  watcher: null,
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

    this.watcher.once('all', function(event, item) {
      debug(event, item)

      //closing watcher once we started
      self.close()

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
          self.watch()
          return
        })

      })


    })

    return self
  }
}

module.exports = watcher
