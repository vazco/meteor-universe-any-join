# Universe Any Join

This package adds functionality of joining between user and any universe document.
In very easy way, you can adds possibility of joining to your entity,
for example to events or groups. You can add multi joining types to one document.

For example:
You can be a member of group, but also a friend of the same group or just observer.

## Joining types
Joining mode can work in three different types of joining.

- **UniAnyJoin.TYPE_JOIN_REQUEST** (default mode)

    To join to entity, user must send joining request,
    authorized persons can accept or rejects each one request.

- **UniAnyJoin.TYPE_JOIN_INVITATION**

    The ability to invite members to subject.
    No one can join to without invitation.

    *Notice:* Authorized persons can always send invitation, regardless from current type.

- **UniAnyJoin.TYPE_JOIN_OPEN**

    Anyone can join without accepting by someone

## Permissions
Possibilities of users are dependent from joining policy on current subject for selected joining name.
Rights to management of joining like sending invitation or accepting request, is based on "can" methods.
As a default, this roles accrue for universe admin and owner of subject.

Of course, You can influence on that, who can what.
Defining own callbacks, you can decide who and on what rules:
canResign, canChangePolicy, canAcceptRequest, canSendRequest, canSendInvitation, canJoinDirectly.

### Callbacks for access control
###### ( available anywhere ) ######
All following callbacks to grant or deny permission should return an boolean.
Any other type of returned value will be filtered out and method will be continue execution of the default logic.

- **canResign**(joiningName, user, initiator)

    is called when 'initiator' tries detach 'user'. ( It can be the same user e.g. : 'Someone wants leave a group' )

    *default logic:* entry possessor, admin and owner of subject, can change policy

- **canChangePolicy**(joiningName, user)

    called to check if 'user' can change type of policy for 'joiningName'

    *default logic:* only admin and owner of subject can change policy

- **canAcceptRequest**(joiningName, acceptor)

    checks if 'acceptor' has rights to accept joining requests for joiningName

    *default logic:* only admin and owner of subject can accept request

- **canSendRequest**(joiningName, user)

    is invoked to checking if user can send joining request

    *default logic:* every user can send invitation, if type for current joiningName is `UniAnyJoin.TYPE_JOIN_REQUEST`

- **canSendInvitation**(joiningName, user)

    is invoked to checking if user can send invitation to join

    *default logic:* only admin and owner of subject can send invitations

- **canJoinDirectly**(joiningName, userId, acceptorId)

    called to validate if userId can be joined without someone's permission (open to join or is already invited)
    or if provided 'acceptorId' can join a 'userId' (admin/owner)

    *default logic:* true if mode is open to join, user is already invited or 'acceptorId' is admin or subject owner

- **isJoined**(joiningName, userId)

    Checks if user is joined to current subject by joiningName.

    *default logic:* checks if status is equal constant of `UniAnyJoin.STATUS_JOINED`
    in joiningName for userId.

## Reaction on events
You can also do your stuff as a reaction on event.
E.g.: site will be send email every time when someone sends joining request or invitation.

### Callbacks on events
###### ( available just on the server ) ######
- **onInvitation**(joiningName, uniAnyJoinDocument, toUser, originator)

    fired after invitation was saved in db

- **onRequest**(joiningName, uniAnyJoinDocument, fromUser, originatorId)

    fired after joining request was send

- **onAcceptRequest**(joiningName, uniAnyJoinDocument, fromUser, acceptor)

    called when 'acceptor' accept 'fromUser'

- **onAcceptInvitation**(joiningName, uniAnyJoinDocument, receiverId)

    invoked just after receiver accepted the invitation

- **onJoin**(joiningName, uniAnyJoinDocument, userId, acceptorId)

    called after someone was marked as a joined

- **onResign**(joiningName, uniAnyJoinDocument, user, acceptor)

    invoked when someone resigns from join or authorized person helped him to leave.

- **onGetDefaultPolicy**(joiningName, collection)

    invoke when new document of joinable collection will be saved in db.
    Should return default type of policy for joiningName in collection


