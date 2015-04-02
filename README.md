# Universe Any Join

## Server side callbacks
- **onInvitation**(joiningName, uniAnyJoinDocument, toUser, originator)
- **onRequest**(joiningName, uniAnyJoinDocument, fromUser, originatorId)
- **onAcceptRequest**(joiningName, uniAnyJoinDocument, fromUser, acceptor)
- **onAcceptInvitation**(joiningName, uniAnyJoinDocument, toUserId)
- **onJoin**(joiningName, uniAnyJoinDocument, userId)
- **onResign**(joiningName, uniAnyJoinDocument, user)
- **onGetDefaultPolicy**(joiningName, collection)

## Both sides access control
- **canResign**(joiningName, user, acceptor)
- **canChangePolicy**(joiningName, user)
- **canAcceptRequest**(joiningName, acceptor)
- **canSendRequest**(joiningName, user)
- **canSendInvitation**(joiningName, user)
- **canJoinDirectly**(joiningName, userId)
- **isJoined**(joiningName, userId)
