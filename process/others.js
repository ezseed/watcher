var cache = require('memory-cache')
  , findIndex = require('./helpers').findIndex
  , checkIsOther = require('./helpers').checkIsOther
  , p = require('path')
  , fs = require('fs')
  , logger = require('ezseed-logger')('process:others')
  , debug = require('debug')('ezseed:watcher:process:others')

/**
* Main function to process files
* @param othersFiles : list of others files
* @param callback : the parallel callback (see async.parallel) 
* @return callback
**/

module.exports = function(params) {

  //Redis would be prefered
  var cached = cache.get('others') ? cache.get('others') : []

  var pathToWatch = params.pathToWatch
    , others = []
    , e, l = params.others.length

  debug('Has %s files to parse', l)

  while(l--) {
    e = params.others[l]

    var exists = false

    //Test if the file already exists by path
    var z = cached.length, j = 0

    //Search paths in cached values (only files belonging to an album or a movie nfo|pictures etc.)
    while(z--) {
      if(e.path == cached[z]) {
        exists = true
        debug('cached file %s exists', e.path)
        break;
      }
    }

    if(exists === false) {
      var k = params.existing.length 

      //Same but on existing files (database)
      while(k--) {

        if(params.existing[k].prevDir == e.prevDir) {
          exists = true;
          break;
        }

        j = params.existing[k].files ? params.existing[k].files.length : 0
        while(j--) {
          if(params.existing[k].files[j] !== null && params.existing[k].files[j].path == e.path) {
            exists = true
            break;
          }
        }

        if(exists === true) {
          debug('file %s exists in db', e.path)
          break;
        }
      }

    }

    debug(e.prevDir, e.name)

    //check if the file is belonging to a known directory but not the root directory
    if(e.prevDir != pathToWatch && exists === false) {
      debug('test on prevDir')

      var indexMatch = findIndex(others, function(other) { 
        // console.log(e.prevDir == other.prevDir, e.name + ' vs ' + other.name)
        return e.prevDir == other.prevDir 
      }) 

      if(indexMatch !== null) {
        exists = true
        debug('Others this is a file for a subdirectory - indexMatch on %s at %s- skipping', others[indexMatch].name, indexMatch)
      } else {
        //Checking if the directory contains a video/audio file
        try {
          var directoryFiles = fs.readdirSync(e.prevDir)

          var map = directoryFiles.map(function(path){ return p.join(e.prevDir, path) })

          if(checkIsOther(map) !== true) {
            //we cache files that aren't others, checkIsOther is heavy...
            debug('%s was a part of an album or a movie, skipping', e.path)
            cached.push(e.path)
            cache.put('others', cached)
            exists = true
          }
        } catch(e) {
          logger.error(e.message)
        }

      }
    }

    //does not exist, add it to database
    if(exists === false) {
      debug('does not exist', e.path)

      others.push({
        name : e.name,
        files : [e],
        prevDir : e.prevDir,
        prevDirRelative : e.prevDir.replace(pathToWatch, '')
      })
    }

  }

  return others
}
