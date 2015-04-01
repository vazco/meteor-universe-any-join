'use strict';

Package.describe({
    name: 'vazco:universe-any-join',
    summary: 'join to any document',
    version: '0.0.1'
});

Package.onUse(function (api) {
    api.versionsFrom('1.0.4');

    api.use([
        'underscore',
        'check',
        'aldeed:simple-schema@1.3.0',
        'aldeed:collection2@2.3.2',
        'vazco:universe-utilities@1.0.2',
        'vazco:universe-collection@1.0.1',
        'vazco:universe-access@1.0.5',
        'anti:i18n'
    ]);

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
    api.use([
        'underscore',
        'check',
        'aldeed:simple-schema@1.3.0',
        'aldeed:collection2@2.3.2',
        'vazco:universe-utilities@1.0.2',
        'vazco:universe-collection@1.0.1',
        'vazco:universe-access@1.0.5',
        'anti:i18n'
    ]);


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
        'vazco:universe-collection@1.0.1',
        'vazco:universe-utilities@1.0.2',
        'accounts-base'
    ]);
    api.addFiles('tests/both.js');
});