var EventEmitter = require('events').EventEmitter,
    util         = require('util'),
    logger       = require('./logger.js')
    ;

(function(){
  function Callbacks(){
    this.seq = 0;
    this.cbs = [];
  }
  Callbacks.prototype.invoke = function(seq, param){
    logger.log("invoke",seq,param);
    logger.log(this.cbs[seq]);
    if (typeof this.cbs[seq] === "function") this.cbs[seq](param);
  };
  Callbacks.prototype.nextSeq = function(func){
      var _seq = this.seq;
      this.cbs[_seq] = func;
      this.seq++;
      logger.log("setCb",_seq,func);
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

  SignalingChannel.prototype.initSocket = function() {
    var self    = this;
    this.socket.onopen = function(event) {
      self.emit(event);
    };
    this.socket.onclose = function(event) {
      logger.log(event);
      self.emit(event);
    };
    this.socket.onmessage = function(event) {
      logger.log(event);
      var message = event.data ? JSON.parse(event.data) : {};
      if (message.seq !== undefined) return self.cbs.invoke(message.seq, message);
      switch (message.tag) {
        case "leave":
        case "new_member":
        case "offer":
        case "answer":
        case "candidate":
          self.emmit(message.tag, message);
          break;
        case "join":
          logger.log("join should contain `seq`", message);
          break;
        default:
          logger.log("Unknown message tag", message);
      }
    };
  };

  SignalingChannel.prototype.join = function(obj, func) {
    var seq       = this.cbs.nextSeq(func);
    this.userName = obj.userName;
    this.loginSvc = obj.loginSvc;
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
    var self    = this,
        nextSwq = this.cbs.nextSeq(func);
    socket.send(JSON.stringify({
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
    var self    = this,
        nextSwq = this.cbs.nextSeq(func);
    socket.send(JSON.stringify({
        "seq"     :seq,
        "tag"     :"answer",
        "fromUser":self.userName,
        "loginSvc":self.loginSvc,
        "toUser"  :obj.toUser,
        "data"    :obj.data
      })
    );
  };

  SignalingChannel.prototype.candidate = function(obj, func) {
    if (!this.userName || !this.loginSvc) return func({errCd: 10,"message":"ClientError: Not authorized."});
    var self    = this,
        nextSwq = this.cbs.nextSeq(func);
    socket.send(JSON.stringify({
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