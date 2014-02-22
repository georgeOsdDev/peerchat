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

class DefaultDBConfig {
  val host = "127.0.0.1"
  val port = 27017
}

class DBConfig(config: TConfig) extends DefaultDBConfig {
  override val host = config.getString("host")
  override val port = config.getInt("port")
}

object Config {
  private val authConfig = xitrum.Config.application.getConfig("auth")
  val twitter    = new TwitterConfig(authConfig.getConfig("twitter"))
  val github     = new GithubConfig(authConfig.getConfig("github"))
  val secureKey  = authConfig.getString("secureKey")

  val dumpEnable =
    if (xitrum.Config.application.hasPath("dumpEnable"))
      Some(xitrum.Config.application.getBoolean("dumpEnable"))
    else
      None

  val db =
    if (xitrum.Config.application.hasPath("db"))
      new DBConfig(xitrum.Config.application.getConfig("db"))
    else
      new DefaultDBConfig()
}
