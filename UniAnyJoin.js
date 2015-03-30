UniAnyJoin = new UniCollection('anyJoin');

UniAnyJoin.TYPE_JOIN_REQUEST = 'join_request'; // first must be sent request, moderator accept members
UniAnyJoin.TYPE_JOIN_INVITATION = 'join_invitation'; // only invited can join
UniAnyJoin.TYPE_JOIN_OPEN = 'join_open'; // everyone, who sees can join

UniAnyJoin.STATUS_JOINED = 'joined'; //already joined
UniAnyJoin.STATUS_INVITED = 'invited'; //sent invited
UniAnyJoin.STATUS_REQUESTED = 'requested'; // sent request
UniAnyJoin.STATUS_REJECTED = 'rejected'; // sent request


UniAnyJoin.attachSchema(new SimpleSchema({
        subjectId: {
            type: String
        },
        subjectCollectionName: {
            type: String
        },
        possessorId:{
            type: String
        },
        status:{
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
            allowedValues: [UniAnyJoin.TYPE_JOIN_REQUEST, UniAnyJoin.TYPE_JOIN_INVITATION, UniAnyJoin.TYPE_JOIN_OPEN]
        },
        originatorId: {
            type: String,
            autoValue: function() {
                if (this.isInsert || this.isUpsert) {
                    return this.value || this.userId;
                }
            },
            denyUpdate: true,
            optional: true
        },
        createdAt: {
            type: Date,
            autoValue: function() {
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

UniAnyJoin._collections = {};

UniAnyJoin.addJoinFunctionalityToCollection = function(collection){
    "use strict";
    if(!_.isObject(collection) || !(collection instanceof UniCollection)){
        throw new Meteor.Error(500, 'Join functionality can by added only to universe collection');
    }
    UniAnyJoin._collections[collection._name] = collection;
    _addToSchemaJoiningFields(collection);
    _addJoiningHelpersToDocument(collection);
    if(Meteor.isServer){
        UniAnyJoin._addServerActions(collection);
    } else{
        UniAnyJoin._addClientActions(collection);
    }
};

UniAnyJoin.getSubjectCollection = function(name){
    "use strict";
    return name && UniAnyJoin._collections[name];
};

var _addToSchemaJoiningFields = function(collection){
    "use strict";
    if(collection.simpleSchema){
        var sObject;
        try{
            sObject = collection.simpleSchema().schema();
        } catch(e){ console.warn('Collection "'+collection._name+'" has no simpleSchema'); }
        if(_.size(sObject)){
            sObject._joiningPolicy = {
                type: String,
                allowedValues: [
                    UniAnyJoin.TYPE_JOIN_REQUEST,
                    UniAnyJoin.TYPE_JOIN_INVITATION,
                    UniAnyJoin.TYPE_JOIN_OPEN],
                autoValue: function() {
                    if (this.isInsert) {
                        return this.value || UniAnyJoin.TYPE_JOIN_REQUEST;
                    }
                }
            };
            collection.attachSchema(new SimpleSchema(sObject));
        }

    }
};

var _addJoiningHelpersToDocument = function(collection){
    "use strict";
    collection.helpers({
        getJoiningRow: function(userId){
            userId = UniUtils.getIdIfDocument(userId);
            return UniAnyJoin.findOne({
                subjectId: this._id,
                subjectCollectionName: collection._name,
                possessorId: userId
            });
        },
        isJoined: function(userId){
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.getJoiningRow(userId);
            return doc && doc.status === UniAnyJoin.STATUS_JOINED;
        },
        canJoinDirectly: function(userId){
            userId = UniUtils.getIdIfDocument(userId);
            if(this.isJoined(userId)){
                return false;
            }
            var joinDoc = this.getJoiningRow(userId);
            if(joinDoc && joinDoc.status === UniAnyJoin.STATUS_INVITED){
                return true;
            }
            return this.getJoinPolicy() === UniAnyJoin.TYPE_JOIN_OPEN;
        },
        canSendJoinInvitation: function(user){
            user = UniUtils.getUniUserObject(user);
            return user && (user.isAdmin() || this.ownerId === user._id);
        },
        canSendJoinRequest: function(user){
            user = UniUtils.getUniUserObject(user);
            if(!user || this.isJoined(user._id)){
                return false;
            }
            return this.getJoinPolicy() === UniAnyJoin.TYPE_JOIN_REQUEST;
        },
        canAcceptJoinRequest: function(acceptor){
            acceptor = UniUtils.getUniUserObject(acceptor);
            return acceptor && (acceptor.isAdmin() || acceptor._id === this.ownerId);
        },
        canChangeJoinPolicy: function(user){
            user = UniUtils.getUniUserObject(user);
            return user && (this.ownerId === user._id || user.isAdmin());
        },
        getJoinPolicy: function(){
            return this._joiningPolicy || UniAnyJoin.TYPE_JOIN_REQUEST;
        },
        isUserInvitedToJoin: function(userId){
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.getJoiningRow(userId);
            return doc && doc.status === UniAnyJoin.STATUS_INVITED;
        },
        isJoinRequestSent: function(userId){
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.getJoiningRow(userId);
            return doc && doc.status === UniAnyJoin.STATUS_REQUESTED;
        },
        canLeaveUser: function(acceptor, user){
            acceptor = UniUtils.getUniUserObject(acceptor);
            if(acceptor && (acceptor.isAdmin || acceptor._id === this.ownerId)){
                return true;
            }
            user = UniUtils.getUniUserObject(user);
            var doc = this.getJoiningRow(user._id);
            if(doc && doc.possessorId === acceptor._id){
                return true;
            }
        }
    });
};

UniAnyJoin.allow({
    publish: function(userId, doc, publicationName){
        if(userId){
            return publicationName === 'uniAnyJoin';
        }
    }
});