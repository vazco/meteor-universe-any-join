'use strict';

Template.uniAnyJoinInvitations.onCreated(function(){
    this.subscribe('uniAnyJoinMyInvitations');
});

Template.uniAnyJoinInvitations.helpers({
    getInvitations: function(){
        return UniAnyJoin.find({
            possessorId: UniUsers.getLoggedInId(),
            status: UniAnyJoin.STATUS_INVITED
        });
    }
});

Template.uniAnyJoinInvitationsItem.helpers({
    getSubjectTitle: function(){
        var subject = this.getSubject();
        return subject.name || subject.title;
    }
});

Template.uniAnyJoinInvitationsItem.events({
    'click .js-uni-any-join-accept-invitation': function(){
        var subject = this.getSubject();
        subject.joinAcceptInvitation(this.joiningName, function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                }
            }
        });
    },
    'click .js-uni-any-join-resign': function(){
        var subject = this.getSubject();
        subject.joinResign(this.joiningName, UniUsers.getLoggedIn(), function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                }
            }
        });
    }
});