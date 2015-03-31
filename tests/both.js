'use strict';

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
                profile: {name: 'test anyjoin2'}
            });
            UniUsers.insert({
                username: 'test_anyjoin',
                emails: [{address: 'test_anyjoin@test_anyjoin.vazco'}],
                profile: {name: 'test anyjoin'}
            });
            UniUsers.insert({
                username: 'test_anyjoin_admin',
                emails: [{address: 'test_anyjoin3@test_anyjoin.vazco'}],
                profile: {name: 'test admin'},
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

Meteor.call('test_anyjoin_cleanup', function(){
    Tinytest.add('Universe Any Join - instances', function (test) {
        UniAnyJoin.addJoinFunctionalityToCollection(testCollection);
        test.instanceOf(UniAnyJoin.getSubjectCollection(testCollection._name), UniCollection);
        test.instanceOf(UniAnyJoin, UniCollection);
    });

    Tinytest.addAsync('Universe Any Join - attach helpers', function (test, onComplete) {
        prepareData(function(){
            var doc = testCollection.findOne({test:1});
            test.isTrue(_.isObject(doc), 'document "test:1" exist');
            _.each([
                'getJoiningRow', 'isJoined', 'canJoinDirectly', 'canSendJoinInvitation',
                'canSendJoinRequest', 'canAcceptJoinRequest', 'canChangeJoinPolicy', 'getJoinPolicy',
                'isUserInvitedToJoin', 'isJoinRequestSent', 'canLeaveUser', 'sendJoinInvitation', 'sendJoinRequest',
                'acceptJoinRequest', 'acceptJoinInvitation', 'join', 'changeJoinPolicy', 'leaveJoinedSubject'
            ], function(m){
                test.isTrue(_.isFunction(doc[m]), 'document helper exists');
            });
            test.isFalse(doc.getJoiningRow(), 'document "test:1" exist');
            test.isFalse(doc.isJoined(), 'document "test:1" not joined');
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
            test.isFalse(doc.isJoined(user), 'document "test:' + testNo + '" not joined user');
            test.isTrue(_.isString(doc.getJoinPolicy()), 'get Join Policy');
            test.isFalse(doc.canChangeJoinPolicy(user), 'some user canChangeJoinPolicy');
            test.isFalse(doc.canSendJoinInvitation(user), 'some user canSendJoinInvitation');
            test.isFalse(doc.canAcceptJoinRequest(user), 'some user canAcceptJoinRequest');
            test.isFalse(doc.isUserInvitedToJoin(user), 'some user isUserInvitedToJoin');
            test.isFalse(doc.isJoinRequestSent(user), 'some user isJoinRequestSent');
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
                test.isTrue(doc.canChangeJoinPolicy(admin), 'owner canChangeJoinPolicy');
                test.isTrue(doc.canSendJoinInvitation(admin), 'owner canSendJoinInvitation');
                test.isTrue(doc.canAcceptJoinRequest(admin), 'owner canAcceptJoinRequest');
                //owner test
                test.isTrue(doc.canChangeJoinPolicy(owner), 'owner canChangeJoinPolicy');
                test.isTrue(doc.canSendJoinInvitation(owner), 'owner canSendJoinInvitation');
                test.isTrue(doc.canAcceptJoinRequest(owner), 'owner canAcceptJoinRequest');

                doc.changeJoinPolicy(UniAnyJoin.TYPE_JOIN_INVITATION, owner);
                test.equal(doc.getJoinPolicy(), UniAnyJoin.TYPE_JOIN_INVITATION, 'changing policy - join invitation');
                test.isTrue(doc.canSendJoinInvitation(owner), 'owner canSendJoinInvitation');
                test.isFalse(doc.canSendJoinInvitation(someUser), 'owner canSendJoinInvitation');
                test.isFalse(doc.canAcceptJoinRequest(someUser), 'someUser canAcceptJoinRequest');
                test.isFalse(doc.canJoinDirectly(someUser), 'someUser canJoinDirectly');
                test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                test.isTrue(isException(function(){
                    doc.join(someUser);
                }), 'someUser exception when try join');
                test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                doc.sendJoinInvitation(someUser, owner);
                var lastJoiningDoc = doc.getJoiningRow(someUser);
                test.equal(lastJoiningDoc.status, UniAnyJoin.STATUS_INVITED, 'someUser is invited by owner');
                doc.acceptJoinInvitation(someUser);
                test.isTrue(doc.isJoined(someUser), 'is joined');
                doc.leaveJoinedSubject(someUser, owner);
                test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                //send request
                doc.changeJoinPolicy(UniAnyJoin.TYPE_JOIN_REQUEST, admin);
                test.equal(doc.getJoinPolicy(), UniAnyJoin.TYPE_JOIN_REQUEST, 'changing policy - join request');
                doc.sendJoinRequest(someUser, someUser);
                test.isFalse(doc.canJoinDirectly(someUser), 'someUser canJoinDirectly');
                test.isTrue(doc.isJoinRequestSent(someUser), 'is join request sent');
                test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                if(doc.canLeaveUser(someUser, someUser)){
                    doc.leaveJoinedSubject(someUser, someUser);
                    test.isFalse(doc.isJoinRequestSent(someUser), 'is join request sent');
                } else{
                    try{
                        doc.leaveJoinedSubject(someUser, someUser);
                    } catch(e){}
                    test.isTrue(doc.isJoinRequestSent(someUser), 'is join request sent');
                }
                doc.leaveJoinedSubject(someUser, admin);
                test.isFalse(doc.isJoinRequestSent(someUser), 'is join request sent');

                //open to join
                doc.changeJoinPolicy(UniAnyJoin.TYPE_JOIN_OPEN, owner);
                test.equal(doc.getJoinPolicy(), UniAnyJoin.TYPE_JOIN_OPEN, 'changing policy - open join');
                test.isTrue(doc.canJoinDirectly(someUser), 'someUser canJoinDirectly');
                doc.join(someUser);
                test.isTrue(doc.isJoined(someUser), 'is joined');
                test.isTrue(doc.canLeaveUser(admin, someUser), 'Admin can kick out some user');
                if(doc.canLeaveUser(someUser, someUser)){
                    doc.leaveJoinedSubject(someUser, someUser);
                    test.isFalse(doc.isJoined(someUser), 'is join request sent');
                } else{
                    try{
                        doc.leaveJoinedSubject(someUser, someUser);
                    } catch(e){}
                    test.isTrue(doc.isJoined(someUser), 'is joined');
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
                //admin test
                test.isTrue(doc.canChangeJoinPolicy(admin), 'owner canChangeJoinPolicy');
                test.isTrue(doc.canSendJoinInvitation(admin), 'owner canSendJoinInvitation');
                test.isTrue(doc.canAcceptJoinRequest(admin), 'owner canAcceptJoinRequest');
                //owner test
                test.isTrue(doc.canChangeJoinPolicy(owner), 'owner canChangeJoinPolicy');
                test.isTrue(doc.canSendJoinInvitation(owner), 'owner canSendJoinInvitation');
                test.isTrue(doc.canAcceptJoinRequest(owner), 'owner canAcceptJoinRequest');


                doc.changeJoinPolicy(UniAnyJoin.TYPE_JOIN_INVITATION, function(err){
                    onErr(err, 'changeJoinPolicy TYPE_JOIN_INVITATION');
                    doc.refresh();
                    test.equal(doc.getJoinPolicy(), UniAnyJoin.TYPE_JOIN_INVITATION, 'changing policy - join invitation');
                    test.isTrue(doc.canSendJoinInvitation(owner), 'owner canSendJoinInvitation');
                    test.isFalse(doc.canSendJoinInvitation(someUser), 'owner canSendJoinInvitation');
                    test.isFalse(doc.canAcceptJoinRequest(someUser), 'someUser canAcceptJoinRequest');
                    test.isFalse(doc.canJoinDirectly(someUser), 'someUser canJoinDirectly');
                    test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                    test.isTrue(_.isObject(someUser), 'Object of some user');
                    doc.sendJoinInvitation(someUser, function(err){
                        onErr(err, 'sendJoinInvitation');
                        doc.refresh();
                        var lastJoiningDoc = doc.getJoiningRow(someUser);
                        test.equal(lastJoiningDoc.status, UniAnyJoin.STATUS_INVITED, 'someUser is invited by owner');
                        doc.refresh();
                        relog('someUser');
                        doc.acceptJoinInvitation(function(err){
                            onErr(err, 'acceptJoinInvitation');
                            doc.refresh();
                            test.isTrue(doc.isJoined(someUser), 'is joined');
                            doc.leaveJoinedSubject(someUser, function(err){
                                onErr(err, 'leaveJoinedSubject');
                                relog('owner');
                                doc.refresh();
                                test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                                doc.changeJoinPolicy(UniAnyJoin.TYPE_JOIN_REQUEST, function(err){
                                    onErr(err, 'changeJoinPolicy TYPE_JOIN_REQUEST');
                                    doc.refresh();
                                    test.equal(doc.getJoinPolicy(), UniAnyJoin.TYPE_JOIN_REQUEST, 'changing policy - join request');
                                    relog('someUser');
                                    doc.sendJoinRequest(function(err){
                                        onErr(err, 'sendJoinRequest');
                                        doc.refresh();
                                        test.isFalse(doc.canJoinDirectly(someUser), 'someUser canJoinDirectly');
                                        test.isTrue(doc.isJoinRequestSent(someUser), 'is join request sent');
                                        test.isFalse(doc.isJoined(someUser), 'isn\'t joined');
                                        relog('admin');
                                        doc.leaveJoinedSubject(someUser, function(err){
                                            onErr(err, 'leaveJoinedSubject');
                                            doc.refresh();
                                            test.isFalse(doc.isJoinRequestSent(someUser), 'is join request sent');
                                            doc.changeJoinPolicy(UniAnyJoin.TYPE_JOIN_OPEN, function(err){
                                                onErr(err, 'changeJoinPolicy TYPE_JOIN_OPEN');
                                                relog('someUser');
                                                doc.refresh();
                                                test.equal(doc.getJoinPolicy(), UniAnyJoin.TYPE_JOIN_OPEN, 'changing policy - open join');
                                                test.isTrue(doc.canJoinDirectly(someUser), 'someUser canJoinDirectly');
                                                doc.join(function(err){
                                                    onErr(err, 'join');
                                                    doc.refresh();
                                                    test.isTrue(doc.isJoined(someUser), 'is joined');
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