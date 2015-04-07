'use strict';


Template.uniAnyJoinPossessorsList.onCreated(function(){
    var joiningName = UniUtils.get(this, 'data.joiningName');
    var subjectId = UniUtils.get(this, 'data.subjectId');
    var subjectName = UniUtils.get(this, 'data.subjectName');
    if(!joiningName || !subjectId || !subjectName){
        console.error('Missing one or more template parameters: joiningName, subjectId, subjectName!');
        return;
    }
    this.subscribe('uniAnyJoinUsersToAccept', joiningName, subjectId, subjectName);
});

Template.uniAnyJoinPossessorsList.helpers({
    getPossessors: function(){
        var tmpl = UniUtils.getParentTemplateInstance('uniAnyJoinPossessorsList');
        return UniAnyJoin.find({$and:[
            {subjectId: tmpl.data.subjectId},
            {$or: [{status: UniAnyJoin.STATUS_INVITED}, {status: UniAnyJoin.STATUS_REQUESTED}]}
        ]}).map(function(doc){
            var user = doc.getPossessorOfEntry();
            if(user){
                user._joiningEntry = doc;
            }
            return user;
        });
    }
});

Template.uniAnyJoinPossessorItem.helpers({
    isAvatarViewExists: function(){
        return !!Template['uniUserAvatar'];
    }
});

Template.uniAnyJoinPossessorItem.events({
    'click .js-uni-any-join-accept-request': function(){
        UniUsers.ensureUniDoc(this);
        if(!this._joiningEntry){
            console.error('Missing joining entry in context');
            return;
        }
        var joiningName = this._joiningEntry.joiningName;
        var subject = this._joiningEntry.getSubject();
        subject.joinAcceptRequest(joiningName, this, function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                }
            }
        });
    },
    'click .js-uni-any-join-resign': function(){
        UniUsers.ensureUniDoc(this);
        if(!this._joiningEntry){
            console.error('Missing joining entry in context');
            return;
        }
        var joiningName = this._joiningEntry.joiningName;
        var subject = this._joiningEntry.getSubject();
        subject.joinResign(joiningName, this, function(err){
            if(err){
                if(typeof UniUI !== 'undefined'){
                    UniUI.setErrorMessage('header', err.reason || err.message);
                }
            }
        });
    }
});

