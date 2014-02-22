(function(GLOBAL){
  var nwgui            = require('nw.gui'),
      configReader     = require('./js/lib/configReader.js'),
      authHandler      = require('./js/lib/authHandler.js'),
      SignalingChannel = require('./js/lib/signalingChannel.js').SignalingChannel
      ;

  configReader.readJson('./config/auth.conf', function(err, _config){
    if (err) return false;
    var config           = _config,
        signalingChannel = new SignalingChannel(new WebSocket(config.signalingUrl)),
        PeerChat         = {}
        ;



    // signalingChannel.on("join",       showMember);
    // signalingChannel.on("new_member", addMember);
    // signalingChannel.on("leave",      removeMember);


    function startLocalVideo(){
      navigator.webkitGetUserMedia(
        { audio: true, video: true },
        function(stream) {
          $("#localVideo").attr("src", window.webkitURL.createObjectURL(stream));

          // TODO : connect peer and stream
          // peer.addStream(stream)
        },
        function(err) {
            console.log("err",arguments);
        }
      );
    }

    function renderUserInfo(userName, avatarUrl, loginSvc){
      $("#userName").text(userName);
      $("#loginSvc").text(loginSvc);
      $("#avatarUrl").attr("src", avatarUrl);
      $("#user").show();
      $(".authButton").hide();
    }
    function renderMember(){}

    function renderLoginFail(){
    }

    function authSuccess(data){
      renderUserInfo(data.userName, data.avatarUrl, data.loginSvc);
      signalingChannel.join(data, function(res){
        // render member
        renderMember(res.data);
      });
      authProcess = false;
    }
    function authFail(error){
      console.log(error);
      renderLoginFail();
      authProcess = false;
    }

    $(function(){
      var authProcess = false;
      $(".authButton").on("click",function(e){
        var setting, id, authPop;

        e.preventDefault();
        if (authProcess) return false;

        // This index.html is in "file://" protocol.
        // To receive auth information from server in http(s) protocol,
        // Create new popup window.
        setting = ["menubar=no","location=no","resizable=yes",
                   "scrollbars=yes","status=yes"].join(",");
        id      = $(e.currentTarget).attr('id');
        authPop = window.open(config[id], id, setting);
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