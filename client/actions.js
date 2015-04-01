'use strict';

UniAnyJoin._addClientActions = function(collection){
    var helpers = {
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
        joinAcceptInvitation: function(joiningName, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.joinIsJoined(joiningName, UniUsers.getLoggedIn())){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            return Meteor.call('UniAnyJoin/joinAcceptInvitation', joiningName, collection._name, this._id, cb);
        },
        join: function(joiningName, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.joinGetPolicy(joiningName) === UniAnyJoin.TYPE_JOIN_OPEN){
                return Meteor.call('UniAnyJoin/join', joiningName, collection._name, this._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        joinChangePolicy: function(joiningName, type, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            var user = UniUsers.getLoggedIn();
            if(user && this.joinCanChangePolicy(joiningName, user)){
                return Meteor.call('UniAnyJoin/joinChangePolicy', joiningName, collection._name, this._id, type, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
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