var fs = require('fs')
var path = require('path')

var noDotFiles = function(x) {
  return x[0] !== '.'
}

var deep = 0;

module.exports = function read(root, options, files, prefix) {
  prefix = prefix || ''
  files = files || []
  options = options || {filter: noDotFiles, maxDepth: 0}

  var dir = path.join(root, prefix)
  if (fs.lstatSync(dir).isDirectory()) {
    deep = prefix.split(path.sep).length

    if(options.maxDepth !== 0 && deep > options.maxDepth) {
      return files.push(dir)
    //test for .app directories
    } else if(new RegExp('\.app', 'i').test(path.basename(prefix))) {
      return files.push(dir)
    }

    fs.readdirSync(dir)
    .filter(options.filter)
    .forEach(function (name) {
      read(root, options, files, path.join(prefix, name))
    })

  } else {
    files.push(dir)
  }

  return files
}


