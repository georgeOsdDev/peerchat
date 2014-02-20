## PeerChat

                      +----------------+
                      |  AOuth Service |
             _________+----------------+_________
            |         | Twitter/GitHub |         |
            |         +----+------+----+         |
            |              |      |              |
            |         +----+------+----+         |
           HTTP       |Signaling-Server|        HTTP
            |         +----------------+         |
            |         |     Xitrum     |         |
            |         +----------------+         |
            |        /                  \        |
            |   WEBSOCKET            WEBSOCKET   |
            |      /                      \      |
     +------+------+                      +------+------+
     |             |                      |             |
     |  Peer Chat  +--------webRTC--------+  Peer Chat  |
     |             |     (VIDEO+AUDIO)    |             |
     +-------------+                      +-------------+
     | node-webkit |                      | node-webkit |
     +-------------+                      +-------------+
