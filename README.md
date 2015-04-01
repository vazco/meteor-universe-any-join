# meteor-universe-any-join

## Server side callbacks
onInvitation(joiningName, UniAnyJoinDocument, toUser, originator)
onRequest(joiningName, UniAnyJoinDocument, fromUser, originatorId)
onAcceptRequest(joiningName, UniAnyJoinDocument, fromUser, acceptor)
onAcceptInvitation(joiningName, UniAnyJoinDocument, toUserId)
onJoin(joiningName, UniAnyJoinDocument, userId)
onResign(joiningName, UniAnyJoinDocument, user)

## Both sides access control
canResign(joiningName, user, acceptor)
canChangePolicy(joiningName, user)
canAcceptRequest(joiningName, acceptor)
canSendRequest(joiningName, user)
canSendInvitation(joiningName, user)
canJoinDirectly(joiningName, userId)
isJoined(joiningName, userId)