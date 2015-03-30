'use strict';

Template.uniAnyJoinButton.onCreated(function(){
    var data = findSubjectIdAndName(this);
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
        if(!data.subjectId || !collection){
            return;
        }
        return collection.findOne(data.subjectId);
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
    'click .js-uaj-accept-invitation': function(){
        this.acceptJoinInvitation(_cb);
    },
    'click .js-uaj-send-request': function(){
        this.sendJoinRequest(UniUsers.getLoggedIn(), _cb);
    },
    'click .js-uaj-join': function(){
        this.join(_cb);
    },
    'click .js-uaj-leave': function(){
        this.leaveJoinedSubject(UniUsers.getLoggedIn(), _cb);
    }
});


var findSubjectIdAndName = function(tmpl){
    tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinButton', tmpl);
    var subjectId = UniUtils.get(tmpl, 'data.subjectId');
    var subjectName = UniUtils.get(tmpl, 'data.subjectName');
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
        isSubject: isSubject
    };
};

Template.registerHelper('UniAnyJoin', function(){
    return UniAnyJoin;
});