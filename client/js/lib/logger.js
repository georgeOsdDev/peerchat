(function(){
  exports.log = (function(){
    return console.log.bind(console, "PeerChat: ");
  })();
})();
