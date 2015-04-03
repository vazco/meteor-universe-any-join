'use strict';

Package.describe({
    name: 'vazco:universe-any-join',
    summary: 'join to any document',
    version: '1.0.0'
});

var apiUseCommon = [
    'underscore',
    'check',
    'vazco:universe-utilities@1.0.4',
    'vazco:universe-collection@1.0.6',
    'vazco:universe-access@1.1.3',
    'aldeed:simple-schema@1.3.2',
    'aldeed:collection2@2.3.3',
    'anti:i18n'
];

Package.onUse(function (api) {
    api.versionsFrom('METEOR@1.0.4');

    api.use(apiUseCommon);

    api.use([
        'templating'
    ], 'client');


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
        'client/views/uniAnyJoinButton.html',
        'client/views/uniAnyJoinButton.js'
    ], 'client');


    api.export('UniAnyJoin');
});

Package.onTest(function (api) {
    api.versionsFrom('1.0.4');
    api.use('tinytest');
    api.use('test-helpers');
    api.use('accounts-base');
    api.use(apiUseCommon);

    api.use([
        'templating'
    ], 'client');

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
        'client/views/uniAnyJoinButton.html',
        'client/views/uniAnyJoinButton.js'
    ], 'client');
    api.export('UniAnyJoin');

    api.imply([
        'vazco:universe-collection@1.0.6',
        'vazco:universe-utilities@1.0.4',
        'accounts-base'
    ]);
    api.addFiles('tests/both.js');
});