var async = require('async')
  , db = require('ezseed-database')
  , fs = require('fs')
  , debug = require('debug')('ezseed:watcher:remove')
  , logger = require('ezseed-logger')('watcher')

//scope
var to_remove = []

/**
 * tests if the file still exists
 * if not we delete it from database
 * @param  {object}   params   [see below item, type, file]
 * @return {callback} err, item or null if removed
 */
var exists = function(params, callback) {
  
  var item = params.item

  if(!fs.existsSync(item.path)) {

    debug('%s has been deleted', item.path)

    //stores all items to be removed
    //it is then send to database so that the client can remove them live
    to_remove.push({
      type: params.type,
      item: item._id,
      file: params.file._id
    })

    var file_type = db.helpers.filename(params.type)
    
    db.db[params.type][file_type].delete(item._id, params.file._id, function(err) {
      if(err)
        logger.error('Error while removing %s', file_type, err)

      callback(null, null)
    })
    
  } else {
    callback(null, item)
  }

}

/**
 * Find missing
 * for each item parse it's file and call exists
 * @param  {[type]} type  [description]
 * @param  {[type]} items [description]
 * @return {[type]}       [description]
 */
var find_missing = function(type, items) {

  return function(next) {
    //map items  
    async.map(items, function(file, done) {

      var paths = file.videos || file.songs || file.files
        , file_type = file.videos ? 'videos' : file.songs ? 'songs' : 'files'

      /*
      if(paths.length === 0) {
        logger.error('%s (%s) has not %s', file._id, file.type, file_type)
        done(null, file)
      }*/

      async.mapSeries(paths, function(path, callback) {

        exists(
          {
            type: type,
            item: path,
            file: file

          }, callback)

      }, function(err, data) {

        //we need back our files <type>
        file[file_type] = data.filter(function(v) { return v }) //removes falsy values from array
        
        //delete item if there are no files left
        if(file[file_type].length === 0) {
          debug('%s (%s) has no %s anymore - deleting', file._id, file.type, file_type)
          db.db[file.type].delete(file._id, done)
        } else
          done(null, file)
      })

    }, next)
  }
}

var remove = function (existing, id_path, cb) {

  //Parallel on 3 types, find the missing ones
  async.parallel(
  {
      movies: find_missing('movies', existing.movies),
      albums: find_missing('albums', existing.albums),
      others: find_missing('others', existing.others)
  },
  function(err, results) {
    debug('%s files to be removed', to_remove.length)

    db.db.remove.store(id_path, to_remove, function(err, docs) {

      to_remove = []

      //Replacing original variables
      existing.movies = results.movies
      existing.albums = results.albums
      existing.others = results.others

        cb(null, existing)
    })
    
  })  
}

module.exports = remove
