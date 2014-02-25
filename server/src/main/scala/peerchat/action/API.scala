package peerchat.action

import scala.util.{Failure,Success}
import scala.util.control.NonFatal
import scala.util.parsing.json._

import akka.actor.ActorRef
import akka.actor.Actor

import xitrum.{Action, ActorAction, SkipCsrfCheck}
import xitrum.annotation.{GET, POST}
import xitrum.util.Json

import peerchat.Config
import peerchat.model._

@POST("/")
class Empty extends Action with SkipCsrfCheck{
  def execute() {
    respondView()
  }
}

trait ApiCallback extends ActorAction{
  this: Actor =>
  var userName:String
  var avatarUrl:String
  val SERVICE_NAME:String

  def doWithManager(manager:ActorRef){
    manager ! MsgForAuth(userName, SERVICE_NAME)
    context.become {
      case MsgFromManager(hash) =>
        at("userName")  = userName
        at("avatarUrl") = avatarUrl
        at("loginSvc")  = SERVICE_NAME
        at("hash") = hash
        respondView[Empty]()
      case unexpected =>
        log.warn("Unexpected message: " + unexpected)
    }
  }
}

@GET("/ghcb")
class GHCallback extends ApiCallback with RegistryLookupAction with SkipCsrfCheck{
  var userName:String  = _
  var avatarUrl:String = _
  val SERVICE_NAME = "GitHub"

  override def execute() {
    val authReq = Github.getAuthRequest(param("code").toString)
    val authRes = Github.getAuthResponse(authReq)
    authRes.onComplete {
      case Success(jsonStr) =>
        val json = Json.parse[Map[String, String]](jsonStr)
        if (!json.contains("access_token")){
          at("error") = json
          respondView[Empty]()
        } else {
          val userReq = Github.getUserRequest(json("access_token"))
          val userRes = Github.getUserResponse(userReq)
          userRes.onComplete {
            case Success(userInfoJsonStr) =>
              val json = JSON.parseFull(userInfoJsonStr).get.asInstanceOf[Map[String, Any]]
              userName  = json.get("login").get.asInstanceOf[String]
              avatarUrl = json.get("avatar_url").get.asInstanceOf[String]
              lookupManager
            case Failure(error) =>
              at("error") = Map("error"->error)
              respondView[Empty]()
          }
        }
      case Failure(error) =>
        println("Error occured"+error.toString())
        at("error") = Map("error"->error)
        respondView[Empty]()
    }
  }
}

@GET("/twlogin")
class TWLogin extends Action with SkipCsrfCheck{
  def execute() {
    val twInstance = Twitter.getInstance
    val requestToken = twInstance.getOAuthRequestToken(Config.twitter.callbackURL)
    session("twInstance") = twInstance
    session("requestToken") = requestToken
    redirectTo(Twitter.getAuthenticationURL(requestToken));
  }
}

@GET("/twcb")
class TWCallback extends ApiCallback with RegistryLookupAction with SkipCsrfCheck{
  var userName:String  = _
  var avatarUrl:String = _
  val SERVICE_NAME = "Twitter"

  override def execute(){
    val twInstance   = Twitter.getInstanceFromSession(session)
    val requestToken = Twitter.getRequestTokenFromSession(session)
    val verifier     = param("oauth_verifier")
    try {
      val accessToken = twInstance.getOAuthAccessToken(requestToken, verifier)
      val token       = accessToken.getToken()
      val tokenSecret = accessToken.getTokenSecret()
      val userId      = accessToken.getUserId()
      try {
        val userInfo = twInstance.showUser(userId)
        userName  = userInfo.getName()
        avatarUrl = userInfo.getProfileImageURL()
        lookupManager
      } catch {
        case NonFatal(e) =>
          println("Error occured"+e.toString())
          e.printStackTrace()
          at("error") = Map("error"->e)
          respondView[Empty]()
      }
    } catch {
      case NonFatal(e) =>
        println("Error occured"+e.toString())
        e.printStackTrace()
        at("error") = Map("error"->e)
        respondView[Empty]()
    }
  }
}

