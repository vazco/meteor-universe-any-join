'use strict';

/**
 * Adds Any Join functionality to this collection.
 * Notice: It is important to call this function after this.attachSchema if schema going to be attached.
 * (Any Join doesn't need simple schema to work, but it has only support for this.)
 * @param joiningName {String} Name of joining (Collection can have many joining types)
 * @param cbs {{onInvitation,onRequest,onAcceptRequest,onAcceptInvitation,onJoin,onResign,onGetDefaultPolicy
 * canResign,canChangePolicy,canAcceptRequest,canSendRequest,canSendInvitation,canJoinDirectly,isJoined}=}
 */
UniCollection.prototype.attachAnyJoin = function (joiningName, cbs) {
    if (!(/^[a-z][a-zA-Z0-9_]*/.test(joiningName))) {
        throw new Error('Joining name must start from lower case letter and contain the only alphanumeric chars');
    }

    cbs = cbs || {};
    if (_.isObject(this._joiningCallbacks)) {
        this._joiningCallbacks[joiningName] = cbs;
        UniAnyJoin._addToSchemaJoiningFields(this, joiningName);
        //already initialized on this collection
        return;
    }

    this._joiningCallbacks = {};
    UniAnyJoin._collections[this._name] = this;
    this._joiningCallbacks[joiningName] = cbs;
    //initialize helpers
    UniAnyJoin._addToSchemaJoiningFields(this, joiningName);
    _addJoiningHelpersToDocument(this, joiningName);
    if (Meteor.isServer) {
        UniAnyJoin._addServerActions(this, joiningName);
    } else {
        UniAnyJoin._addClientActions(this, joiningName);
    }
};

/**
 * Add callback. If there is callback, wraps it.
 *
 * @param joiningName {String} Name of joining (Collection can have many joining types)
 * @param event {{onInvitation,onRequest,onAcceptRequest,onAcceptInvitation,onJoin,onResign,onGetDefaultPolicy
 * canResign,canChangePolicy,canAcceptRequest,canSendRequest,canSendInvitation,canJoinDirectly,isJoined}=}
 * @param callback {Function} New callback
 */
UniCollection.prototype.addAnyJoinCallback = function (joiningName, event, callback) {
    check(event, String);
    check(joiningName, String);
    check(this._joiningCallbacks, Object);

    var previous = UniUtils.get(this, '_joiningCallbacks.' + joiningName + '.' + event);

    if (!this._joiningCallbacks[joiningName]) {
        throw new Error('AnyJoin not attached yet.');
    }

    if (previous) {
        this._joiningCallbacks[joiningName][event] = function () {
            previous.apply(this, arguments);
            callback.apply(this, arguments);
        };
    } else {
        this._joiningCallbacks[joiningName][event] = callback;
    }
};

UniAnyJoin._addToSchemaJoiningFields = function (collection, joiningName) {
    var joiningPolicyPropertyName = '_joiningPolicy_' + joiningName, sObject = collection.getSchema(),
        newSchemaPart = {};
    collection.deny({
        update: function (userId, doc, fields) {
            if (_.contains(fields, joiningPolicyPropertyName)) {
                if (!doc.joinCanChangePolicy(joiningName, userId)) {
                    return true;
                }
            }
        }
    });
    if (sObject) {
        var allowedValues = [
            UniAnyJoin.TYPE_JOIN_REQUEST,
            UniAnyJoin.TYPE_JOIN_INVITATION,
            UniAnyJoin.TYPE_JOIN_OPEN
        ];
        var labels = _(allowedValues).map(function (v) {
            return i18n('anyJoin.types.' + v);
        });
            //adds configuration of policy, field to schema
            newSchemaPart[joiningPolicyPropertyName] = {
                type: String,
                allowedValues: allowedValues,
                autoValue: function () {
                    if (this.isInsert && Meteor.isServer) {
                        var res;
                        var cb = UniUtils.get(collection, '_joiningCallbacks.' + joiningName + '.onGetDefaultPolicy');
                        if (_.isFunction(cb)) {
                            res = cb.call(this, joiningName, collection);
                        }
                        return res || this.value || UniAnyJoin.TYPE_JOIN_REQUEST;
                    }
                },
                label: i18n('anyJoin.policyLabel', joiningName),
                optional: true
                //autoform: {
                //    options: _.object(allowedValues, labels)
                //}
            };
            collection.setSchema(newSchemaPart);
            return 'simpleSchema';
    }
    if (Meteor.isServer) {
        //Providing support of default policy in situation, when simple schema wasn't attached
        var insertFn = collection.insert;
        collection.insert = function () {
            if (typeof arguments[0] === 'object') {
                var res;
                var cb = UniUtils.get(collection, '_joiningCallbacks.' + joiningName + '.onGetDefaultPolicy');
                if (_.isFunction(cb)) {
                    res = cb.apply(this, joiningName, collection);
                }
                arguments[0][joiningPolicyPropertyName] = res ||
                    UniUtils.get(arguments, '0.' + joiningPolicyPropertyName, UniAnyJoin.TYPE_JOIN_REQUEST);
                if (!_.contains(allowedValues, arguments[0][joiningPolicyPropertyName])) {
                    throw new Meteor.Error(500, 'Not allowed type of joining!');
                }
            }
            return insertFn.apply(this, arguments);
        };

        return 'insert';
    }
};

var _addJoiningHelpersToDocument = function (collection) {

    var helpers = {
        /**
         * Gets document for passed arguments (joiningName, userId) for current subject (document)
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param userId {UniUsers.UniUser|String} user or user id , which concerns joining  ( possessor of joining )
         * @returns {UniCollection.UniDoc}
         */
        joinGetRow: function (joiningName, userId) {
            userId = sanitizeFn(userId);
            userId = UniUtils.getIdIfDocument(userId);
            return UniAnyJoin.findOne({
                joiningName: joiningName,
                subjectId: this._id,
                subjectCollectionName: collection.getCollectionName(),
                possessorId: userId
            }, {sort: {createdAt: -1}});
        },
        /**
         * Checks if user is joined to current subject by joiningName
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param userId {UniUsers.UniUser|String} user or user id , which concerns joining  ( possessor of joining )
         * @returns {boolean}
         */
        joinIsJoined: function (joiningName, userId) {
            userId = sanitizeFn(userId);
            userId = UniUtils.getIdIfDocument(userId) || UniUsers.getLoggedInId();
            var doc = this.joinGetRow(joiningName, userId);
            var res = _runCallback.call(this, 'isJoined', joiningName, userId);
            if (_.isBoolean(res)) {
                return res;
            }
            return doc && doc.status === UniAnyJoin.STATUS_JOINED;
        },
        /**
         * Checks if user can join directly (free for join or user is admin)
         * logic can be changed by callback 'canJoinDirectly'
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param userId {UniUsers.UniUser|String} user or user id , which concerns joining  ( possessor of joining )
         * @returns {boolean}
         */
        joinCanJoinDirectly: function (joiningName, userId, acceptorId) {
            userId = sanitizeFn(userId);
            acceptorId = sanitizeFn(acceptorId);
            userId = UniUtils.getIdIfDocument(userId);
            acceptorId = acceptorId || userId;
            if (this.joinIsJoined(joiningName, userId)) {
                return false;
            }
            var joinDoc = this.joinGetRow(joiningName, userId);
            var res = _runCallback.call(this, 'canJoinDirectly', joiningName, userId, acceptorId);
            if (_.isBoolean(res)) {
                return res;
            }
            if (joinDoc && joinDoc.status === UniAnyJoin.STATUS_INVITED) {
                return true;
            }
            var acceptor = UniUsers.ensureUniUser(acceptorId);
            if (acceptor && (acceptor._id === this.ownerId || acceptor.isAdmin())) {
                return true;
            }
            return this.joinGetPolicy(joiningName) === UniAnyJoin.TYPE_JOIN_OPEN;
        },
        /**
         * Checks if user can invite someone
         * logic can be changed by callback 'canSendInvitation'
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param user {UniUsers.UniUser|String=} owner of subject or admin, ( caller )
         * @returns {boolean}
         */
        joinCanSendInvitation: function (joiningName, user) {
            user = sanitizeFn(user);
            user = UniUsers.ensureUniUser(user);
            if (!user) {
                return false;
            }
            var res = _runCallback.call(this, 'canSendInvitation', joiningName, user);
            if (_.isBoolean(res)) {
                return res;
            }
            return user && (user.isAdmin() || this.ownerId === user._id);
        },
        /**
         * Checks if user can send joining request
         * logic can be changed by callback 'canSendRequest'
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param user user or user id , which concerns joining  ( possessor of joining )
         * @returns {boolean}
         */
        joinCanSendRequest: function (joiningName, user) {
            user = sanitizeFn(user);
            user = UniUsers.ensureUniUser(user);
            if (!user || this.joinIsJoined(joiningName, user)) {
                return false;
            }
            var res = _runCallback.call(this, 'canSendRequest', joiningName, user);
            if (_.isBoolean(res)) {
                return res;
            }
            return this.joinGetPolicy(joiningName) === UniAnyJoin.TYPE_JOIN_REQUEST;
        },
        /**
         * Checks if user can accept joining request
         * logic can be changed by callback 'canAcceptRequest'
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param acceptor {UniUsers.UniUser|String=} owner of subject or admin, ( caller )
         * @returns {boolean}
         */
        joinCanAcceptRequest: function (joiningName, acceptor) {
            acceptor = sanitizeFn(acceptor);
            acceptor = UniUsers.ensureUniUser(acceptor);
            var res = _runCallback.call(this, 'canAcceptRequest', joiningName, acceptor);
            if (_.isBoolean(res)) {
                return res;
            }
            return acceptor && (acceptor.isAdmin() || acceptor._id === this.ownerId);
        },
        /**
         * Checks if user can change policy of joining process.
         * logic can be changed by callback 'canChangePolicy'
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param user {UniUsers.UniUser|String} owner of subject or admin, ( caller )
         * @returns {boolean}
         */
        joinCanChangePolicy: function (joiningName, user) {
            user = sanitizeFn(user);
            user = UniUsers.ensureUniUser(user);
            var res = _runCallback.call(this, 'canChangePolicy', joiningName, user);
            if (_.isBoolean(res)) {
                return res;
            }
            return user && (this.ownerId === user._id || user.isAdmin());
        },
        /**
         * Gets current policy of joining
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @returns {string}
         */
        joinGetPolicy: function (joiningName) {
            return this['_joiningPolicy_' + joiningName] || UniAnyJoin.TYPE_JOIN_REQUEST;
        },
        /**
         * Checks if user is invited to subject
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param userId {UniUsers.UniUser|String} user or user id , which concerns joining  ( possessor of joining )
         * @returns {boolean}
         */
        joinIsUserInvited: function (joiningName, userId) {
            userId = sanitizeFn(userId);
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.joinGetRow(joiningName, userId);
            return doc && doc.status === UniAnyJoin.STATUS_INVITED;
        },
        /**
         * Checks if is waiting request
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param userId {UniUsers.UniUser|String} user or user id , which concerns joining  ( possessor of joining )
         * @returns {boolean}
         */
        joinIsRequestSent: function (joiningName, userId) {
            userId = sanitizeFn(userId);
            userId = UniUtils.getIdIfDocument(UniUtils.getUniUserObject(userId));
            var doc = this.joinGetRow(joiningName, userId);
            return doc && doc.status === UniAnyJoin.STATUS_REQUESTED;
        },
        /**
         * Checks if user can resign/reject invitation/request or leave subject
         * logic can be changed by callback 'canResign'
         * @memberof UniCollection.UniDoc#
         * @param joiningName {String} kind of joining
         * @param acceptor {UniUsers.UniUser|String} owner of subject or admin, ( caller )
         * @param user {UniUsers.UniUser|String} user or user id , which concerns joining  ( possessor of joining )
         * @returns {boolean}
         */
        joinCanResign: function (joiningName, acceptor, user) {
            acceptor = sanitizeFn(acceptor);
            user = sanitizeFn(user);
            acceptor = UniUsers.ensureUniUser(acceptor);
            var res = _runCallback.call(this, 'canResign', joiningName, user, acceptor);
            if (_.isBoolean(res)) {
                return res;
            }
            if (acceptor && (acceptor.isAdmin || acceptor._id === this.ownerId)) {
                return true;
            }
            user = UniUsers.ensureUniUser(user);
            var doc = this.joinGetRow(joiningName, user._id);
            if (doc && doc.possessorId === acceptor._id) {
                return true;
            }
        },
        /**
         * Checks if user can gets possessors
         * @param joiningName
         * @param statuses {[String]=} array of status: UniAnyJoin.STATUS_*
         * @param caller {UniUsers.UniUser=} on client default is logged in user.
         * @returns {boolean}
         */
        joinCanGetPossessorsOfEntries: function (joiningName, statuses, caller) {
            caller = sanitizeFn(caller);
            caller = UniUsers.ensureUniUser(caller);
            var res = _runCallback.call(this, 'canGetPossessorsOfEntries', joiningName, statuses, caller);
            if (_.isBoolean(res)) {
                return res;
            }
            return caller && (this.ownerId === caller._id || caller.isAdmin());
        }
    };

    collection.docHelpers(helpers);
};

var sanitizeFn = UniUtils.clearSpacebarsKwObject || function (x) {
        return x;
    };

var _runCallback = function (callbackName, joiningName) {
    var cb = UniUtils.get(this.getCollection(), '_joiningCallbacks.' + joiningName + '.' + callbackName);
    if (_.isFunction(cb)) {
        return cb.apply(this, Array.prototype.slice.call(arguments, 1));
    }
};
