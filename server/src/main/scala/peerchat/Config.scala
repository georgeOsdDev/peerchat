package peerchat

import com.typesafe.config.{Config => TConfig, ConfigFactory}

class TwitterConfig(config: TConfig) {
  val consumerKey     = config.getString("ConsumerKey")
  val consumerSecret  = config.getString("ConsumerSecret")
  val callbackURL     = config.getString("CallbackURL")
}
class GithubConfig(config: TConfig) {
  val clientID        = config.getString("ClientID")
  val clientSecret    = config.getString("ClientSecret")
  val accsessTokenURL = config.getString("AccsessTokenURL")
  val userAPIURL      = config.getString("UserAPIURL")
}

object Config {
  private val authConfig = xitrum.Config.application.getConfig("auth")
  val twitter   = new TwitterConfig(authConfig.getConfig("twitter"))
  val github    = new GithubConfig(authConfig.getConfig("github"))
  val secureKey = authConfig.getString("secureKey")
}
