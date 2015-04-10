'use strict';

Template.uniAnyJoinButton.onCreated(function(){
    var data = findSubjectIdAndName(this);
    if(!data.joiningName){
        console.error('Missing joiningName in data context!');
    }
    if(!data.subjectId){
        console.error('Missing subjectId in data context!');
    }
    if(!data.isSubject && !data.subjectName){
        console.error('Missing subjectName in data context!');
    }
    this.subscribe('uniAnyJoin', data.subjectId, data.subjectName);
});

Template.uniAnyJoinButton.helpers({
    getSubject: function(){
        var data = findSubjectIdAndName(Template.instance());
        var collection = UniAnyJoin.getSubjectCollection(data.subjectName);
        if(!data.subjectId || !collection ||!data.joiningName){
            return;
        }
        return collection.findOne(data.subjectId);
    },
    getCurrentPolicy: function(){
        var data = findSubjectIdAndName(Template.instance());
        return this.joinGetPolicy(data.joiningName);
    },
    isRequestSent: function(){
        var data = findSubjectIdAndName(Template.instance());
        return this.joinIsRequestSent(data.joiningName);
    },
    getJoiningName: function(){
        var data = findSubjectIdAndName(Template.instance());
        return data.joiningName;
    }
});

var _cb = function(err){
    if(err){
        if(typeof UniUI === 'object'){
            UniUI.setErrorMessage('header', err.reason || err.message);
        }
        console.error(err);
    }
};
Template.uniAnyJoinButton.events({
    'click .js-uaj-accept-invitation': function(e, tmpl){
        var data = findSubjectIdAndName(tmpl);
        this.joinAcceptInvitation(data.joiningName, _cb);
    },
    'click .js-uaj-send-request': function(e, tmpl){
        var data = findSubjectIdAndName(tmpl);
        this.joinSendRequest(data.joiningName, UniUsers.getLoggedIn(), _cb);
    },
    'click .js-uaj-join': function(e, tmpl){
        var data = findSubjectIdAndName(tmpl);
        this.join(data.joiningName, _cb);
    },
    'click .js-uaj-leave': function(e, tmpl){
        var data = findSubjectIdAndName(tmpl);
        this.joinResign(data.joiningName, UniUsers.getLoggedIn(), _cb);
    }
});


var findSubjectIdAndName = function(tmpl){
    tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinButton', tmpl);
    var subjectId = UniUtils.get(tmpl, 'data.subjectId');
    var subjectName = UniUtils.get(tmpl, 'data.subjectName');
    var joiningName = UniUtils.get(tmpl, 'data.joiningName');
    var isSubject = false;
    if(!subjectId){
        subjectId = UniUtils.get(tmpl, 'data._id');
        var getColl = UniUtils.get(tmpl, 'data.getCollection');
        if(_.isFunction(getColl)){
            subjectName = getColl()._name;
        }
        isSubject = true;
    }
    return {
        subjectId: subjectId,
        subjectName: subjectName,
        joiningName: joiningName,
        isSubject: isSubject
    };
};

Template.registerHelper('UniAnyJoin', function(){
    return UniAnyJoin;
});