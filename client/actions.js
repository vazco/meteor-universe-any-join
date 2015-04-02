'use strict';

UniAnyJoin._addClientActions = function(collection){
    var helpers = {
        /**
         * Sends Invitation to joining for "toUser" from logged in.
         * On server side will be called method joinCanSendInvitation
         * and onSendInvitation callback after sent
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param toUser {UniUsers.UniUser|String} invitation receiver
         * @param cb {Function} callback on done
         * @returns {*}
         */
        joinSendInvitation: function(joiningName, toUser, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            toUser = UniUtils.getUniUserObject(toUser, true);
            if(toUser && this.joinIsJoined(joiningName, toUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            if(this.joinCanSendInvitation(joiningName) && toUser){
                return Meteor.call('UniAnyJoin/joinSendInvitation', joiningName, collection._name, this._id, toUser._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        /**
         * Sends joining request
         * On server side will be called method joinCanSendRequest
         * and onSendRequest callback after sent
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param cb {Function} callback on done
         * @returns {*}
         */
        joinSendRequest: function(joiningName, cb){
            cb = cb || function(err){ if(err){ console.error(err); } };
            var fromUser = UniUsers.getLoggedIn();
            if(this.joinIsJoined(joiningName, fromUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            if(this.joinCanSendRequest(joiningName, fromUser) && fromUser){
                return Meteor.call('UniAnyJoin/joinSendRequest', joiningName, collection._name, this._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        /**
         * Accepts users request and join him to subject
         * On server side will be called method joinCanAcceptRequest
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param fromUser {UniUsers.UniUser|String} ( possessor )
         * @param cb {Function} callback on done
         * @returns {*}
         */
        joinAcceptRequest: function(joiningName, fromUser, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.joinIsJoined(joiningName, fromUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            var acceptor = UniUsers.getLoggedIn();
            if(this.joinCanAcceptRequest(joiningName, acceptor) &&  fromUser && acceptor){
                return Meteor.call('UniAnyJoin/joinAcceptRequest', joiningName, collection._name, this._id, fromUser._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        /**
         * Accepts invitation to joining
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param cb {Function} callback on done
         * @returns {*}
         */
        joinAcceptInvitation: function(joiningName, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.joinIsJoined(joiningName, UniUsers.getLoggedIn())){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            return Meteor.call('UniAnyJoin/joinAcceptInvitation', joiningName, collection._name, this._id, cb);
        },
        /**
         * Joins to subject, if free to join
         * On server side will be called method joinCanJoin
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param cb {Function} callback on done
         * @returns {*}
         */
        join: function(joiningName, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.joinGetPolicy(joiningName) === UniAnyJoin.TYPE_JOIN_OPEN){
                return Meteor.call('UniAnyJoin/join', joiningName, collection._name, this._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        /**
         * Sets policy of joining, allowed types:
         * UniAnyJoin.TYPE_JOIN_REQUEST,
         * UniAnyJoin.TYPE_JOIN_INVITATION,
         * UniAnyJoin.TYPE_JOIN_OPEN
         * On server side will be called method joinCanChangePolicy
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param type one of UniAnyJoin.TYPE_JOIN_REQUEST, UniAnyJoin.TYPE_JOIN_INVITATION, UniAnyJoin.TYPE_JOIN_OPEN
         * @param cb {Function} callback on done
         * @returns {*}
         */
        joinChangePolicy: function(joiningName, type, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            var user = UniUsers.getLoggedIn();
            if(user && this.joinCanChangePolicy(joiningName, user)){
                return Meteor.call('UniAnyJoin/joinChangePolicy', joiningName, collection._name, this._id, type, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        /**
         * Resigns from joining, rejects user request or invitation
         * On server side will be called method joinCanResign
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String=} kind of joining default loggedIn user
         * @param user {UniUsers.UniUser|String} possessor of joining
         * @param cb {Function} callback on done
         * @returns {*}
         */
        joinResign: function(joiningName, user, cb){
            if(!user){
                user = UniUsers.getLoggedIn();
            }
            cb = cb || function(err){ if(err){console.error(err);} };
            user = UniUtils.getUniUserObject(user);
            if(user && this.joinCanResign(joiningName, UniUsers.getLoggedIn(), user)){
                return Meteor.call('UniAnyJoin/joinResign', joiningName, collection._name, this._id, user._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        }

    };

    collection.helpers(helpers);
};