
function startAuthentication(mainWindow, popup, success, fail){
  var askingLoop = setInterval(function(){
    if (popup.closed) return false;
    popup.postMessage("give me userInfo","*");
  },1000);

  // Receive userInfo from auth popup via window.PostMessage
  function postMessageListner(e){
    if (!e || !e.data || e.data === "__ready__") return;
    clearInterval(askingLoop);
    popup = null;
    mainWindow.removeEventListener("message", postMessageListner);

    var message = JSON.parse(e.data);
    if (message.error.error) {
      fail(message.error);
    } else {
      success(message);
    }
  }
  mainWindow.addEventListener("message", postMessageListner, false);
  return true;
}
exports.startAuthentication = startAuthentication;