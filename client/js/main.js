(function(GLOBAL){
  var nwgui            = require('nw.gui'),
      configReader     = require('./js/lib/configReader.js'),
      authHandler      = require('./js/lib/authHandler.js'),
      SignalingChannel = require('./js/lib/signalingChannel.js'),
      peerHandler      = require('./js/lib/peerHandler.js'),
      interval         = require('./js/lib/ExponentialBackoff.js'),
      logger           = require('./js/lib/logger.js')
      ;


  process.on('uncaughtException', function (err) {
    logger.log('Caught exception: ' + err);
  });




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

  PeerChat.View.startLocalVideo = function(){
    navigator.webkitGetUserMedia(
      { audio: true, video: true },
      function(stream) {
        $("#localVideo").attr("src", window.webkitURL.createObjectURL(stream));

        peer.addStream(stream);
      },
      function(err) {
          logger.log("err",arguments);
      }
    );
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
    logger.log(error);
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
    logger.log("Reset reconect interval");
    interval.reset();
  };

  PeerChat.Signaling.reconnect = function(){
    var delay = interval.nextDelay();
    logger.log("Retry connect after " + delay + "ms...");
    setTimeout(function(){
      PeerChat.Signaling.start(PeerChat.config.signalingUrl);
    },delay);
  };

  PeerChat.Signaling.start = function(url) {

    if (PeerChat.signalingChannel){
      PeerChat.signalingChannel.removeAllListeners();
    }
    PeerChat.signalingChannel = new SignalingChannel(new WebSocket(url));

    PeerChat.signalingChannel.on("open",       PeerChat.Signaling.resetInterval);
    PeerChat.signalingChannel.on("close",      PeerChat.Signaling.reconnect);

    PeerChat.signalingChannel.on("new_member", PeerChat.View.appendToContactList);
    PeerChat.signalingChannel.on("leave",      PeerChat.View.removeFromContactList);

    // channel.on("offer",      );
    // channel.on("answer",     );
    // channel.on("candidate",  );
  };


  PeerChat.Signaling.join = function(data){
    PeerChat.signalingChannel.join(data, function(res){
      PeerChat.View.renderMember(res.data);
    });
  };

  PeerChat.Signaling.startOffer = function(member){
    logger.log("start offer to", member);
    signaling.channel.offer();
  };



  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------
  configReader.readJson('./config/auth.conf', function(err, _config){
    if (err) return false;
    var config = PeerChat.config = _config;
    PeerChat.Signaling.start(config.signalingUrl);

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
        startOffer($el.data("member"));
      });

    });
  });
})(this);