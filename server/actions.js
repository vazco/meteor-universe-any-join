'use strict';

UniAnyJoin._addServerActions = function(collection){
    var helpers = {
        /**
         * Sends Invitation to joining for "toUser" by "originator"
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param toUser {UniUsers.UniUser|String} invitation receiver
         * @param originator {UniUsers.UniUser|String} caller
         * @returns {*}
         */
        joinSendInvitation: function(joiningName, toUser, originator){
            toUser = UniUtils.getUniUserObject(toUser, true);
            originator = UniUtils.getUniUserObject(originator, true);
            if(this.joinIsJoined(joiningName, toUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }
            if(!originator){
                throw new Meteor.Error(403, i18n('anyJoin:errors:missingOriginator'));
            }
            if(!this.joinCanSendInvitation(joiningName, originator)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.joinGetRow(joiningName, toUser);
            var doc = this;
            if(_.isObject(lastJoiningDoc)){
                switch(lastJoiningDoc.status){
                    case UniAnyJoin.STATUS_INVITED:
                        return false;
                    case UniAnyJoin.STATUS_REQUESTED:
                        return doc.joinAcceptRequest(joiningName, toUser, originator);
                }
            }
            var insertRes = UniAnyJoin.insert({
                joiningName: joiningName,
                subjectId: doc._id,
                subjectCollectionName: collection._name,
                possessorId: toUser._id,
                type: UniAnyJoin.TYPE_JOIN_INVITATION,
                status: UniAnyJoin.STATUS_INVITED,
                originatorId: originator._id
            });
            _runCallback.call(this, 'onInvitation', joiningName, UniAnyJoin.findOne(insertRes), toUser, originator);
            return insertRes;
        },
        /**
         * Sends joining request
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param fromUser {UniUsers.UniUser|String} sender ( possessor )
         * @param originatorId {UniUsers.UniUser|String} caller
         * @returns {*}
         */
        joinSendRequest: function(joiningName, fromUser, originatorId){
            fromUser = UniUtils.getUniUserObject(fromUser);

            if(this.joinIsJoined(joiningName, fromUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }

            originatorId = UniUtils.getIdIfDocument(originatorId) || UniUsers.getLoggedInId();
            var lastJoiningDoc = this.joinGetRow(joiningName, fromUser);
            var doc = this;

            if(_.isObject(lastJoiningDoc)){
                switch(lastJoiningDoc.status){
                    case UniAnyJoin.STATUS_INVITED:
                        return this.joinAcceptInvitation(joiningName, fromUser);
                    case UniAnyJoin.STATUS_REQUESTED:
                        return false;
                }
            }

            if(!this.joinCanSendRequest(joiningName, fromUser)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }

            var insertRes = UniAnyJoin.insert({
                joiningName: joiningName,
                subjectId: doc._id,
                subjectCollectionName: collection._name,
                possessorId: fromUser._id,
                type: UniAnyJoin.TYPE_JOIN_REQUEST,
                status: UniAnyJoin.STATUS_REQUESTED,
                originatorId: originatorId
            });

            _runCallback.call(this, 'onRequest', joiningName, UniAnyJoin.findOne(insertRes), fromUser, originatorId);
            return insertRes;
        },
        /**
         * Accepts users request and join him to subject
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param fromUser {UniUsers.UniUser|String} ( possessor )
         * @param acceptor {UniUsers.UniUser|String} caller (admin, owner,...)
         * @returns {*}
         */
        joinAcceptRequest: function(joiningName, fromUser, acceptor){
            if(this.joinIsJoined(joiningName, fromUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }

            var lastJoiningDoc = this.joinGetRow(joiningName, fromUser);
            if(!lastJoiningDoc){
                throw new Meteor.Error(404, i18n('anyJoin:errors:missingJoiningRequest'));
            }

            acceptor = UniUtils.getUniUserObject(acceptor);
            if(!acceptor){
                throw new Meteor.Error(404, i18n('anyJoin:errors:missingAcceptor'));
            }

            if(lastJoiningDoc.type !== UniAnyJoin.TYPE_JOIN_REQUEST ||
                !this.joinCanAcceptRequest(joiningName, acceptor)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }

            var updateRes = lastJoiningDoc.update({$set:{status: UniAnyJoin.STATUS_JOINED, acceptorId: acceptor._id}});

            _runCallback.call(this, 'onAcceptRequest', joiningName, lastJoiningDoc.findSelf(), fromUser, acceptor);
            return updateRes;
        },
        /**
         * Accepts invitation to joining
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param toUserId {UniUsers.UniUser|String} ( possessor )
         * @returns {*}
         */
        joinAcceptInvitation: function(joiningName, toUserId){
            toUserId = UniUtils.getIdIfDocument(toUserId);
            var lastJoiningDoc = this.joinGetRow(joiningName, toUserId);
            if(!lastJoiningDoc){
                throw new Meteor.Error(404, i18n('anyJoin:errors:missingJoiningInvitation'));
            }
            if(lastJoiningDoc.type === UniAnyJoin.TYPE_JOIN_INVITATION && lastJoiningDoc.possessorId === toUserId){
                var updateRes = lastJoiningDoc.update({$set:{status: UniAnyJoin.STATUS_JOINED, acceptorId: toUserId}});
                _runCallback.call(this, 'onAcceptInvitation', joiningName, lastJoiningDoc.findSelf(), toUserId);
                return updateRes;
            }
        },
        /**
         * Joins to subject, if free to join
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param userId {UniUsers.UniUser|String}
         * @returns {*}
         */
        join: function(joiningName, userId){
            userId = UniUtils.getIdIfDocument(userId) || UniUsers.getLoggedInId();
            if(!this.joinCanJoinDirectly(joiningName, userId)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.joinGetRow(joiningName, userId);
            if(lastJoiningDoc){
                var updateRes = lastJoiningDoc.update({$set:{
                    status: UniAnyJoin.STATUS_JOINED,
                    acceptorId: userId
                }});
                _runCallback.call(this, 'onJoin', joiningName, lastJoiningDoc.findSelf(), userId);
                return updateRes;
            }
            var insertRes = UniAnyJoin.insert({
                joiningName: joiningName,
                subjectId: this._id,
                subjectCollectionName: collection._name,
                possessorId: userId._id,
                type: UniAnyJoin.TYPE_JOIN_OPEN,
                status: UniAnyJoin.STATUS_REQUESTED,
                originatorId: userId,
                acceptorId: userId
            });

            _runCallback.call(this, 'onJoin', joiningName, UniAnyJoin.findOne(insertRes), userId);
            return insertRes;
        },
        /**
         * Sets policy of joining, allowed types:
         * UniAnyJoin.TYPE_JOIN_REQUEST,
         * UniAnyJoin.TYPE_JOIN_INVITATION,
         * UniAnyJoin.TYPE_JOIN_OPEN
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param type one of UniAnyJoin.TYPE_JOIN_REQUEST, UniAnyJoin.TYPE_JOIN_INVITATION, UniAnyJoin.TYPE_JOIN_OPEN
         * @param user {UniUsers.UniUser|String} caller
         * @returns {*}
         */
        joinChangePolicy: function(joiningName, type, user){
            user = UniUtils.getUniUserObject(user);
            if(!this.joinCanChangePolicy(joiningName, user)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            this['_joiningPolicy_'+joiningName] = type;
            return this.save('_joiningPolicy_'+joiningName);
        },
        /**
         * Resigns from joining, rejects user request or invitation
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param user {UniUsers.UniUser|String} possessor of joining
         * @param acceptor {UniUsers.UniUser|String} caller, who wants do that
         * @returns {*}
         */
        joinResign: function(joiningName, user, acceptor){
            user = UniUtils.getUniUserObject(user);
            acceptor = UniUtils.getUniUserObject(acceptor);
            if(!user){
                throw new Meteor.Error(403, i18n('anyJoin:errors:missingAcceptor'));
            }
            if(!this.joinCanResign(joiningName, acceptor, user)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.joinGetRow(joiningName, user._id);
            if(lastJoiningDoc){
                var updateRes = lastJoiningDoc.update({$set:{
                    status: UniAnyJoin.STATUS_REJECTED,
                    acceptorId: acceptor._id
                }});
                _runCallback.call(this, 'onResign', joiningName, lastJoiningDoc.findSelf(), user);
                return updateRes;
            }
        }
    };

    collection.helpers(helpers);
};

Meteor.methods({
    'UniAnyJoin/joinSendInvitation': function(joiningName, collectionName, subjectId, userId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinSendInvitation(joiningName, userId, this.userId);
    },
    'UniAnyJoin/joinSendRequest': function(joiningName, collectionName, subjectId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinSendRequest(joiningName, this.userId, this.userId);
    },
    'UniAnyJoin/joinAcceptRequest': function(joiningName, collectionName, subjectId, forUserId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinAcceptRequest(joiningName, forUserId, this.userId);
    },
    'UniAnyJoin/joinAcceptInvitation': function(joiningName, collectionName, subjectId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinAcceptInvitation(joiningName, this.userId);
    },
    'UniAnyJoin/join': function(joiningName, collectionName, subjectId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.join(joiningName, this.userId);
    },
    'UniAnyJoin/joinChangePolicy': function(joiningName, collectionName, subjectId, type){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinChangePolicy(joiningName, type, this.userId);
    },
    'UniAnyJoin/joinResign': function(joiningName, collectionName, subjectId, userId){
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinResign(joiningName, userId, this.userId);
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

var _runCallback = function(callbackName, joiningName, insertRes){
    var cb = UniUtils.get(this.getCollection(), '_joiningCallbacks.'+joiningName+'.'+callbackName);
    if(_.isFunction(cb)){
        cb.apply(this, Array.prototype.slice.call(arguments,1));
    }
};