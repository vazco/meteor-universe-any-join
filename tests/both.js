'use strict';

SimpleSchema.debug = true;

var testCollection = new UniCollection('testCollection_anyjoin');

testCollection.attachSchema(new SimpleSchema({
        test: {
            type: Number
        },
        ownerId: {
            type: String,
            optional: true
        }
    }
));

testCollection.allow({
    publish: function(){
        return true;
    },
    insert: function(){
        return true;
    },
    update: function(){
        return true;
    },
    remove: function(){
        return true;
    }
});

UniAnyJoin.allow({
    publish: function(){
        return true;
    }
});
if(Meteor.isServer){
    Meteor.publish('testCollection_anyjoin', function(){
        return [
            UniAnyJoin.find(),
            testCollection.find(),
            UniUsers.find({$or:[
                {emails: {$elemMatch:{address: 'test_anyjoin@test_anyjoin.vazco'}}},
                {emails: {$elemMatch:{address: 'test_anyjoin2@test_anyjoin.vazco'}}},
                {emails: {$elemMatch:{address: 'test_anyjoin3@test_anyjoin.vazco'}}}
            ]})
        ];
    });
    Meteor.methods({
        test_anyjoin_relog: function(who){
            if(who){
                var user;
                switch(who){
                    case 'owner':
                        user = UniUsers.findOne({username: 'test_anyjoin'});
                        break;
                    case 'someUser':
                        user = UniUsers.findOne({username: 'test_anyjoin2'});
                        break;
                    case 'admin':
                        user =  UniUsers.findOne({username: 'test_anyjoin_admin'});
                        break;
                }
                if(user){
                    console.warn('log in as ', user._id, who);
                    this.setUserId(user._id);
                }
            }
        },
        test_anyjoin_cleanup: function(){
            UniAnyJoin.remove({subjectCollectionName: testCollection._name});
            testCollection.remove({});
            UniUsers.remove({emails: {$elemMatch:{address: 'test_anyjoin@test_anyjoin.vazco'}}});
            UniUsers.remove({emails: {$elemMatch:{address: 'test_anyjoin2@test_anyjoin.vazco'}}});
            UniUsers.remove({emails: {$elemMatch:{address: 'test_anyjoin3@test_anyjoin.vazco'}}});
            if(this.userId){
                console.warn('logout ',this.userId);
                this.setUserId(null);
            }

        },
        test_anyjoin_prepare_data: function(who){
            UniUsers.insert({
                username: 'test_anyjoin2',
                emails: [{address: 'test_anyjoin2@test_anyjoin.vazco'}],
                profile: {name: 'some user'}
            });
            UniUsers.insert({
                username: 'test_anyjoin',
                emails: [{address: 'test_anyjoin@test_anyjoin.vazco'}],
                profile: {name: 'owner user'}
            });
            UniUsers.insert({
                username: 'test_anyjoin_admin',
                emails: [{address: 'test_anyjoin3@test_anyjoin.vazco'}],
                profile: {name: 'admin user'},
                is_admin: true
            });

            testCollection.insert({test:1});
            testCollection.insert({test:2});
            testCollection.insert({test:3});
            if(who){
                var user;
                switch(who){
                    case 'owner':
                        user = UniUsers.findOne({username: 'test_anyjoin'});
                        break;
                    case 'someUser':
                        user = UniUsers.findOne({username: 'test_anyjoin2'});
                        break;
                    case 'admin':
                       user =  UniUsers.findOne({username: 'test_anyjoin_admin'});
                        break;
                }
                if(user){
                    console.warn('log in as ', user._id, who);
                    this.setUserId(user._id);
                }
            }
        }
    });
}
var orgLoggedId = Meteor.userId;
var prepareData = function(cb, who){
    if (Meteor.isClient) {
    Meteor.call('test_anyjoin_prepare_data', who, function () {
        if(who){
            var _oddCb = cb;
            cb = function(){
                var user;
                switch(who){
                    case 'owner':
                        user = Meteor.users.findOne({username: 'test_anyjoin'});
                        break;
                    case 'someUser':
                        user = Meteor.users.findOne({username: 'test_anyjoin2'});
                        break;
                    case 'admin':
                        user =  Meteor.users.findOne({username: 'test_anyjoin_admin'});
                        break;
                }
                Meteor.userId = function(){
                    return user._id;
                };
                _oddCb();
            };
        }
        Meteor.subscribe('testCollection_anyjoin', cb);
    });
    } else{
        Meteor.call('test_anyjoin_prepare_data', who);
        cb();
    }
};

var cleanUpData = function(onClomplete){
    Meteor.call('test_anyjoin_cleanup', function(){
        if(Meteor.isClient && _.isFunction(orgLoggedId)){
            Meteor.userId = orgLoggedId;
        }
        onClomplete();
    });
};

var relog = function(who){
    var user;
    switch(who){
        case 'owner':
            user = Meteor.users.findOne({username: 'test_anyjoin'});
            break;
        case 'someUser':
            user = Meteor.users.findOne({username: 'test_anyjoin2'});
            break;
        case 'admin':
            user =  Meteor.users.findOne({username: 'test_anyjoin_admin'});
            break;
    }
    Meteor.userId = function(){
        return user._id;
    };
    Meteor.call('test_anyjoin_relog', who);
    console.log('Logged as ', user._id, who);
};

Meteor.call('test_anyjoin_cleanup', function(){

    Tinytest.add('Universe Any Join - instances', function (test) {
        test.instanceOf(UniAnyJoin, UniCollection);
        test.isTrue(_.isFunction(testCollection.attachAnyJoin), 'function exists');
        testCollection.attachAnyJoin('test');
        test.instanceOf(UniAnyJoin.getSubjectCollection(testCollection._name), UniCollection);
    });

    Tinytest.addAsync('Universe Any Join - attach helpers', function (test, onComplete) {
        prepareData(function(){
            var doc = testCollection.findOne({test:1});
            test.isTrue(_.isObject(doc), 'document "test:1" exist');
            _.each([
                'joinGetRow', 'joinIsJoined', 'joinCanJoinDirectly', 'joinCanSendInvitation',
                'joinCanSendRequest', 'joinCanAcceptRequest', 'joinCanChangePolicy', 'joinGetPolicy',
                'joinIsUserInvited', 'joinIsRequestSent', 'joinCanResign', 'joinSendInvitation', 'joinSendRequest',
                'joinAcceptRequest', 'joinAcceptInvitation', 'join', 'joinChangePolicy', 'joinResign'
            ], function(m){
                test.isTrue(_.isFunction(doc[m]), 'document helper exists "'+m+'"');
            });
            test.isFalse(doc.joinGetRow('test'), 'document "test:1" exist');
            test.isFalse(doc.joinIsJoined('test'), 'document "test:1" not joined');
            cleanUpData(onComplete);
        });

    });
    Tinytest.addAsync('Universe Any Join - test helpers for some user', function (test, onClomplete) {
        prepareData(function () {
            var testNo = 2;
            if (Meteor.isServer) {
                testNo = 3;
            }
            var doc = testCollection.findOne({test: testNo});
            var user = UniUsers.findOne({username: 'test_anyjoin'});
            test.isTrue(_.isObject(doc), 'document "test:' + testNo + '" exist');
            test.isTrue(_.isObject(user), 'user exist');
            test.isFalse(doc.joinIsJoined('test',user), 'document "test:' + testNo + '" not joined user');
            test.isTrue(_.isString(doc.joinGetPolicy('test')), 'get Join Policy');
            test.isFalse(doc.joinCanChangePolicy('test',user), 'some user joinCanChangePolicy');
            test.isFalse(doc.joinCanSendInvitation('test',user), 'some user joinCanSendInvitation');
            test.isFalse(doc.joinCanAcceptRequest('test',user), 'some user joinCanAcceptRequest');
            test.isFalse(doc.joinIsUserInvited('test',user), 'some user joinIsUserInvited');
            test.isFalse(doc.joinIsRequestSent('test',user), 'some user joinIsRequestSent');
            cleanUpData(onClomplete);
        });
    });

    Tinytest.addAsync('Universe Any Join - test callback - negative', function (test, onClomplete) {
        prepareData(function () {
            var testNo = 2;
            if (Meteor.isServer) {
                testNo = 3;
            }
            testCollection.attachAnyJoin('negative_tests', {
                canResign: function(joiningName, user, acceptor){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in canResign');
                    test.isTrue(_.isObject(user), 'check if is user in canResign');
                    test.isTrue(_.isObject(acceptor), 'check if is acceptor in canResign');
                    return false;
                },
                canChangePolicy: function(joiningName, user){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in canChangePolicy');
                    test.isTrue(_.isObject(user), 'check if is user');
                    return false;
                },
                canAcceptRequest: function(joiningName, acceptor){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in canAcceptRequest');
                    test.isTrue(_.isObject(acceptor), 'check if is acceptor in canAcceptRequest');
                    return false;
                },
                canSendRequest: function(joiningName, user){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in canSendRequest');
                    test.isTrue(_.isObject(user), 'check if is user in canSendRequest');
                    return false;
                },
                canSendInvitation: function(joiningName, user){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in canSendInvitation');
                    test.isTrue(_.isObject(user), 'check if is user in canSendInvitation');
                    return false;
                },
                canJoinDirectly: function(joiningName, userId){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in canJoinDirectly');
                    test.isTrue(_.isString(userId), 'check if is userId in canJoinDirectly');
                    return false;
                },
                isJoined: function(joiningName, userId){
                    test.equal(joiningName, 'negative_tests', 'check joiningName in isJoined');
                    test.isTrue(_.isString(userId), 'check if is userId in isJoined');
                    return false;
                }
            });
            var doc = testCollection.findOne({test: testNo});
            var user = UniUsers.findOne({username: 'test_anyjoin2'});
            test.isFalse(doc.joinIsJoined('negative_tests',user), 'callback - is joined');
            test.isFalse(doc.joinCanChangePolicy('negative_tests' ,user), 'callback - joinCanChangePolicy');
            test.isFalse(doc.joinCanChangePolicy('negative_tests',user), 'callback - joinCanChangePolicy');
            test.isFalse(doc.joinCanSendInvitation('negative_tests',user), 'callback - joinCanSendInvitation');
            test.isFalse(doc.joinCanAcceptRequest('negative_tests',user), 'callback - joinCanAcceptRequest');
            test.isFalse(doc.joinCanJoinDirectly('negative_tests',user), 'callback - joinCanJoinDirectly');
            test.isFalse(doc.joinCanSendRequest('negative_tests',user), 'callback - joinCanAcceptRequest');

            cleanUpData(onClomplete);
        });
    });

    Tinytest.addAsync('Universe Any Join - test callback - positive', function (test, onClomplete) {
        prepareData(function () {
            var testNo = 2;
            if (Meteor.isServer) {
                testNo = 3;
            }
            var isJoined = true;
            testCollection.attachAnyJoin('positive_tests', {
                canResign: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in canResign');
                    return true;
                },
                canChangePolicy: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in canChangePolicy');
                    return true;
                },
                canAcceptRequest: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in canAcceptRequest');
                    return true;
                },
                canSendRequest: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in canSendRequest');
                    return true;
                },
                canSendInvitation: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in canSendInvitation');
                    return true;
                },
                canJoinDirectly: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in canJoinDirectly');
                    return true;
                },
                isJoined: function(joiningName){
                    test.equal(joiningName, 'positive_tests', 'check joiningName in isJoined');
                    return isJoined;
                }
            });
            var doc = testCollection.findOne({test: testNo});
            var user = UniUsers.findOne({username: 'test_anyjoin2'});
            test.isTrue(doc.joinIsJoined('positive_tests',user), 'callback - is joined');
            test.isTrue(doc.joinCanResign('positive_tests', user, user), 'callback - joinCanResign');
            isJoined = false;
            test.isTrue(doc.joinCanChangePolicy('positive_tests',user), 'callback - joinCanChangePolicy');
            test.isTrue(doc.joinCanSendInvitation('positive_tests',user), 'callback - joinCanSendInvitation');
            test.isTrue(doc.joinCanAcceptRequest('positive_tests',user), 'callback - joinCanAcceptRequest');
            test.isTrue(doc.joinCanJoinDirectly('positive_tests',user), 'callback - joinCanJoinDirectly');
            test.isTrue(doc.joinCanSendRequest('positive_tests',user), 'callback - joinCanSendRequest');


            if(Meteor.isServer){
                var doc = testCollection.findOne({test: 1});
                var owner = UniUsers.findOne({username: 'test_anyjoin'});
                var admin = UniUsers.findOne({username: 'test_anyjoin_admin'});
                doc.ownerId = owner._id;
                doc.save('ownerId');
                var testedCallback = {
                    onInvitation: false,
                    onRequest: false,
                    onAcceptRequest: false,
                    onAcceptInvitation: false,
                    onJoin: false,
                    onResign: false
                };
                testCollection.attachAnyJoin('server_cb_tests', {
                    onInvitation: function(joiningName, UniAnyJoinDocument, toUser, originator){
                        test.equal(joiningName, 'server_cb_tests', 'check joiningName in onInvitation');
                        test.isTrue(UniAnyJoinDocument && UniAnyJoinDocument instanceof UniCollection.UniDoc, 'is doc instanceof UniCollection.UniDoc in onInvitation');
                        test.isTrue(_.isObject(toUser), 'check if is user in onInvitation');
                        test.isTrue(_.isObject(originator), 'check if is user in onInvitation');
                        testedCallback.onInvitation = true;
                    },
                    onRequest: function(joiningName, UniAnyJoinDocument, fromUser, originatorId){
                        test.equal(joiningName, 'server_cb_tests', 'check joiningName in onRequest');
                        test.isTrue(UniAnyJoinDocument && UniAnyJoinDocument instanceof UniCollection.UniDoc, 'is doc instanceof UniCollection.UniDoc in onRequest');
                        test.isTrue(_.isObject(fromUser), 'check if is user in onRequest');
                        test.isTrue(_.isString(originatorId), 'check if is user in onRequest');
                        testedCallback.onRequest = true;
                    },
                    onAcceptRequest: function(joiningName, UniAnyJoinDocument, fromUser, acceptor){
                        test.equal(joiningName, 'server_cb_tests', 'check joiningName in onAcceptRequest');
                        test.isTrue(UniAnyJoinDocument && UniAnyJoinDocument instanceof UniCollection.UniDoc, 'is doc instanceof UniCollection.UniDoc in onAcceptRequest');
                        test.isTrue(_.isObject(fromUser), 'check if is user in onAcceptRequest');
                        test.isTrue(_.isObject(acceptor), 'check if is user in onAcceptRequest');
                        testedCallback.onAcceptRequest = true;
                    },
                    onAcceptInvitation: function(joiningName, UniAnyJoinDocument, toUserId){
                        test.equal(joiningName, 'server_cb_tests', 'check joiningName in onAcceptInvitation');
                        test.isTrue(UniAnyJoinDocument && UniAnyJoinDocument instanceof UniCollection.UniDoc, 'is doc instanceof UniCollection.UniDoc in onAcceptInvitation');
                        test.isTrue(_.isString(toUserId), 'check if is user in onAcceptInvitation');
                        testedCallback.onAcceptInvitation = true;
                    },
                    onJoin: function(joiningName, UniAnyJoinDocument, userId){
                        test.equal(joiningName, 'server_cb_tests', 'check joiningName in onJoin');
                        test.isTrue(UniAnyJoinDocument && UniAnyJoinDocument instanceof UniCollection.UniDoc, 'is doc instanceof UniCollection.UniDoc in onJoin');
                        test.isTrue(_.isString(userId), 'check if is user in onJoin');
                        testedCallback.onJoin = true;
                    },
                    onResign: function(joiningName, UniAnyJoinDocument, user){
                        test.equal(joiningName, 'server_cb_tests', 'check joiningName in onResign');
                        test.isTrue(UniAnyJoinDocument && UniAnyJoinDocument instanceof UniCollection.UniDoc, 'is doc instanceof UniCollection.UniDoc in onResign');
                        test.isTrue(_.isObject(user), 'check if is user in onResign');
                        testedCallback.onResign = true;
                    },
                    canJoinDirectly: function(){
                        return true;
                    }
                });
                doc.joinChangePolicy('server_cb_tests',UniAnyJoin.TYPE_JOIN_REQUEST, owner);
                doc.joinSendInvitation('server_cb_tests',admin, owner);
                doc.joinAcceptInvitation('server_cb_tests',admin);
                doc.joinResign('server_cb_tests',admin, admin);
                doc.joinSendRequest('server_cb_tests', admin, admin);
                doc.joinAcceptRequest('server_cb_tests', admin, owner);
                doc.joinResign('server_cb_tests',admin, admin);
                doc.joinChangePolicy('server_cb_tests',UniAnyJoin.TYPE_JOIN_OPEN, owner);
                doc.join('server_cb_tests', admin);
                //Checking if all callback was called
                _.each(testedCallback, function(v, k){
                    test.isTrue(v, 'check '+k);
                });

            }
            cleanUpData(onClomplete);
        });
    });

    if(Meteor.isServer){
        Tinytest.addAsync('Universe Any Join - test helpers for owner @ server', function (test, onClomplete) {
            prepareData(function () {
                var doc = testCollection.findOne({test: 3});
                var owner = UniUsers.findOne({username: 'test_anyjoin'});
                var someUser = UniUsers.findOne({username: 'test_anyjoin2'});
                var admin = UniUsers.findOne({username: 'test_anyjoin_admin'});
                doc.ownerId = owner._id;
                doc.save('ownerId');
                //admin test
                test.isTrue(doc.joinCanChangePolicy('test',admin), 'owner joinCanChangePolicy');
                test.isTrue(doc.joinCanSendInvitation('test',admin), 'owner joinCanSendInvitation');
                test.isTrue(doc.joinCanAcceptRequest('test',admin), 'owner joinCanAcceptRequest');
                //owner test
                test.isTrue(doc.joinCanChangePolicy('test',owner), 'owner joinCanChangePolicy');
                test.isTrue(doc.joinCanSendInvitation('test',owner), 'owner joinCanSendInvitation');
                test.isTrue(doc.joinCanAcceptRequest('test',owner), 'owner joinCanAcceptRequest');

                doc.joinChangePolicy('test',UniAnyJoin.TYPE_JOIN_INVITATION, owner);
                test.equal(doc.joinGetPolicy('test'), UniAnyJoin.TYPE_JOIN_INVITATION, 'changing policy - join invitation');
                test.isTrue(doc.joinCanSendInvitation('test',owner), 'owner joinCanSendInvitation');
                test.isFalse(doc.joinCanSendInvitation('test',someUser), 'owner joinCanSendInvitation');
                test.isFalse(doc.joinCanAcceptRequest('test',someUser), 'someUser joinCanAcceptRequest');
                test.isFalse(doc.joinCanJoinDirectly('test',someUser), 'someUser joinCanJoinDirectly');
                test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                test.isTrue(isException(function(){
                    doc.join('test',someUser);
                }), 'someUser exception when try join');
                test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                doc.joinSendInvitation('test',someUser, owner);
                var lastJoiningDoc = doc.joinGetRow('test',someUser);
                test.equal(lastJoiningDoc.status, UniAnyJoin.STATUS_INVITED, 'someUser is invited by owner');
                doc.joinAcceptInvitation('test',someUser);
                test.isTrue(doc.joinIsJoined('test',someUser), 'is joined');
                doc.joinResign('test',someUser, owner);
                test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                //send request
                doc.joinChangePolicy('test',UniAnyJoin.TYPE_JOIN_REQUEST, admin);
                test.equal(doc.joinGetPolicy('test'), UniAnyJoin.TYPE_JOIN_REQUEST, 'changing policy - join request');
                doc.joinSendRequest('test',someUser, someUser);
                test.isFalse(doc.joinCanJoinDirectly('test',someUser), 'someUser joinCanJoinDirectly');
                test.isTrue(doc.joinIsRequestSent('test',someUser), 'is join request sent');
                test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                if(doc.joinCanResign('test',someUser, someUser)){
                    doc.joinResign('test',someUser, someUser);
                    test.isFalse(doc.joinIsRequestSent('test',someUser), 'is join request sent');
                } else{
                    try{
                        doc.joinResign('test',someUser, someUser);
                    } catch(e){}
                    test.isTrue(doc.joinIsRequestSent('test',someUser), 'is join request sent');
                }
                doc.joinResign('test',someUser, admin);
                test.isFalse(doc.joinIsRequestSent('test',someUser), 'is join request sent');

                //open to join
                doc.joinChangePolicy('test',UniAnyJoin.TYPE_JOIN_OPEN, owner);
                test.equal(doc.joinGetPolicy('test'), UniAnyJoin.TYPE_JOIN_OPEN, 'changing policy - open join');
                test.isTrue(doc.joinCanJoinDirectly('test',someUser), 'someUser joinCanJoinDirectly');
                doc.join('test',someUser);
                test.isTrue(doc.joinIsJoined('test',someUser), 'is joined');
                test.isTrue(doc.joinCanResign('test',admin, someUser), 'Admin can kick out some user');
                if(doc.joinCanResign('test',someUser, someUser)){
                    doc.joinResign('test',someUser, someUser);
                    test.isFalse(doc.joinIsJoined('test',someUser), 'is join request sent');
                } else{
                    try{
                        doc.joinResign('test',someUser, someUser);
                    } catch(e){}
                    test.isTrue(doc.joinIsJoined('test',someUser), 'is joined');
                }
                cleanUpData(onClomplete);
            });
        });
    } else { // client side
        Tinytest.addAsync('Universe Any Join - test helpers for owner @ client', function (test, onClomplete) {
            prepareData(function () {
                var doc = testCollection.findOne({test: 3});
                var owner = UniUsers.findOne({username: 'test_anyjoin'});
                var someUser = UniUsers.findOne({username: 'test_anyjoin2'});
                var admin = UniUsers.findOne({username: 'test_anyjoin_admin'});
                doc.ownerId = owner._id;
                doc.save('ownerId');

                var onErr = function(err, message){
                    if(!message){
                        message = '';
                    } else {
                        message =  ' - in  '+ message;
                    }
                    if(err){
                        test.isUndefined(err, (err.reason || err.message) + message);
                        cleanUpData(onClomplete, err);
                        console.error(err.message || err);
                        throw err;
                    }
                };

                //admin test
                test.isTrue(doc.joinCanChangePolicy('test',admin), 'owner joinCanChangePolicy');
                test.isTrue(doc.joinCanSendInvitation('test',admin), 'owner joinCanSendInvitation');
                test.isTrue(doc.joinCanAcceptRequest('test',admin), 'owner joinCanAcceptRequest');
                //owner test
                test.isTrue(doc.joinCanChangePolicy('test',owner), 'owner joinCanChangePolicy');
                test.isTrue(doc.joinCanSendInvitation('test',owner), 'owner joinCanSendInvitation');
                test.isTrue(doc.joinCanAcceptRequest('test',owner), 'owner joinCanAcceptRequest');


                doc.joinChangePolicy('test',UniAnyJoin.TYPE_JOIN_INVITATION, function(err){
                    onErr(err, 'joinChangePolicy TYPE_JOIN_INVITATION');
                    doc.refresh();
                    test.equal(doc.joinGetPolicy('test'), UniAnyJoin.TYPE_JOIN_INVITATION, 'changing policy - join invitation');
                    test.isTrue(doc.joinCanSendInvitation('test',owner), 'owner joinCanSendInvitation');
                    test.isFalse(doc.joinCanSendInvitation('test',someUser), 'owner joinCanSendInvitation');
                    test.isFalse(doc.joinCanAcceptRequest('test',someUser), 'someUser joinCanAcceptRequest');
                    test.isFalse(doc.joinCanJoinDirectly('test',someUser), 'someUser joinCanJoinDirectly');
                    test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                    test.isTrue(_.isObject(someUser), 'Object of some user');
                    doc.joinSendInvitation('test',someUser, function(err){
                        onErr(err, 'joinSendInvitation');
                        doc.refresh();
                        var lastJoiningDoc = doc.joinGetRow('test',someUser);
                        test.equal(lastJoiningDoc.status, UniAnyJoin.STATUS_INVITED, 'someUser is invited by owner');
                        doc.refresh();
                        relog('someUser');
                        doc.joinAcceptInvitation('test',function(err){
                            onErr(err, 'joinAcceptInvitation');
                            doc.refresh();
                            test.isTrue(doc.joinIsJoined('test',someUser), 'is joined');
                            doc.joinResign('test',someUser, function(err){
                                onErr(err, 'joinResign');
                                relog('owner');
                                doc.refresh();
                                test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                                doc.joinChangePolicy('test',UniAnyJoin.TYPE_JOIN_REQUEST, function(err){
                                    onErr(err, 'joinChangePolicy TYPE_JOIN_REQUEST');
                                    doc.refresh();
                                    test.equal(doc.joinGetPolicy('test'), UniAnyJoin.TYPE_JOIN_REQUEST, 'changing policy - join request');
                                    relog('someUser');
                                    doc.joinSendRequest('test',function(err){
                                        onErr(err, 'joinSendRequest');
                                        doc.refresh();
                                        test.isFalse(doc.joinCanJoinDirectly('test',someUser), 'someUser joinCanJoinDirectly');
                                        test.isTrue(doc.joinIsRequestSent('test',someUser), 'is join request sent');
                                        test.isFalse(doc.joinIsJoined('test',someUser), 'isn\'t joined');
                                        relog('admin');
                                        doc.joinResign('test',someUser, function(err){
                                            onErr(err, 'joinResign');
                                            doc.refresh();
                                            test.isFalse(doc.joinIsRequestSent('test',someUser), 'is join request sent');
                                            doc.joinChangePolicy('test',UniAnyJoin.TYPE_JOIN_OPEN, function(err){
                                                onErr(err, 'joinChangePolicy TYPE_JOIN_OPEN');
                                                relog('someUser');
                                                doc.refresh();
                                                test.equal(doc.joinGetPolicy('test'), UniAnyJoin.TYPE_JOIN_OPEN, 'changing policy - open join');
                                                test.isTrue(doc.joinCanJoinDirectly('test',someUser), 'someUser joinCanJoinDirectly');
                                                doc.join('test',function(err){
                                                    onErr(err, 'join');
                                                    doc.refresh();
                                                    test.isTrue(doc.joinIsJoined('test',someUser), 'is joined');
                                                    cleanUpData(onClomplete);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });

                    });
                });
            },'owner');
        });

    }

});


var isException = function(cb){
    try{
        cb();
    } catch(e) {
        return true;
    }
    return false;
};