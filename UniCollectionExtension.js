'use strict';

UniCollection.prototype.attachAnyJoin = function(joiningName, cbs){
    if(!(/^[a-z][a-zA-Z0-9_]*/.test(joiningName))){
        throw new Error('Joining name must start from lower case letter and contain the only alphanumeric chars');
    }
    if(!_.isObject(this._joiningCallbacks)){
        this._joiningCallbacks = {};
    }
    cbs = cbs || {};

    this._joiningCallbacks[joiningName] = cbs;
    UniAnyJoin._collections[this._name] = this;
    _addToSchemaJoiningFields(this, joiningName);
    _addJoiningHelpersToDocument(this, joiningName);
    if(Meteor.isServer){
        UniAnyJoin._addServerActions(this, joiningName);
    } else{
        UniAnyJoin._addClientActions(this, joiningName);
    }
};

var _addToSchemaJoiningFields = function(collection, joiningName){
    if(collection.simpleSchema){
        var sObject;
        try{
            sObject = collection.simpleSchema().schema();
        } catch(e){ console.warn('Collection "'+collection._name+'" has no simpleSchema'); }
        var joiningPolicyPropertyName = '_joiningPolicy_'+joiningName;
        if(_.size(sObject) && !sObject[joiningPolicyPropertyName]){
            sObject[joiningPolicyPropertyName] = {
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

    var helpers = {
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param userId
         * @returns {UniCollection.UniDoc}
         */
        joinGetRow: function(joiningName, userId){
            userId = UniUtils.getIdIfDocument(userId);
            return UniAnyJoin.findOne({
                joiningName: joiningName,
                subjectId: this._id,
                subjectCollectionName: collection._name,
                possessorId: userId
            }, {sort: {createdAt: -1}});
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param userId
         * @returns {boolean}
         */
        joinIsJoined: function(joiningName, userId){
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.joinGetRow(joiningName, userId);
            var res = _runCallback.call(this, 'isJoined', joiningName, userId);
            if(_.isBoolean(res)){
                return res;
            }
            return doc && doc.status === UniAnyJoin.STATUS_JOINED;
        },
        /**
         *
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param userId
         * @returns {boolean}
         */
        joinCanJoinDirectly: function(joiningName, userId){
            userId = UniUtils.getIdIfDocument(userId);
            if(this.joinIsJoined(joiningName, userId)){
                return false;
            }
            var joinDoc = this.joinGetRow(joiningName, userId);
            var res = _runCallback.call(this, 'canJoinDirectly', joiningName, userId);
            if(_.isBoolean(res)){
                return res;
            }
            if(joinDoc && joinDoc.status === UniAnyJoin.STATUS_INVITED){
                return true;
            }
            return this.joinGetPolicy(joiningName) === UniAnyJoin.TYPE_JOIN_OPEN;
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param user
         * @returns {boolean}
         */
        joinCanSendInvitation: function(joiningName, user){
            user = UniUtils.getUniUserObject(user);
            if(!user || this.joinIsJoined(joiningName, user)){
                return false;
            }
            var res = _runCallback.call(this, 'canSendInvitation', joiningName, user);
            if(_.isBoolean(res)){
                return res;
            }
            return user && (user.isAdmin() || this.ownerId === user._id);
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param user
         * @returns {boolean}
         */
        joinCanSendRequest: function(joiningName, user){
            user = UniUtils.getUniUserObject(user);
            if(!user || this.joinIsJoined(joiningName, user)){
                return false;
            }
            var res = _runCallback.call(this, 'canSendRequest', joiningName, user);
            if(_.isBoolean(res)){
                return res;
            }
            return this.joinGetPolicy(joiningName) === UniAnyJoin.TYPE_JOIN_REQUEST;
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param acceptor
         * @returns {boolean}
         */
        joinCanAcceptRequest: function(joiningName, acceptor){
            acceptor = UniUtils.getUniUserObject(acceptor);
            var res = _runCallback.call(this, 'canAcceptRequest', joiningName, acceptor);
            if(_.isBoolean(res)){
                return res;
            }
            return acceptor && (acceptor.isAdmin() || acceptor._id === this.ownerId);
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param user
         * @returns {boolean}
         */
        joinCanChangePolicy: function(joiningName, user){
            user = UniUtils.getUniUserObject(user);
            var res = _runCallback.call(this, 'canChangePolicy', joiningName, user);
            if(_.isBoolean(res)){
                return res;
            }
            return user && (this.ownerId === user._id || user.isAdmin());
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @returns {string}
         */
        joinGetPolicy: function(joiningName){
            return this['_joiningPolicy_'+joiningName] || UniAnyJoin.TYPE_JOIN_REQUEST;
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param userId
         * @returns {boolean}
         */
        joinIsUserInvited: function(joiningName, userId){
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.joinGetRow(joiningName, userId);
            return doc && doc.status === UniAnyJoin.STATUS_INVITED;
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param userId
         * @returns {boolean}
         */
        joinIsRequestSent: function(joiningName, userId){
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.joinGetRow(joiningName, userId);
            return doc && doc.status === UniAnyJoin.STATUS_REQUESTED;
        },
        /**
         * @memberof UniCollection.UniDoc#
         * @param joiningName
         * @param acceptor
         * @param user
         * @returns {boolean}
         */
        joinCanResign: function(joiningName, acceptor, user){
            acceptor = UniUtils.getUniUserObject(acceptor);
            var res = _runCallback.call(this, 'canResign', joiningName, user, acceptor);
            if(_.isBoolean(res)){
                return res;
            }
            if(acceptor && (acceptor.isAdmin || acceptor._id === this.ownerId)){
                return true;
            }
            user = UniUtils.getUniUserObject(user);
            var doc = this.joinGetRow(joiningName, user._id);
            if(doc && doc.possessorId === acceptor._id){
                return true;
            }
        }
    };

    collection.helpers(helpers);
};


var _runCallback = function(callbackName, joiningName){
    var cb = UniUtils.get(this.getCollection(), '_joiningCallbacks.'+joiningName+'.'+callbackName);
    if(_.isFunction(cb)){
        return cb.apply(this, Array.prototype.slice.call(arguments,1));
    }
};