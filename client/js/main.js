(function(GLOBAL){
  var nwgui            = require('nw.gui'),
      configReader     = require('./js/lib/configReader.js'),
      authHandler      = require('./js/lib/authHandler.js'),
      SignalingChannel = require('./js/lib/signalingChannel.js').SignalingChannel,
      PeerChannel      = require('./js/lib/PeerChannel.js').PeerChannel,
      interval         = require('./js/lib/ExponentialBackoff.js'),
      logger           = require('./js/lib/logger.js')
      ;


  // namespace
  var PeerChat = {};
  PeerChat.View = {};

  // ---------------------------------------------------------------------------
  // View
  // ---------------------------------------------------------------------------
  PeerChat.View.memberTpl = _.template($("#member_tpl").html());

  PeerChat.View.renderUserInfo = function(userName, avatarUrl, loginSvc){
    $("#userName").text(userName + " @ ");
    $("#loginSvc").addClass("fa-"+loginSvc.toLowerCase());
    $("#avatarUrl").attr("src", avatarUrl);
    $("#user").removeClass("hide");
    $("#login").hide();
  };

  PeerChat.View.renderLoginFail = function(){
  };


  PeerChat.View.removeFromContactList = function(member){
    if (typeof member === "object") member = member.data;
    $("#"+member).remove();
  };

  PeerChat.View.appendToContactList = function(member){
    if (typeof member === "object") member = member.data;
    if (PeerChat.userName + "_from_" + PeerChat.loginSvc === member) return false;

    var token    = member.split("_from_"),
        name     = token[0],
        loginSvc = token[1]
        ;
    var compiled = PeerChat.View.memberTpl({
                      member:member,
                      name:name + " @ ",
                      loginSvc:"fa-"+loginSvc.toLowerCase()
                    });
    $("#contact_list").append(compiled);
  };

  PeerChat.View.renderMember = function(members){
    $("#contact_list").empty();
    _.each(members, PeerChat.View.appendToContactList);
  };

  PeerChat.View.startLocalVideo = function(err, stream){
    if (err) {
      logger.log("Fail to start LocalVideo", err);
    } else {
      $("#localVideo").attr("src", window.webkitURL.createObjectURL(stream)).removeClass("hide");
    }
  };

  PeerChat.View.startRemoteVideo = function(stream){
    $("#remoteVideo").attr("src", window.webkitURL.createObjectURL(stream)).removeClass("hide");
  };

  PeerChat.View.renderOffer = function(offer){
    $("#modalBody").text("Offer from " + offer.fromUser);
    $('#offerModal').modal('show');
    $("#acceptOffer").off().on("click", function(){
      PeerChat.peerChannel.answer(offer);
    });
  };

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  PeerChat.Auth = {};
  PeerChat.Auth.processing = false;

  PeerChat.Auth.success = function(data){
    PeerChat.View.renderUserInfo(data.userName, data.avatarUrl, data.loginSvc);
    PeerChat.Auth.saveMyInfo(data.userName, data.avatarUrl, data.loginSvc);
    PeerChat.Signaling.join(data);
    PeerChat.Auth.processing = false;
  };

  PeerChat.Auth.fail = function(error){
    logger.warn(error);
    PeerChat.View.renderLoginFail();
    PeerChat.Auth.processing = false;
  };

  PeerChat.Auth.saveMyInfo = function(userName, avatarUrl, loginSvc){
    PeerChat.userName  = userName;
    PeerChat.avatarUrl = avatarUrl;
    PeerChat.loginSvc  = loginSvc;
  };


  // ---------------------------------------------------------------------------
  // Signaling
  // ---------------------------------------------------------------------------
  PeerChat.Signaling = {};
  PeerChat.Signaling.resetInterval = function(){
    logger.debug("Reset reconect interval");
    interval.reset();
  };

  PeerChat.Signaling.reconnect = function(){
    var delay = interval.nextDelay();
    logger.debug("Retry connect after " + delay + "ms...");
    setTimeout(function(){
      PeerChat.Signaling.setup(PeerChat.config.signalingUrl);
    },delay);
  };

  PeerChat.Signaling.setup = function(url) {

    if (PeerChat.signalingChannel){
      PeerChat.signalingChannel.removeAllListeners();
    }
    PeerChat.signalingChannel = new SignalingChannel(new WebSocket(url));
    PeerChat.peerChannel      = new PeerChannel(PeerChat.signalingChannel, window);

    // signalingChannel to Application
    PeerChat.signalingChannel.on("open",       PeerChat.Signaling.resetInterval);
    PeerChat.signalingChannel.on("close",      PeerChat.Signaling.reconnect);

    PeerChat.signalingChannel.on("new_member", PeerChat.View.appendToContactList);
    PeerChat.signalingChannel.on("leave",      PeerChat.View.removeFromContactList);

    PeerChat.signalingChannel.on("offer",      PeerChat.View.renderOffer);

    // signalingChannel to peerChannel
    // Move to peerChannel.start
    // PeerChat.signalingChannel.on("answer",     PeerChat.peerChannel.onAnswer);
    // PeerChat.signalingChannel.on("candidate",  PeerChat.peerChannel.onCandidate);


    // peerChannel to Application
    PeerChat.peerChannel.on("addStream",       PeerChat.View.startRemoteVideo);

  };


  PeerChat.Signaling.join = function(data){
    PeerChat.signalingChannel.join(data, function(res){
      PeerChat.View.renderMember(res.data);
      PeerChat.peerChannel.start(PeerChat.View.startLocalVideo);
    });
  };

  PeerChat.Signaling.startOffer = function(member){
    logger.debug("Start offer to ", member);
    PeerChat.peerChannel.offer(member);
  };



  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------
  configReader.readJson('./config/auth.conf', function(err, _config){
    if (err) return false;
    var config = PeerChat.config = _config;
    PeerChat.Signaling.setup(config.signalingUrl);

    $(function(){

      // Try to login
      $(".authButton").on("click",function(e){
        e.preventDefault();
        if (PeerChat.Auth.processing) return false;
        var setting, url, authPop;


        // This index.html is in "file://" protocol.
        // OAuth information from server and services are in http(s) protocol,
        url     = $(e.currentTarget).data('url');
        setting = ["menubar=no",
                   "location=no",
                   "resizable=yes",
                   "scrollbars=yes",
                   "status=yes"].join(",");
        authPop = window.open(config[url], url, setting);

        // Listen popup and as nodewebkit-window
        authPopNw = nwgui.Window.get(authPop).on('loaded', function(){
          // Sometimes "Uncaught ReferenceError: require is not defined" happen.
          // https://github.com/rogerwang/node-webkit/issues/809
          this.window.require = require;
        });
        PeerChat.Auth.processing = authHandler.startAuthentication(window, authPop, PeerChat.Auth.success, PeerChat.Auth.fail);
      });

      // Try to create peer connection
      $("#contact_list").on("click", ".contact", function (e) {
        e.preventDefault();
        var $el = $(e.currentTarget);
        PeerChat.Signaling.startOffer($el.data("member"));
      });

    });
  });
})(this);