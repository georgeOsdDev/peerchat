(function(GLOBAL){
  var nwgui            = require('nw.gui'),
      configReader     = require('./js/lib/configReader.js'),
      authHandler      = require('./js/lib/authHandler.js'),
      SignalingChannel = require('./js/lib/signalingChannel.js').SignalingChannel,
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


    function startLocalVideo(){
      navigator.webkitGetUserMedia(
        { audio: true, video: true },
        function(stream) {
          $("#localVideo").attr("src", window.webkitURL.createObjectURL(stream));

          // TODO : connect peer and stream
          // peer.addStream(stream)
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
      logger.log("Leave", member);
      $("#"+member).remove();
    }

    function appendToContactList(member){
      if (PeerChat.userName + "_from_" + PeerChat.loginSvc === member) return false;

      var token    = member.split("_from_"),
          name     = token[0],
          loginSvc = token[1]
          ;

      $("#contact_list").append(memberTpl({
                                  member:member,
                                  name:name + " @ ",
                                  loginSvc:"fa-"+loginSvc.toLowerCase()
                                })
      );
    }

    function renderMember(members){
      _.each(members, appendToContactList);
    }

    function renderLoginFail(){
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
    });
  });
})(this);