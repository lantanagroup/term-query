#! /usr/bin/env node

var rxnorm = require('./rxnorm');
var snomed = require('./snomed');

var argv = require('yargs')
    .command(rxnorm)
    .command(snomed)
    .command('medications', 'Creates a medications list using default options for rxnorm command', {}, function() {
        var options = {
            'tty': 'SBD',
            'output': 'medications.xlsx'
        };
        rxnorm.handler(options);
    })
    .command('allergies', 'Creates an allergies list using default options for rxnorm command', {}, function() {
        var options = {
            'tty': 'IN+PIN',
            'brands': true,
            'classes': false,
            'output': 'allergies.xlsx'
        };
        rxnorm.handler(options);
    })
    .command('bodySite', 'Creates a bodySite list using default options for snomed command', {}, function() {
        var options = {
            'limit': snomed.builder.limit.default,
            'version': snomed.builder.version.default,
            'edition': snomed.builder.edition.default,
            'replace': snomed.builder.replace.default,
            'expression': ['< 91723000 | Anatomical structure (body structure) |'],
            'output': 'bodySite.xlsx'
        };
        snomed.handler(options);
    })
    .command('problems', 'Creates a problems list using default options for snomed command', {}, function() {
        var options = {
            'limit': snomed.builder.limit.default,
            'version': snomed.builder.version.default,
            'edition': snomed.builder.edition.default,
            'replace': snomed.builder.replace.default,
            'expression': [
                '< 243796009 | Situation with explicit context (situation) |',
                '< 404684003 | Clinical finding (finding) |',
            ],
            'output': 'problems.xlsx'
        };
        snomed.handler(options);
    })
    .demand(1)
    .strict()
    .help()
    .argv;