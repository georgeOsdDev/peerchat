package peerchat.action

import akka.actor.{Actor, ActorRef, Terminated}
import xitrum.{WebSocketAction, WebSocketText}
import xitrum.annotation.WEBSOCKET
import xitrum.util.Json
import peerchat.model.{MsgFromManager, MsgFromClient, RegistryLookup, SignalingManager}

@WEBSOCKET("signaling")
class SignalingActor extends WebSocketAction with RegistryLookup {
  private var signalingManager: ActorRef = _
  override def execute() {
    lookupManager
  }

  override def doWithManager(manager: ActorRef) {
    signalingManager = manager
    context.watch(signalingManager)
    context.become {
      case MsgFromManager(msg) =>
        respondWebSocketText(msg)

      case WebSocketText(text) =>
        signalingManager ! MsgFromClient(text, self.path.name)

      case Terminated(signalingManager) =>
        Thread.sleep(1000L * (scala.util.Random.nextInt(3)+1))
        lookupManager

      case unexpected =>
        log.warn("Unexpected message: " + unexpected)
    }
  }
}
