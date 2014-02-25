package peerchat.model

import akka.actor.{Actor, ActorRef, Props}
import glokka.Registry
import xitrum.{Config => XConfig, Log}

object RegistryManager {
  val registry = Registry.start(XConfig.actorSystem, "proxy")
      registry ! Registry.LookupOrCreate(DBManager.NAME)
  def start() {}
}

trait RegistryLookupAction extends Log{
  this: Actor =>

  def lookupManager {
    val registry = RegistryManager.registry

    registry ! Registry.LookupOrCreate(SignalingManager.NAME)
    context.become {
      case Registry.LookupResultOk(_, actorRef) =>
        doWithManager(actorRef)

      case Registry.LookupResultNone(_) =>
        val tmp = XConfig.actorSystem.actorOf(Props[SignalingManager])
        registry ! Registry.RegisterByRef(SignalingManager.NAME, tmp)
        context.become {
          case Registry.RegisterResultOk(_, actorRef) =>
            doWithManager(actorRef)

          case Registry.RegisterResultConflict(_, actorRef) =>
            XConfig.actorSystem.stop(tmp)
            doWithManager(actorRef)
        }
      case unexpected =>
        log.warn("Unexpected message: " + unexpected)
    }
  }

  def doWithManager(manager:ActorRef):Unit
}
