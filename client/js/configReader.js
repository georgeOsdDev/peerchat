var fs = require('fs');
exports.readLines = function(path, sep, func){
  function _readLines(input, sep, func) {
    var remaining = '',
        config    = {},
        saveMem   = function(line){
          var tokens  = line.split(sep);
          var key     = tokens.shift(1).trim();
          val         = tokens.join(sep).trim().trim;
          config[key] = val;
        };
    input.on('data', function(data) {
      remaining += data;
      var index = remaining.indexOf('\n');
      while (index > -1) {
        var line = remaining.substring(0, index);
        remaining = remaining.substring(index + 1);
        saveMem(line);
        index = remaining.indexOf('\n');
      }
    });

    input.on('end', function() {
      if (remaining.length > 0) {
        saveMem(remaining);
      }
      func(null, config);
    });

    input.on('error', function(e) {
      func(e);
    });

  }
  _readLines(fs.createReadStream(path), sep, func);
};
exports.readJson = function(path, func){
  var data = fs.readFile(path, function(err, data){
    if (err) return func(err);
    func(null, JSON.parse(data.toString()));
  });
};