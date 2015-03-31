'use strict';

UniAnyJoin._addServerActions = function(collection){
    collection.helpers({
        sendJoinInvitation: function(toUser, originator){
            toUser = UniUtils.getUniUserObject(toUser, true);
            originator = UniUtils.getUniUserObject(originator, true);
            if(this.isJoined(toUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }
            if(!originator){
                throw new Meteor.Error(403, i18n('anyJoin:errors:missingOriginator'));
            }
            if(!this.canSendJoinInvitation(originator)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.getJoiningRow(toUser);
            var doc = this;
            if(_.isObject(lastJoiningDoc)){
                switch(lastJoiningDoc.status){
                    case UniAnyJoin.STATUS_INVITED:
                        return false;
                    case UniAnyJoin.STATUS_REQUESTED:
                        return doc.acceptJoinRequest(toUser, originator);
                }
            }
            return UniAnyJoin.insert({
                subjectId: doc._id,
                subjectCollectionName: collection._name,
                possessorId: toUser._id,
                type: UniAnyJoin.TYPE_JOIN_INVITATION,
                status: UniAnyJoin.STATUS_INVITED,
                originatorId: originator._id
            });
        },
        sendJoinRequest: function(fromUser, originatorId){
            fromUser = UniUtils.getUniUserObject(fromUser);
            if(this.isJoined(fromUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }
            originatorId = UniUtils.getIdIfDocument(originatorId) || UniUsers.getLoggedInId();
            var lastJoiningDoc = this.getJoiningRow(fromUser);
            var doc = this;
            if(_.isObject(lastJoiningDoc)){
                switch(lastJoiningDoc.status){
                    case UniAnyJoin.STATUS_INVITED:
                        return this.acceptJoinInvitation(fromUser);
                    case UniAnyJoin.STATUS_REQUESTED:
                        return false;
                }
            }
            if(!this.canSendJoinRequest(fromUser)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            return UniAnyJoin.insert({
                subjectId: doc._id,
                subjectCollectionName: collection._name,
                possessorId: fromUser._id,
                type: UniAnyJoin.TYPE_JOIN_REQUEST,
                status: UniAnyJoin.STATUS_REQUESTED,
                originatorId: originatorId
            });
        },
        acceptJoinRequest: function(fromUser, acceptor){
            if(this.isJoined(fromUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }
            var lastJoiningDoc = this.getJoiningRow(fromUser);
            if(!lastJoiningDoc){
                throw new Meteor.Error(404, i18n('anyJoin:errors:missingJoiningRequest'));
            }
            acceptor = UniUtils.getUniUserObject(acceptor);
            if(!acceptor){
                throw new Meteor.Error(404, i18n('anyJoin:errors:missingAcceptor'));
            }
            if(lastJoiningDoc.type !== UniAnyJoin.TYPE_JOIN_REQUEST || !this.canAcceptJoinRequest(acceptor)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            return lastJoiningDoc.update({$set:{status: UniAnyJoin.STATUS_JOINED, acceptorId: acceptor._id}});
        },
        acceptJoinInvitation: function(toUserId){
            toUserId = UniUtils.getIdIfDocument(toUserId);
            var lastJoiningDoc = this.getJoiningRow(toUserId);
            if(!lastJoiningDoc){
                throw new Meteor.Error(404, i18n('anyJoin:errors:missingJoiningInvitation'));
            }
            if(lastJoiningDoc.type === UniAnyJoin.TYPE_JOIN_INVITATION && lastJoiningDoc.possessorId === toUserId){
                return lastJoiningDoc.update({$set:{status: UniAnyJoin.STATUS_JOINED, acceptorId: toUserId}});
            }
        },

        join: function(userId){
            userId = UniUtils.getIdIfDocument(userId) || UniUsers.getLoggedInId();
            if(!this.canJoinDirectly(userId)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.getJoiningRow(userId);
            if(lastJoiningDoc){
                return lastJoiningDoc.update({$set:{
                    status: UniAnyJoin.STATUS_JOINED,
                    acceptorId: userId
                }});
            }
            return UniAnyJoin.insert({
                subjectId: this._id,
                subjectCollectionName: collection._name,
                possessorId: userId._id,
                type: UniAnyJoin.TYPE_JOIN_OPEN,
                status: UniAnyJoin.STATUS_REQUESTED,
                originatorId: userId,
                acceptorId: userId
            });
        },

        changeJoinPolicy: function(type, user){
            user = UniUtils.getUniUserObject(user);
            if(!this.canChangeJoinPolicy(user)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            this._joiningPolicy = type;
            return this.save('_joiningPolicy');
        },
        leaveJoinedSubject: function(user, acceptor){
            user = UniUtils.getUniUserObject(user);
            acceptor = UniUtils.getUniUserObject(acceptor);
            if(!user){
                throw new Meteor.Error(403, i18n('anyJoin:errors:missingAcceptor'));
            }
            if(!this.canLeaveUser(acceptor, user)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.getJoiningRow(user._id);
            if(lastJoiningDoc){
                return lastJoiningDoc.update({$set:{
                    status: UniAnyJoin.STATUS_REJECTED,
                    acceptorId: acceptor._id
                }});
            }
        }


    });
};

Meteor.methods({
    'UniAnyJoin/sendJoinInvitation': function(collectionName, subjectId, userId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.sendJoinInvitation(userId, this.userId);
    },
    'UniAnyJoin/sendJoinRequest': function(collectionName, subjectId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.sendJoinRequest(this.userId, this.userId);
    },
    'UniAnyJoin/acceptJoinRequest': function(collectionName, subjectId, forUserId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.acceptJoinRequest(forUserId, this.userId);
    },
    'UniAnyJoin/acceptJoinInvitation': function(collectionName, subjectId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.acceptJoinInvitation(this.userId);
    },
    'UniAnyJoin/join': function(collectionName, subjectId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.join(this.userId);
    },
    'UniAnyJoin/changeJoinPolicy': function(collectionName, subjectId, type){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.changeJoinPolicy(type, this.userId);
    },
    'UniAnyJoin/leaveJoinedSubject': function(collectionName, subjectId, userId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.leaveJoinedSubject(userId, this.userId);
    }
});

var _getSubjectDocument = function(collectionName, subjectId){
    var coll = UniAnyJoin.getSubjectCollection(collectionName);
    check(coll, UniCollection);
    var subject = coll.findOne(subjectId);
    if(!subject){
        throw new Meteor.Error(403, i18n('anyJoin:errors:noSubject'));
    }
    return subject;
};