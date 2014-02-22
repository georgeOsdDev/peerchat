package peerchat

object MsgKeys {
  val SEQ       = "seq"
  val TAG       = "tag"
  val HASH      = "hash"
  val FROM_USER = "fromUser"
  val TO_USER   = "toUser"
  val DATA      = "data"
  val LOGIN_SVC = "loginSvc"
  val ERR_CD    = "errCd"
}

object Tags {
  val JOIN        = "join"
  val LEAVE       = "leave"
  val OFFER       = "offer"
  val ANSWER      = "answer"
  val CANDIDATE   = "candidate"
  val NEW_MEMBER  = "new_member"
}

object ErrCds {
  val NORMAL            = 0
  val UNAUTHORIZED      = 1
  val INVALID_MSG       = 2
  val UNKONWN_TAG       = 3
  val NOT_JOINED        = 4
  val TO_USER_NOT_FOUND = 5
  val TO_USER_IS_YOU    = 6
}
