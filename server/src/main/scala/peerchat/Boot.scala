package peerchat

import xitrum.Server
import peerchat.model.SignalingManager

object Boot {
  def main(args: Array[String]) {
    SignalingManager.start()
    Server.start()
  }
}
