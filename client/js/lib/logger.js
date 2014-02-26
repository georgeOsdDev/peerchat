(function(){
  exports.log = (function(){
    return console.log.bind(console, "PeerChat: ");
  })();
  exports.debug = (function(){
    return console.debug.bind(console, "PeerChat: ");
  })();
  exports.info = (function(){
    return console.info.bind(console, "PeerChat: ");
  })();
  exports.warn = (function(){
    return console.warn.bind(console, "PeerChat: ");
  })();
  exports.error = (function(){
    return console.error.bind(console, "PeerChat: ");
  })();
})();
