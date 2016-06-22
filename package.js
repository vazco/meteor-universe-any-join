'use strict';

Package.describe({
    name: 'vazco:universe-any-join',
    summary: 'Add functionality of join to any universe document for users, by invitation, request, open to join',
    version: '1.2.0',
    git: 'https://github.com/vazco/meteor-universe-any-join'
});

var apiUseCommon = [
    'underscore',
    'check',
    'templating',
    'less@2.5.0_2',
    'universe:utilities@2.0.7',
    'universe:utilities-blaze@1.5.0',
    'universe:collection@2.0.4',
    'universe:i18n',
    'ecmascript'
];

Package.onUse(function (api) {
    api.versionsFrom('METEOR@1.1.0.3');

    api.use(apiUseCommon);

    api.use('vazco:universe-ui@0.6.2', 'client', {weak: true});

    api.add_files([
        'UniAnyJoin.js',
        'UniCollectionExtension.js',
        'localization/en.js'
    ]);

    api.add_files([
        'server/publication.js',
        'server/actions.js'
    ], 'server');

    api.add_files([
        'client/actions.js',
        'client/views/styles.less',
        'client/views/uniAnyJoinButton.html',
        'client/views/uniAnyJoinButton.js',
        'client/views/uniAnyJoinPossessorsList.html',
        'client/views/uniAnyJoinPossessorsList.js',
        'client/views/uniAnyJoinSearchUsers.html',
        'client/views/uniAnyJoinSearchUsers.js',
        'client/views/uniAnyJoinInvitations.html',
        'client/views/uniAnyJoinInvitations.js'
    ], 'client');


    api.export('UniAnyJoin');
});

Package.onTest(function (api) {
    /*
    api.versionsFrom('1.1.0.3');
    api.use([
        'meteor',
        'es5-shim',
        'mongo',
        'minimongo',
        'underscore',
        'tinytest',
        'test-helpers',
        'accounts-base',
        'aldeed:simple-schema',
        'vazco:universe-any-join'
    ]);
    api.addFiles('tests/both.js');
    */
});
