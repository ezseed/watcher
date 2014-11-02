var debug = require('debug')('ezseed:watcher:explorer')
  , logger = require('ezseed-logger')('watcher')
  , read = require('./readdir')
  , pathInfos = require('path')
  , mime = require('mime')
  , async = require('async')
  , db = require('ezseed-database').db
  , remove = require('./remove')
  , fs = require('fs')

exports.explore = function(params, done) {

  if(Object.prototype.toString.call(params.paths) !== '[object Array]')
    params.paths = [params.paths]

  var explorePath = function(pathToWatch, pathCallback) {
    debug('exploring', pathToWatch)
  
    // if(process.env.NODE_ENV != 'production')
    //   console.time('paths')
    
    //Get db files first
    var len = params.paths ? params.paths.length : 0, id_path

    while(len--) {
      if(params.paths[len] && params.paths[len].path == pathToWatch) {
        id_path = params.paths[len]._id
        break;
      }

    }

    db.paths.get(id_path, function(err, existing) {
      
      if(err)
        throw err
      else if(!existing)
        return pathCallback(null, {})

      //leaning
      existing = existing.toObject()

      //compare existing in parser after removing the files which doesn't exists      
      remove(existing, id_path, function(err, existing) {
        
        if(!fs.existsSync(pathToWatch)) {
          logger.warn('Path %s does not exist, removing from database', pathToWatch)
          return db.paths.remove(pathToWatch, pathCallback)
        }

        //Getting each files
        var filePaths = read(pathToWatch)

        if(filePaths.length) {

          var i = filePaths.length - 1
            , audios = [], videos = [], others = []
            , a = 0, v = 0, o = 0
            , mimetype, file

          //Getting types from mime (by extension)
          do {

            if(!filePaths[i]) {
              debug('filepath empty', filePaths[i])
            } else {

              mimetype = mime.lookup(filePaths[i]).split('/')

              file = {
                name : pathInfos.basename(filePaths[i]),
                path : filePaths[i],
                prevDir : pathInfos.dirname(filePaths[i]),
                prevDirRelative : pathInfos.dirname(filePaths[i]).replace(root.rootPath, ''),
                type : mimetype[0],
                ext : mimetype[1],
                size : fs.existsSync(filePaths[i]) ? fs.statSync(filePaths[i]).size : 0
              }

              if(pathInfos.extname(file.path) == '.m3u')
                file.type = 'other'

              if(file.type === 'audio')
                audios[a++] = file
              else if(file.type === 'video')
                videos[v++] = file
              else
                others[o++] = file


            }
          } while(i--)


          var process = function(type, params) {
            return function(cb) {
              require('../process/'+type)(params, function(err, items) {
                db[type].save(items, id_path, function(err, items) {
                  cb(err, items)
                })

              })  
            }
          }

          async.parallel({
            albums : process('albums', {pathToWatch : pathToWatch, audios: audios, existing: existing.albums}),
            movies : process('movies', {pathToWatch : pathToWatch, videos: videos, existing: existing.movies}),
          }, pathCallback)

        } else {
          pathCallback(null, [])
        }

      })
      
    })

  }

  //Formatting paths to an array of paths
  var paths = []

  for(var p in params.paths)
    paths.push(params.paths[p].path)

  async.map(paths, explorePath, function(err, results){

    debug('Each paths done.' )
  
    // if(process.env.NODE_ENV != 'production')
    //   console.timeEnd('paths')
  
    debug(require('ansi-rainbow').r('-------------------------------------------------'))
    done(err, results)
  })
}
