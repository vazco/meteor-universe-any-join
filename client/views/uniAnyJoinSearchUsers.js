'use strict';

Template.uniAnyJoinSearchUsers.onCreated(function(){
    var joiningName = UniUtils.get(this, 'data.joiningName');
    var subjectId = UniUtils.get(this, 'data.subjectId');
    var subjectName = UniUtils.get(this, 'data.subjectName');
    if(!joiningName || !subjectId || !subjectName){
        console.error('Missing one or more template parameters: joiningName, subjectId, subjectName!');
        return;
    }
    this.subscribe('uniAnyJoinUsersToAccept', joiningName, subjectId, subjectName);
    this.subscribeHandler = null;
    this.term = new ReactiveVar();
    this.view.onViewDestroyed(function(){
        if(this.subscribeHandler){
            this.subscribeHandler.stop();
        }
    });
});

var _autoSearchTimer;
Template.uniAnyJoinSearchUsersInput.events({
    'keyup .js-any-join-search-users': function (e, tmpl){
        e.stopPropagation();
        tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinSearchUsers', tmpl);
        var joiningName = UniUtils.get(tmpl, 'data.joiningName');
        var subjectId = UniUtils.get(tmpl, 'data.subjectId');
        var subjectName = UniUtils.get(tmpl, 'data.subjectName');
        var subFn = function(term){
            if(tmpl.subscribeHandler){
                tmpl.subscribeHandler.stop();
            }
            tmpl.subscribeHandler = Meteor.subscribe('uniAnyJoinSearchUsers', term, joiningName, subjectId, subjectName);
            tmpl.term.set(term);
        };
        if(_autoSearchTimer){
            Meteor.clearTimeout(_autoSearchTimer);
        }
        var el = $(e.target);
        if(e.keyCode === 13){
            subFn(el.val());
            return;
        }
        _autoSearchTimer = Meteor.setTimeout(function(){
            subFn(el.val());
        }, 1000);
    }
});


Template.uniAnyJoinSearchUsers.helpers({
    getSubject: function(){
        var tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinSearchUsers');
        var subjectName = UniUtils.get(tmpl, 'data.subjectName');
        var subjectId = UniUtils.get(tmpl, 'data.subjectId');
        if(!subjectName || !subjectId){
            return;
        }

        var col = UniAnyJoin.getSubjectCollection(subjectName);
        return col.findOne({_id: subjectId});
    },
    getUsers: function(){
        var tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinSearchUsers');
        var term = tmpl.term.get();
        if(!tmpl.term || !term){
            return;
        }
        return UniUsers.find({'profile.name': UniUtils.getInSensitiveRegExpForTerm(term)});
    }
});

var getAnyJoinEntry = function(tmpl, user){
    var joiningName = UniUtils.get(tmpl, 'data.joiningName');
    var subjectId = UniUtils.get(tmpl, 'data.subjectId');
    return UniAnyJoin.findOne({$and:[
        {joiningName: joiningName},
        {subjectId: subjectId},
        {possessorId: user._id}
    ]}, {sort: {createdAt: -1}});
};

Template.uniAnyJoinSearchUsersResultItem.helpers({
    isAvatarViewExists: function(){
        return !!Template['uniUserAvatar'];
    },
    getAnyJoinEntry: function(){
        var tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinSearchUsers');
        var ajEntry = getAnyJoinEntry(tmpl, this);
        if(!ajEntry){
            return;
        }
        return ajEntry;
    },
    isRequested: function(){
        return this.status === UniAnyJoin.STATUS_REQUESTED;
    },
    canBeInvited: function(){
        var tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinSearchUsers');
        var subjectName = UniUtils.get(tmpl, 'data.subjectName');
        var subjectId = UniUtils.get(tmpl, 'data.subjectId');
        var joiningName = UniUtils.get(tmpl, 'data.joiningName');
        if(!subjectName || !subjectId || !joiningName){
            return;
        }
        var col = UniAnyJoin.getSubjectCollection(subjectName);
        var subject = col.findOne({_id: subjectId});
        return subject.joinCanSendInvitation(joiningName);
    }
});

Template.uniAnyJoinSearchUsersResultItem.events({
    'click .js-uni-any-join-accept-request': function(e, tmpl){
        var user = UniUsers.ensureUniDoc(tmpl.data.user);
        if(!this.joiningName){
            console.error('Missing joining name in context');
            return;
        }
        var subject = this.getSubject();
        subject.joinAcceptRequest(this.joiningName, user, function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                } else {
                    console.error(err.reason || err.message);
                }
            }
        });
    },
    'click .js-uni-any-join-resign': function(e, tmpl){
        var user = UniUsers.ensureUniDoc(tmpl.data.user);
        if(!this.joiningName){
            console.error('Missing joining name in context');
            return;
        }
        var subject = this.getSubject();
        subject.joinResign(this.joiningName, user, function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                }else {
                    console.error(err.reason || err.message);
                }
            }
        });
    },
    'click .js-uni-any-join-invite': function(e, tml){
        var user = UniUsers.ensureUniDoc(tml.data.user);
        var tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinSearchUsers', tml);
        var subjectName = UniUtils.get(tmpl, 'data.subjectName');
        var subjectId = UniUtils.get(tmpl, 'data.subjectId');
        var joiningName = UniUtils.get(tmpl, 'data.joiningName');
        if(!subjectName || !subjectId || !joiningName){
            return;
        }
        var col = UniAnyJoin.getSubjectCollection(subjectName);
        var subject = col.findOne({_id: subjectId});
        subject.joinSendInvitation(joiningName, user, function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                }else {
                    console.error(err.reason || err.message);
                }
            }
        });
    }
});