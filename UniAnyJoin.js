UniAnyJoin = new UniCollection('anyJoin');

UniAnyJoin.TYPE_JOIN_REQUEST = 'join_request'; // first must be sent request, moderator accept members
UniAnyJoin.TYPE_JOIN_INVITATION = 'join_invitation'; // only invited can join
UniAnyJoin.TYPE_JOIN_OPEN = 'join_open'; // everyone, who sees can join

UniAnyJoin.STATUS_JOINED = 'joined'; //already joined
UniAnyJoin.STATUS_INVITED = 'invited'; //sent invited
UniAnyJoin.STATUS_REQUESTED = 'requested'; // sent request
UniAnyJoin.STATUS_REJECTED = 'rejected'; // sent request


UniAnyJoin.setSchema(new SimpleSchema({
        joiningName: {
            type: String
        },
        subjectId: {
            type: String
        },
        subjectCollectionName: {
            type: String
        },
        possessorId: {
            type: String
        },
        status: {
            type: String,
            allowedValues: [
                UniAnyJoin.STATUS_JOINED,
                UniAnyJoin.STATUS_INVITED,
                UniAnyJoin.STATUS_REQUESTED,
                UniAnyJoin.STATUS_REJECTED
            ]
        },
        type: {
            type: String,
            allowedValues: [
                UniAnyJoin.TYPE_JOIN_REQUEST,
                UniAnyJoin.TYPE_JOIN_INVITATION,
                UniAnyJoin.TYPE_JOIN_OPEN
            ]
        },
        originatorId: {
            type: String,
            autoValue: function () {
                if (this.isInsert || this.isUpsert) {
                    return this.value || this.userId;
                }
                this.value = undefined;
                this.unset();
            },
            optional: true
        },
        createdAt: {
            type: Date,
            autoValue: function () {
                if (this.isInsert) {
                    return new Date();
                }
            },
            optional: true
        },
        acceptorId: {
            type: String,
            optional: true
        }
    })
);

UniAnyJoin.setDefaultSort({createdAt: -1});

UniAnyJoin.allow({
    publish: function (userId, doc, publicationName) {
        return userId;
    }
});

var _no = function () {
    "use strict";
    return true;
};

UniAnyJoin.deny({
    insert: _no,
    update: _no,
    remove: _no
});

UniAnyJoin._collections = {};

/**
 * Return registered joinable collection
 * @param name name of collection
 * @returns {UniCollection#}
 */
UniAnyJoin.getSubjectCollection = function (name) {
    "use strict";
    return name && UniAnyJoin._collections[name];
};

UniAnyJoin.helpers({
    getSubject: function (options) {
        "use strict";
        var coll = UniAnyJoin.getSubjectCollection(this.subjectCollectionName);
        var doc = coll.findOne({_id: this.subjectId}, options || {});
        return coll.ensureUniDoc(doc);
    },
    getSubjectCollection: function () {
        "use strict";
        return UniAnyJoin.getSubjectCollection(this.subjectCollectionName);
    },
    getPossessorOfEntry: function (options) {
        "use strict";
        return UniUsers.findOne({_id: this.possessorId}, options || {});
    },
    getOriginatorOfEntry: function (options) {
        "use strict";
        return this.originatorId && UniUsers.findOne({_id: this.originatorId}, options || {});
    },
    getAcceptorOfEntry: function (options) {
        "use strict";
        return this.acceptorId && UniUsers.findOne({_id: this.acceptorId}, options || {});
    }
});