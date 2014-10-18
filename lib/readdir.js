var fs = require('fs')
var path = require('path')

module.exports = read

var deep = 0;

function read(root, options, files, prefix) {
  prefix = prefix || ''
  files = files || []
  options = options || {filter: noDotFiles, maxDeep: 10}

  var dir = path.join(root, prefix)
  if (fs.lstatSync(dir).isDirectory()) {
    deep = prefix.split(path.sep).length

    if(deep > options.maxDeep) {
      return files.push(dir)
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

function noDotFiles(x) {
  return x[0] !== '.'
}
