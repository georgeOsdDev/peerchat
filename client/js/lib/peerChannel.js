(function(){
  var EventEmitter       = require('events').EventEmitter,
      util               = require('util'),
      logger             = require('./logger.js')
      ;
  var pc_config    = {
    "iceServers": [{"url": "stun:stun.l.google.com:19302"}]
  };
  var dataChannelOptions = {
    ordered: true,
    reliable: false,
    maxRetransmitTime: 3000, // in milliseconds
  };

  function PeerChannel(signalingChannel, ctx){
    this.signalingChannel = signalingChannel;

    webkitRTCPeerConnection = ctx.webkitRTCPeerConnection;
    RTCSessionDescription   = ctx.RTCSessionDescription;
    RTCIceCandidate         = ctx.RTCIceCandidate;
    navigator               = ctx.navigator;
  }
  util.inherits(PeerChannel, EventEmitter);


  PeerChannel.prototype.start = function(func){
    var self = this;
    this.pc = new webkitRTCPeerConnection(pc_config);

    this.signalingChannel.on("answer",     this.onAnswer);
    this.signalingChannel.on("candidate",  this.onCandidate);

    this.pc.ondatachannel = function(event) {
      logger.debug("onDataChannel", event);
      self.receiveDataChannel = event.channel;
      self.receiveDataChannel.onmessage = function(event){
        self.emit("message", event);
      };
    };

    this.pc.onicecandidate = function(event) {
      logger.debug("PeerConnection on IceCandidate");
      self.signalingChannel.candidate({
        "toUser":self.currentRemote,
        "data":event.candidate
      });
      self.emit("icecandidate", event);
    };

    this.pc.onaddstream = function (event) {
      logger.debug("PeerConnection on AddStream");
      self.emit("addstream", event.stream);
    };

    var success = function (stream) {
      self.pc.addStream(stream);
      func(null, stream);
    };
    var fail = function (error) {
      logger.error("Can not access user media", error);
      func(error);
    };
    navigator.webkitGetUserMedia({"audio": true, "video": true }, success, fail);

  };

  PeerChannel.prototype.close = function(){
    try {
      this.pc.close();
    } catch (e){}
  };

  PeerChannel.prototype.offer = function(member){
    var self = this;
    this.currentRemote = member;
    var cb = function(param){
      logger.log(param);
      if (param.errCd === 0) self.createDataChannel();
    };

    this.pc.createOffer(function(desc){
      self.pc.setLocalDescription(desc);
      self.signalingChannel.offer({
        "toUser"  :member,
        "data"    :desc
      }, cb);
    });
  };

  PeerChannel.prototype.answer = function(offer){
    logger.debug("Start answer");
    var self = this;
    this.currentRemote = offer.fromUser;
    this.pc.setRemoteDescription(new RTCSessionDescription(offer.data), function() {
      self.pc.createAnswer(function(desc){
        self.pc.setLocalDescription(desc, function() {
          self.signalingChannel.answer({
            toUser:offer.fromUser,
            data:desc
          });
        });
      });
    });
  };

  PeerChannel.prototype.onAnswer = function(message) {
    this.pc.setRemoteDescription(new RTCSessionDescription(message.data));
  };

  PeerChannel.prototype.onCandidate = function(message) {
    if (this.pc) {
      this.pc.addIceCandidate(new RTCIceCandidate(JSON.stringify(message.data)));
    }
  };

  PeerChannel.prototype.sendTextData = function(data){
    if (!this.sendDatatCahannel) {
      return logger.warn("No Data Channel available");
    }
    if (typeof data != "string") {
      try {
        data = JSON.stringify(data);
      } catch (e) {
        return logger.error("Parse error ", e);
      }
    }
    this.sendDataChannel.send(data);
  };

  PeerChannel.prototype.createDataChannel = function(){
    var self = this;
    self.sendDataChannel = self.pc.createDataChannel("sendDataChannel", {});
    self.sendDataChannel.onerror = function (error) {
      logger.warn("Data Channel Error:", error);
      self.emit("dataChannelError", error);
    };

    self.sendDataChannel.onmessage = function (event) {
      logger.debug("Got Data Channel Message:", event);
      self.emit("dataChannelMessage", event.data);
    };

    self.sendDataChannel.onopen = function (event) {
      logger.debug("Data Channel Open:", event);
      self.emit("dataChannelOpen", event);
    };

    self.sendDataChannel.onclose = function (event) {
      logger.debug("Data Channel Closed", event);
      self.emit("dataChannelClose", event);
    };
  };


  exports.PeerChannel = PeerChannel;
})();