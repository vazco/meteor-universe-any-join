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
        'vazco:universe-utilities@1.0.2',
        'vazco:universe-collection@1.0.0',
        'vazco:universe-access@1.0.5',
        'matb33:collection-hooks@0.7.11',
        'anti:i18n'
    ]);

    api.use([
        'templating'
    ], 'client');


    api.add_files([
        'UniAnyJoin.js',
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