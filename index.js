var fs = require('fs')
  , p = require('path')
  , logger = require('ezseed-logger')('watcher')
  , debug = require('debug')('ezseed:watcher')
  , chalk = require('chalk')
  , axon = require('axon')
  , sock = axon.socket('push')

module.exports = function(options, cb) {
	
    options = options || {}
    options.root = options.root || __dirname
    options.tmp = options.tmp || p.join(options.root, '/tmp')
    options.socket = options.socket || 'unix://'+options.root+'/ezseed.sock'

    options.path = {}
    options.path.relative = options.home ? p.relative(__dirname, options.home) : p.relative(__dirname, p.resolve(__dirname, './test/fixtures/watch'))
    options.path.absolute = p.resolve(__dirname, options.path.relative)
    options.db = options.db || {}

    var watcher_options = {
        ignored: /[\/\\]\.|node_modules/,
        persistent: true,
        ignoreInitial: true,
        // usePolling: false,
        // useFsEvents: true
    }
    
    if(!fs.existsSync(options.tmp))
      fs.mkdirSync(options.tmp, '0775')

    //storing configuration into process
    process.ezseed_watcher = options

    require('ezseed-database')(options.db, function(){

      sock.bind(process.ezseed_watcher.socket)

      sock.on('bind', function() {
      
        debug('Socket bind on %s', process.ezseed_watcher.socket)
        watcher_options.socket = sock
        
        var watcher = require('./lib/watcher').watch(options.path.absolute, watcher_options)

        //optional callback
        if(cb) cb(null, watcher)

      })
                    
    })


    process.on('SIGINT', function() {
      logger.info(chalk.bold.red("Caught interrupt signal"))

      setTimeout(function() {
              process.exit()
          , 1000})
    })

}
