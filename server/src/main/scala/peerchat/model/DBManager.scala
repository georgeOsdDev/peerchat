package peerchat.model

import akka.actor.{Actor, ActorRef, Terminated}
import com.mongodb.casbah.Imports._
import com.mongodb.casbah.MongoClient

import xitrum.{Config => XConfig, Log}
import peerchat.Config

case class Dump(msgObj:Map[String,String], name:String)

object DBManager {
  val NAME       = "DBManager"
  val DATABASE   = "peerchat"
  val COLLECTION = "dump"

  val mongoClient = MongoClient(Config.db.host, Config.db.port)
  def getDB() ={
    mongoClient(DATABASE)
  }
  def getDumpCollection() ={
    mongoClient(DATABASE)(COLLECTION)
  }

}

class DBManager extends Actor with Log{
  def receive = {
    case Dump(msg, senderName) =>
      val m = MongoDBObject("msg" -> msg.asDBObject, "senderName" -> senderName)
      DBManager.getDumpCollection.insert(m)
  }
}