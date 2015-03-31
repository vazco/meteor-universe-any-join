'use strict';

UniCollection.publish('uniAnyJoin', function(subjectId, subjectName){
    if(!subjectId || !UniUsers.getLoggedInId()){
        this.ready();
    }
    if(subjectName && UniAnyJoin.getSubjectCollection(subjectName)){
        this.setMappings(UniAnyJoin,[
            {
                key: 'subjectId',
                collection: UniAnyJoin.getSubjectCollection(subjectName)

            }
        ]);
    }
    return UniAnyJoin.find({
        subjectId: subjectId,
        possessorId: UniUsers.getLoggedInId()
    });
});


