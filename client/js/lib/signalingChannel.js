(function(){
  var EventEmitter       = require('events').EventEmitter,
      util               = require('util'),
      logger             = require('./logger.js')
      ;

  function Callbacks(){
    this.seq = 0;
    this.cbs = [];
  }
  Callbacks.prototype.invoke = function(seq, param){
    if (typeof this.cbs[seq] === "function") this.cbs[seq](param);
  };
  Callbacks.prototype.nextSeq = function(func){
      var _seq = this.seq;
      this.cbs[_seq] = func;
      this.seq++;
      return _seq;
  };


  function SignalingChannel(socket){
    this.userName      = null;
    this.loginSvc      = null;
    this.currentToUser = null;
    this.cbs           = new Callbacks();
    this.socket        = socket;
    this.initSocket();
  }
  util.inherits(SignalingChannel, EventEmitter);

  SignalingChannel.prototype.reconnect = function(_socket){
    var self = this;
    this.socket = _socket;
    self.initSocket();

    var seq = this.cbs.nextSeq(this.joinFunc);
    _socket.send(JSON.stringify({
        "seq"     :seq,
        "tag"     :"join",
        "fromUser":self.userName,
        "loginSvc":self.loginSvc,
        "hash"    :self.hash
      })
    );
  };

  SignalingChannel.prototype.initSocket = function() {
    var self    = this;
    this.socket.onopen = function(event) {
      logger.debug("Socket open",event);
      self.emit("open");
    };
    this.socket.onclose = function(event) {
      logger.debug("Socket close",event);
      self.emit("close");
    };
    this.socket.onmessage = function(event) {
      logger.debug("Socket receive message");
      var message = event.data ? JSON.parse(event.data) : {};
      if (message.seq !== undefined) return self.cbs.invoke(message.seq, message);
      switch (message.tag) {
        case "leave":
        case "new_member":
        case "offer":
        case "answer":
        case "candidate":
          logger.debug("Emit SignalingChanel event", message.tag);
          self.emit(message.tag, message);
          break;
        case "join":
          logger.debug("join should contain `seq`", message);
          break;
        default:
          logger.warn("Unknown message tag", message);
      }
    };
  };

  SignalingChannel.prototype.join = function(obj, func) {
    var seq       = this.cbs.nextSeq(func);
    this.userName = obj.userName;
    this.loginSvc = obj.loginSvc;
    this.hash     = obj.hash;
    this.joinFunc = func;
    // Join signaling Server with generated hash
    this.socket.send(JSON.stringify({
        "seq"     :seq,
        "tag"     :"join",
        "fromUser":obj.userName,
        "loginSvc":obj.loginSvc,
        "hash"    :obj.hash
      })
    );
  };

  SignalingChannel.prototype.offer = function(obj, func) {
    if (!this.userName || !this.loginSvc) return func({errCd: 10,"message":"ClientError: Not authorized."});
    var self = this,
        seq  = this.cbs.nextSeq(func);
    this.socket.send(JSON.stringify({
        "seq"     :seq,
        "tag"     :"offer",
        "fromUser":self.userName,
        "loginSvc":self.loginSvc,
        "toUser"  :obj.toUser,
        "data"    :obj.data
      })
    );
  };

  SignalingChannel.prototype.answer = function(obj, func) {
    if (!this.userName || !this.loginSvc) return func({errCd: 10,"message":"ClientError: Not authorized."});
    var self = this,
        seq  = this.cbs.nextSeq(func);
    this.socket.send(JSON.stringify({
        "seq"     :seq,
        "tag"     :"seq",
        "fromUser":self.userName,
        "loginSvc":self.loginSvc,
        "toUser"  :obj.toUser,
        "data"    :obj.data
      })
    );
  };

  SignalingChannel.prototype.candidate = function(obj, func) {
    if (!this.userName || !this.loginSvc) return func({errCd: 10,"message":"ClientError: Not authorized."});
    var self = this,
        seq  = this.cbs.nextSeq(func);
    this.socket.send(JSON.stringify({
        "seq"     :seq,
        "tag"     :"candidate",
        "fromUser":self.userName,
        "loginSvc":self.loginSvc,
        "toUser"  :obj.toUser,
        "data"    :obj.data
      })
    );
  };

  SignalingChannel.prototype.createP2PConnection = function(toUser){
    if (!this.userName || !this.loginSvc) return func({errCd: 10,"message":"ClientError: Not authorized."});
  };

  SignalingChannel.prototype.endCurrentP2PConnection = function(){

  };

  exports.SignalingChannel = SignalingChannel;
})();