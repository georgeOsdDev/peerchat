package peerchat.model

import java.security.MessageDigest

import akka.actor.{Actor, ActorRef, Props, Terminated}

import glokka.Registry
import xitrum.{Config => XConfig, Log}
import xitrum.util.Json

import peerchat.{Config, MsgKeys, Tags, ErrCds}

case class MsgForAuth(name: String, loginSvc:String)
case class MsgFromManager(msg: String)
case class MsgFromClient(msg: String, name: String)

object SignalingManager {
  val NAME = "SignalingManager"
  val registry = Registry.start(XConfig.actorSystem, "proxy")
      registry ! Registry.LookupOrCreate(DBManager.NAME)

  def start() {}
}

class SignalingManager extends Actor with Log{
  private val SYSTEM = "system"
  private val UNKOWN = "unknown"
  private val FROM = "_from_"
  private var clients     = Map[String, ActorRef]()
  private var clientNames = Map[ActorRef, String]()
  private var users       = Map[String, String]()
  private val dbMaganer   = XConfig.actorSystem.actorOf(Props[DBManager])

  private def makeHash(name:String):String = {
    val digestedBytes = MessageDigest.getInstance("MD5").digest((Config.secureKey + name).getBytes)
    val hash = digestedBytes.map("%02x".format(_)).mkString
    users = users.updated(hash, name)
    hash
  }

  private def isInvalidMsg(tag:String, loginSvc:String, fromUser:String) :Boolean = {
    (tag == UNKOWN || loginSvc == UNKOWN || fromUser == UNKOWN)
  }


  def receive = {
    case MsgForAuth(name, loginSvc) =>
      val hash = makeHash(name+FROM+loginSvc)
      sender ! MsgFromManager(hash)

    case m @ MsgFromClient(msg, name) =>
      val msgObj:Map[String, String] = Json.parse[Map[String, String]](msg)
      // required
      val tag      = msgObj.getOrElse(MsgKeys.TAG,       UNKOWN)
      val loginSvc = msgObj.getOrElse(MsgKeys.LOGIN_SVC, UNKOWN)
      val fromUser = msgObj.getOrElse(MsgKeys.FROM_USER, UNKOWN) // name
      // optional
      val hash     = msgObj.getOrElse(MsgKeys.HASH,      UNKOWN)
      val toUser   = msgObj.getOrElse(MsgKeys.TO_USER,   UNKOWN) // name+ "_from_" + loginsvc
      val data     = msgObj.getOrElse(MsgKeys.DATA,      UNKOWN)
      val seq      = msgObj.getOrElse(MsgKeys.SEQ,       -1)

      // save dump to mongoDB
      dbMaganer ! Dump(msgObj, sender.toString)

      if (isInvalidMsg(tag, loginSvc, fromUser)) {
        log.warn("Invalid message: " + msgObj.toString)
        sender ! MsgFromManager(Json.generate(
            msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA)
                  .updated(MsgKeys.ERR_CD, ErrCds.TO_USER_IS_YOU)
            )
          )
      } else tag match {
        case Tags.JOIN =>
          if (users.getOrElse(hash, UNKOWN) != fromUser+FROM+loginSvc) {
            log.warn("Unauthorized user: " + msgObj.toString)
            sender ! MsgFromManager(Json.generate(
                msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA, MsgKeys.HASH)
                      .updated(MsgKeys.ERR_CD, ErrCds.UNAUTHORIZED)
                )
              )
          } else {
            clients.foreach {kv =>
              val (name, client) = kv
              client ! MsgFromManager(Json.generate(Map(
                      MsgKeys.TAG       -> Tags.NEW_MEMBER,
                      MsgKeys.FROM_USER -> SYSTEM,
                      MsgKeys.DATA      -> (fromUser+FROM+loginSvc)
                    )
                  )
                )
            }
            sender ! MsgFromManager(Json.generate(
                  msgObj.-(MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.HASH)
                        .updated(MsgKeys.FROM_USER, SYSTEM)
                        .updated(MsgKeys.DATA,      clients.keySet)
                        .updated(MsgKeys.ERR_CD,    ErrCds.NORMAL)
                )
              )
            clients = clients.updated(fromUser+FROM+loginSvc, sender)
            clientNames = clientNames.updated(sender, fromUser+FROM+loginSvc)
          }
        case Tags.OFFER | Tags.ANSWER =>
          if (!clients.contains(fromUser+FROM+loginSvc)) {
              log.warn("Not joined user: " + msgObj.toString)
              sender ! MsgFromManager(Json.generate(
                  msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA)
                        .updated(MsgKeys.ERR_CD, ErrCds.NOT_JOINED)
                  )
                )
          } else {
            clients.getOrElse(toUser, null) match {
              case ref:ActorRef if (!ref.equals(sender)) =>
                ref ! MsgFromManager(Json.generate(
                    msgObj.-(MsgKeys.SEQ, MsgKeys.LOGIN_SVC)
                          .updated(MsgKeys.FROM_USER, fromUser+FROM+loginSvc)
                    )
                  )
                sender ! MsgFromManager(Json.generate(
                    msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA)
                          .updated(MsgKeys.ERR_CD, ErrCds.NORMAL)
                    )
                  )
              case ref:ActorRef if (ref.equals(sender)) =>
                log.warn("Cannot send message yourself: " + msgObj.toString)
                sender ! MsgFromManager(Json.generate(
                    msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA)
                          .updated(MsgKeys.ERR_CD, ErrCds.TO_USER_IS_YOU)
                    )
                  )
              case _ =>
                log.warn("Not to_user found: " + msgObj.toString)
                sender ! MsgFromManager(Json.generate(
                    msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA)
                          .updated(MsgKeys.ERR_CD, ErrCds.TO_USER_NOT_FOUND)
                    )
                  )
            }
          }
        case _ =>
          log.warn("Unexpected message tag: " + msgObj.toString)
          sender ! MsgFromManager(Json.generate(
              msgObj.-(MsgKeys.FROM_USER, MsgKeys.TO_USER, MsgKeys.LOGIN_SVC, MsgKeys.DATA)
                    .updated(MsgKeys.ERR_CD, ErrCds.UNKONWN_TAG)
              )
            )
      }

    case Terminated(client) =>
      val clientName = clientNames.getOrElse(client, UNKOWN)
      clientNames    = clientNames.filterNot(_ == clientName)
      clients        = clients.filterNot(_ == client)
        clients.foreach {kv =>
          val (n, actorRef) = kv
          actorRef ! MsgFromManager(Json.generate(Map(
                  MsgKeys.TAG       -> Tags.LEAVE,
                  MsgKeys.FROM_USER -> SYSTEM,
                  MsgKeys.DATA      -> clientName
                )
              )
            )
        }

    case unexpected =>
      log.warn("Unexpected message: " + unexpected)

  }
}