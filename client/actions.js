'use strict';

UniAnyJoin._addClientActions = function(collection){
    collection.helpers({
        sendJoinInvitation: function(toUser, cb){
            toUser = UniUtils.getUniUserObject(toUser, true);
            if(this.isJoined(toUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            if(this.canSendJoinInvitation() && toUser){
                return Meteor.call('UniAnyJoin/sendJoinInvitation', collection._name, this._id, toUser._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        sendJoinRequest: function(fromUser, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            fromUser = UniUtils.getUniUserObject(fromUser);
            if(this.isJoined(fromUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            if(this.canSendJoinRequest(fromUser) && fromUser){
                return Meteor.call('UniAnyJoin/sendJoinRequest', collection._name, this._id, fromUser._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        acceptJoinRequest: function(fromUser, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.isJoined(fromUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            if(this.canAcceptJoinRequest(acceptor) &&  fromUser && acceptor){
                return Meteor.call('UniAnyJoin/acceptJoinRequest', collection._name, this._id, fromUser._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        acceptJoinInvitation: function(cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.isJoined(toUser)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userAlreadyJoined')));
            }
            return Meteor.call('UniAnyJoin/acceptJoinInvitation', collection._name, this._id, cb);
        },

        join: function(cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(this.getJoinPolicy() === UniAnyJoin.TYPE_JOIN_OPEN){
                return Meteor.call('UniAnyJoin/join', collection._name, this._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },

        changeJoinPolicy: function(type, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            var user = UniUsers.getLoggedIn();
            if(user && this.canChangeJoinPolicy(user)){
                return Meteor.call('UniAnyJoin/changeJoinPolicy', collection._name, this._id, type, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        },
        leaveJoinedSubject: function(user, cb){
            cb = cb || function(err){ if(err){console.error(err);} };
            if(!this.isJoined(user)){
                cb(new Meteor.Error(500, i18n('anyJoin:errors:userNotJoined')));
            }
            user = UniUtils.getUniUserObject(user);
            if(user && this.canLeaveUser(UniUsers.getLoggedIn(), user)){
                return Meteor.call('UniAnyJoin/leaveJoinedSubject', collection._name, this._id, user._id, cb);
            }
            cb(new Meteor.Error(403, i18n('anyJoin.errors.permissionDenied')));
        }
    });
};