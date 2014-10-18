var fs = require('fs')
  , p = require('path')
  , logger = require('ezseed-logger')('watcher')
  , debug = require('debug')('ezseed:watcher')
  , rpc = require('pm2-axon-rpc')
  , axon = require('axon')
  , rep = axon.socket('rep')
  , sock = axon.socket('push')
  , watcher

module.exports = function(options, cb) {
	
    options = options || {}
    options.root = options.root || __dirname
    options.tmp = options.tmp || p.join(options.root, '/tmp')
    options.socket = options.socket || 'unix://'+options.root+'/ezseed.sock'
    options.rpc_socket = options.rpc_socket || 'unix://'+options.root+'/ezseed_rpc.sock'

    options.lang = options.lang || 'en'

    options.path = {}

    if(!options.home)
      throw new Error('Ezssed home directory is not defined')

    options.path.relative = p.relative(__dirname, options.home) 
    options.path.absolute = p.resolve(__dirname, options.path.relative) 
    options.db = options.db || {}

    var watcher_options = {
        ignored: /[\/\\]\.|node_modules|incomplete/,
        persistent: false,
        ignoreInitial: true,
        usePolling: false,
        // useFsEvents: true
    }
    
    if(!fs.existsSync(options.tmp))
      fs.mkdirSync(options.tmp, '0775')

    //storing configuration into process
    process.ezseed_watcher = options

    require('ezseed-database')(options.db, function(){

      var server = new rpc.Server(rep)
      rep.bind(process.ezseed_watcher.rpc_socket)

      sock.bind(process.ezseed_watcher.socket)

      sock.on('bind', function() {
      
        debug('Socket bind on %s', process.ezseed_watcher.socket)
        watcher_options.socket = sock
        watcher_options.rpc = server
        
        debug('Launching watcher on '+ options.path.absolute)
        watcher = require('./lib/watcher').watch(options.path.absolute, watcher_options)

        //optional callback
        if(cb) cb(null, watcher)

      })
                    
    })


    process.on('SIGINT', function() {
      logger.info("Caught interrupt signal")

      if(watcher) {
        watcher.close()
      }

      setTimeout(function() {
        process.exit(0)
      }, 1000)
    })

    process.on('uncaughtException', function(e) {
      if(watcher) {
        watcher.close()
      }

      console.error(e.name+': ', e.message)
      console.error(e.stack)

      setTimeout(function() {
        process.exit(1)
      }, 1000)
    })
}
