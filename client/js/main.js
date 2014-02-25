(function(GLOBAL){
  var nwgui            = require('nw.gui'),
      configReader     = require('./js/lib/configReader.js'),
      authHandler      = require('./js/lib/authHandler.js'),
      SignalingChannel = require('./js/lib/signalingChannel.js').SignalingChannel,
      interval         = require('./js/lib/ExponentialBackoff.js'),
      logger           = require('./js/lib/logger.js')
      ;



  var memberTpl = _.template($("#member_tpl").html());


  configReader.readJson('./config/auth.conf', function(err, _config){
    if (err) return false;
    var config = _config,
        signalingChannel = new SignalingChannel(new WebSocket(config.signalingUrl)),
        PeerChat         = {}
        ;



    signalingChannel.on("new_member", appendToContactList);
    signalingChannel.on("leave",      removeFromContactList);
    signalingChannel.on("close",      reconnect);


    function reconnect(){
      var delay = interval.nextDelay();
      logger.log("Retry connect after " + delay + "ms...");
      setTimeout(function(){
        signalingChannel.reconnect(new WebSocket(config.signalingUrl));
      },delay);
    }

    function startLocalVideo(){
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
    }

    function renderUserInfo(userName, avatarUrl, loginSvc){
      $("#userName").text(userName + " @ ");
      $("#loginSvc").addClass("fa-"+loginSvc.toLowerCase());
      $("#avatarUrl").attr("src", avatarUrl);
      $("#user").removeClass("hide");
      $("#login").hide();
    }

    function saveMyInfo(userName, avatarUrl, loginSvc){
      PeerChat.userName  = userName;
      PeerChat.avatarUrl = avatarUrl;
      PeerChat.loginSvc  = loginSvc;
    }

    function removeFromContactList(member){
      if (typeof member === "object") member = member.data;
      $("#"+member).remove();
    }

    function appendToContactList(member){
      if (typeof member === "object") member = member.data;

      if (PeerChat.userName + "_from_" + PeerChat.loginSvc === member) return false;

      var token    = member.split("_from_"),
          name     = token[0],
          loginSvc = token[1]
          ;
      var compiled = memberTpl({
                        member:member,
                        name:name + " @ ",
                        loginSvc:"fa-"+loginSvc.toLowerCase()
                      });
      $("#contact_list").append(compiled);
    }

    function renderMember(members){
      $("#contact_list").empty();
      _.each(members, appendToContactList);
    }

    function renderLoginFail(){
    }

    function startOffer(member){
      logger.log("start offer to", member);
      signaling.channel.offer()
    }

    function authSuccess(data){
      renderUserInfo(data.userName, data.avatarUrl, data.loginSvc);
      saveMyInfo(data.userName, data.avatarUrl, data.loginSvc);
      signalingChannel.join(data, function(res){
        renderMember(res.data);
      });
      authProcess = false;
    }
    function authFail(error){
      logger.log(error);
      renderLoginFail();
      authProcess = false;
    }

    $(function(){
      var authProcess = false;

      $(".authButton").on("click",function(e){
        var setting, url, authPop;

        e.preventDefault();
        if (authProcess) return false;

        // This index.html is in "file://" protocol.
        // To receive auth information from server in http(s) protocol,
        // Create new popup window.
        setting = ["menubar=no","location=no","resizable=yes",
                   "scrollbars=yes","status=yes"].join(",");
        url     = $(e.currentTarget).data('url');
        authPop = window.open(config[url], url, setting);
        // Listen popup and as nodewebkit-window
        authPopNw = nwgui.Window.get(authPop).on('loaded', function(){
          // Sometimes "Uncaught ReferenceError: require is not defined" happen.
          // https://github.com/rogerwang/node-webkit/issues/809
          this.window.require = require;
        });
        authProcess = authHandler.startAuthentication(window, authPop, authSuccess, authFail);
      });

      $("#contact_list").on("click", ".contact", function (e) {
        e.preventDefault();
        var $el = $(e.currentTarget);
        startOffer($el.data("member"));
      });

    });
  });
})(this);