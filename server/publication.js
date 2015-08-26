'use strict';

UniCollection.publish('uniAnyJoinMyInvitations', function () {
    if (!UniUsers.getLoggedInId()) {
        return this.ready();
    }
    var subjects = {};
    var sub = this;
    var handl = UniAnyJoin.find({
        possessorId: UniUsers.getLoggedInId(),
        status: UniAnyJoin.STATUS_INVITED
    }).observeChanges({
        added: function (id, doc) {
            var col = UniAnyJoin.getSubjectCollection(doc.subjectCollectionName);
            if (col) {
                //Tried get name or title
                var subject = col.findOne({_id: doc.subjectId}, {fields: {title: 1, name: 1}});
                subjects[id] = {
                    id: subject._id,
                    colName: col.getCollectionName()
                };
                sub.added(col.getCollectionName(), subject._id, subject);
            }
            sub.added(UniAnyJoin._name, id, doc);
        },
        removed: function (id) {
            sub.removed(UniAnyJoin._name, id);
            if (subjects[id]) {
                sub.removed(subjects[id].colName, subjects[id].id);
                delete subjects[id];
            }
        }
    });
    this.ready();
    this.onStop(function () {
        handl.stop();
    });
});

UniCollection.publish('uniAnyJoin', function (subjectId, subjectName) {
    if (!subjectId || !UniUsers.getLoggedInId()) {
        this.ready();
    }
    if (subjectName && UniAnyJoin.getSubjectCollection(subjectName)) {
        this.setMappings(UniAnyJoin, [
            {
                key: 'subjectId',
                collection: UniAnyJoin.getSubjectCollection(subjectName)

            }
        ]);
    }
    return UniAnyJoin.find({
        subjectId: subjectId,
        possessorId: UniUsers.getLoggedInId()
    });
});

UniCollection.publish('uniAnyJoinUserIdInSubject', function (subjectId, subjectName, userId, joiningName) {
    if (!(typeof subjectId !== 'string' && subjectId) || !UniUsers.getLoggedInId() ||
        (typeof userId !== 'string' && userId) || (typeof joiningName !== 'string' && joiningName)) {
        this.ready();
    }
    if (subjectName && UniAnyJoin.getSubjectCollection(subjectName)) {
        this.setMappings(UniAnyJoin, [
            {
                key: 'subjectId',
                collection: UniAnyJoin.getSubjectCollection(subjectName)

            },
            {
                key: 'possessorId',
                collection: UniUsers
            }
        ]);
    }
    return UniAnyJoin.find({
        joiningName: joiningName,
        subjectId: subjectId,
        possessorId: userId
    }, {transform: null, sort: {createdAt: -1}, limit:1});
});

UniCollection.publish('uniAnyJoinUsersToAccept', function (joiningName, subjectId, subjectName) {
    if (!joiningName || !subjectId || !UniUsers.getLoggedInId() || !subjectName) {
        this.ready();
    }
    check(subjectId, String);
    var coll = UniAnyJoin.getSubjectCollection(subjectName);
    var doc = coll.findOne({_id: subjectId});
    if (!coll || (!doc.joinCanAcceptRequest(joiningName, UniUsers.getLoggedIn()) && !doc.joinCanSendInvitation(joiningName, UniUsers.getLoggedIn()))) {
        this.ready();
    }

    this.setMappings(UniAnyJoin, [
        {
            key: 'possessorId',
            collection: UniUsers

        }
    ]);

    return UniAnyJoin.find({
        $and: [
            {subjectId: subjectId},
            {$or: [{status: UniAnyJoin.STATUS_INVITED}, {status: UniAnyJoin.STATUS_REQUESTED}]}
        ]
    });
});

UniCollection.publish('uniAnyJoinSearchUsers', function (term, joiningName, subjectId, subjectName) {
    if (!joiningName || !subjectId || !UniUsers.getLoggedInId() || !subjectName || !term) {
        this.ready();
        return;
    }
    check(subjectId, String);
    var coll = UniAnyJoin.getSubjectCollection(subjectName);
    var doc = coll.findOne({_id: subjectId});
    if (!doc.joinCanAcceptRequest(joiningName, UniUsers.getLoggedIn()) && !doc.joinCanSendInvitation(joiningName, UniUsers.getLoggedIn())) {
        this.ready();
    }
    this.setMappings(UniUsers, [
        {
            key: 'possessorId',
            collection: UniAnyJoin,
            reverse: true,
            filter: {subjectId: subjectId}

        }
    ]);
    return UniUsers.find({'profile.name': UniUtils.getInSensitiveRegExpForTerm(term)}, {
        fields: {_id: 1, profile: 1},
        limit: 50
    });
});

