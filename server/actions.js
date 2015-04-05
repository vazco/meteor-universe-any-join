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
            toUser = UniUsers.ensureUniUser(toUser || null);
            originator = UniUsers.ensureUniUser(originator);
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
         * @param originator {UniUsers.UniUser|String} caller
         * @returns {*}
         */
        joinSendRequest: function(joiningName, fromUser, originator){
            fromUser = UniUsers.ensureUniUser(fromUser);

            if(this.joinIsJoined(joiningName, fromUser)){
                throw new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined'));
            }
            originator = UniUsers.ensureUniUser(originator || fromUser);
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
                originatorId: originator._id
            });

            _runCallback.call(this, 'onRequest', joiningName, UniAnyJoin.findOne(insertRes), fromUser, originator);
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
            acceptor = UniUsers.ensureUniUser(acceptor, UniUsers.matchingDocument(), i18n('anyJoin:errors:missingAcceptor'));

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
            toUserId = UniUtils.getIdIfDocument(toUserId) || UniUsers.getLoggedInId();
            check(toUserId, String);
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
         * @param user {UniUsers.UniUser|String}
         * @param acceptor {UniUsers.UniUser=} default same as user
         * @returns {*}
         */
        join: function(joiningName, user, acceptor){
            user = UniUsers.ensureUniUser(user);
            acceptor = UniUsers.ensureUniUser(acceptor || user);

            if(!this.joinCanJoinDirectly(joiningName, user, acceptor)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.joinGetRow(joiningName, user);
            if(lastJoiningDoc){
                var updateRes = lastJoiningDoc.update({$set:{
                    status: UniAnyJoin.STATUS_JOINED,
                    acceptorId: acceptor._id
                }});
                _runCallback.call(this, 'onJoin', joiningName, lastJoiningDoc.findSelf(), user, acceptor);
                return updateRes;
            }
            var insertRes = UniAnyJoin.insert({
                joiningName: joiningName,
                subjectId: this._id,
                subjectCollectionName: collection._name,
                possessorId: user._id,
                type: UniAnyJoin.TYPE_JOIN_OPEN,
                status: UniAnyJoin.STATUS_JOINED,
                originatorId: acceptor._id,
                acceptorId: acceptor._id
            });

            _runCallback.call(this, 'onJoin', joiningName, UniAnyJoin.findOne(insertRes), user, acceptor);
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
            user = UniUsers.ensureUniUser(user);
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
            user = UniUsers.ensureUniUser(user, UniUsers.matchingDocument(), i18n('anyJoin:errors:missingAcceptor'));
            acceptor = UniUsers.ensureUniUser(acceptor || user);

            if(!this.joinCanResign(joiningName, acceptor, user)){
                throw new Meteor.Error(403, i18n('anyJoin:errors:permissionDenied'));
            }
            var lastJoiningDoc = this.joinGetRow(joiningName, user._id);
            if(lastJoiningDoc){
                var updateRes = lastJoiningDoc.update({$set:{
                    status: UniAnyJoin.STATUS_REJECTED,
                    acceptorId: acceptor._id
                }});
                _runCallback.call(this, 'onResign', joiningName, lastJoiningDoc.findSelf(), user, acceptor);
                return updateRes;
            }
        }
    };

    collection.helpers(helpers);
};

Meteor.methods({
    'UniAnyJoin/joinSendInvitation': function(joiningName, collectionName, subjectId, userId){
        check(this.userId, String);
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinSendInvitation(joiningName, userId, this.userId);
    },
    'UniAnyJoin/joinSendRequest': function(joiningName, collectionName, subjectId){
        check(this.userId, String);
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinSendRequest(joiningName, this.userId, this.userId);
    },
    'UniAnyJoin/joinAcceptRequest': function(joiningName, collectionName, subjectId, forUserId){
        check(this.userId, String);
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinAcceptRequest(joiningName, forUserId, this.userId);
    },
    'UniAnyJoin/joinAcceptInvitation': function(joiningName, collectionName, subjectId){
        check(this.userId, String);
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinAcceptInvitation(joiningName, this.userId);
    },
    'UniAnyJoin/join': function(joiningName, collectionName, subjectId, userId){
        check(this.userId, String);
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.join(joiningName, userId || this.userId, this.userId);
    },
    'UniAnyJoin/joinChangePolicy': function(joiningName, collectionName, subjectId, type){
        check(this.userId, String);
        var subject = _getSubjectDocument(collectionName, subjectId);
        return subject.joinChangePolicy(joiningName, type, this.userId);
    },
    'UniAnyJoin/joinResign': function(joiningName, collectionName, subjectId, userId){
        check(this.userId, String);
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