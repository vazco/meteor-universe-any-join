'use strict';

UniCollection.publish('uniAnyJoin', function(subjectId, subjectName){
    if(!subjectId || !UniUsers.getLoggedInId()){
        this.ready();
    }
    if(subjectName && UniAnyJoin._collection[subjectName]){
        this.mappings(UniAnyJoin,[
            {
                key: 'subjectId',
                collection: UniAnyJoin._collection[subjectName]

            }
        ]);
    }
    return UniAnyJoin.find({
        subjectId: subjectId,
        possessorId: UniUsers.getLoggedInId()
    });
});


