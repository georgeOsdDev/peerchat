package peerchat

import xitrum.Server
import peerchat.model.RegistryManager

object Boot {
  def main(args: Array[String]) {
    RegistryManager.start()
    Server.start()
  }
}
