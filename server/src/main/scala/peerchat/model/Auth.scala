package peerchat.model

import scala.concurrent.{Future, ExecutionContext}
import dispatch._

import twitter4j.{Twitter => Twitter4J, TwitterFactory, TwitterException}
import twitter4j.auth.RequestToken
import twitter4j.conf.ConfigurationBuilder

import peerchat.Config

trait ExContext {
  import java.util.concurrent.Executors
  import scala.collection.parallel
  implicit val ec = ExecutionContext.fromExecutor(Executors.newFixedThreadPool(parallel.availableProcessors*2))
}

object Github extends ExContext{

  private val requestHeadersAcceptJson = Map("Accept" -> "application/json")
  private val requestHeadersAcceptV3   = Map("Accept" -> "application/vnd.github.v3+json")

  private def getAuthRequestBody(code:String):Map[String, String] = {
    Map("client_id"     -> Config.github.clientID,
        "client_secret" -> Config.github.clientSecret,
        "code"          -> code
    )
  }

  private def getAccessTokenBody(accessToken:String):Map[String, String] = {
    Map("access_token" -> accessToken)
  }

  def getAuthRequest(code:String):Req = {
    dispatch.url(Config.github.accsessTokenURL) << getAuthRequestBody(code) <:< requestHeadersAcceptJson
  }

  def getAuthResponse(req:Req):Future[String] = {
    Http(req OK as.String)
  }

  def getUserRequest(accessToken:String):Req = {
    dispatch.url(Config.github.userAPIURL) <<? getAccessTokenBody(accessToken) <:< requestHeadersAcceptV3
  }

  def getUserResponse(req:Req):Future[String] = {
    Http(req OK as.String)
  }
}

object Twitter {
  def getInstance:Twitter4J = {
    val cb = new ConfigurationBuilder()
        cb.setUseSSL(true)
    val tw = new TwitterFactory(cb.build()).getInstance()
        tw.setOAuthConsumer(Config.twitter.consumerKey, Config.twitter.consumerSecret)
    tw
  }
  def getInstanceFromSession(session:xitrum.scope.session.Session):Twitter4J = {
    session("twInstance").asInstanceOf[Twitter4J]
  }

  def getRequestTokenFromSession(session:xitrum.scope.session.Session):RequestToken = {
    session("requestToken").asInstanceOf[RequestToken]
  }

  def getAuthenticationURL(requestToken:RequestToken):String = {
    requestToken.getAuthenticationURL().replace("http","https")
  }
}