var createExcel = require('./createExcel');
var limit = require("simple-rate-limiter");
var requestOG = limit(require("request")).to(100).per(1000);
var _ = require('underscore');
var Q = require('q');
var fs = require('fs');

exports.command = 'snomed';

exports.describe = 'Queries Snomed-CT using custom options';

exports.builder = {
    'limit': {
        alias: 'l',
        describe: 'Limits the results returned from the query',
        number: true,
        default: 1000
    },
    'expression': {
        alias: 'x',
        array: true,
        describe: 'The expression to run against the SNOMED-CT API',
        default: '< 91723000 | Anatomical structure (body structure) |'
    },
    'replace': {
        alias: 'r',
        array: true,
        string: true,
        describe: 'Specify strings that should be replaced in the resulting list',
        example: ' (problem)',
        default: [' (body structure)', ' (disorder)', ' (finding)', ' (situation)']
    },
    'version': {
        alias: 'v',
        describe: 'The version of SNOMED-CT to execute',
        default: 'v20160131'
    },
    'edition': {
        alias: 'e',
        describe: 'The edition of SNOMED-CT to execute',
        default: 'en-edition'
    },
    'output': {
        alias: 'o',
        describe: 'The name of the file to output the XLSX to',
        required: true,
        default: 'output.xlsx'
    }
};

exports.handler = function (argv) {
    var data = [['code', 'display']];

    console.log('Starting export as of ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString());

    var request = function(options) {
        var deferred = Q.defer();

        requestOG(options, function(error, response, body) {
            if (error) {
                deferred.reject(body ? body : error);
            } else {
                deferred.resolve(body);
            }
        });

        return deferred.promise;
    };

    // Keeps track of how many concepts are in the expression, vs. how many we have proccessed thus far
    var current = {};

    var executeExpression = function(expression) {
        var deferred = Q.defer();
        var requestData = {
            "expression": expression,
            "limit": argv.limit,
            "skip": current[expression] ? current[expression].current : 0,
            "form": "inferred"
        };

        var requestOpts = {
            method: 'POST',
            url: 'https://sct-rest.ihtsdotools.org/api/expressions/' + argv.edition + '/' + argv.version + '/execute/brief',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            json: requestData
        };

        if (!current[expression]) {
            console.log('Requesting expression evaluation from SNOMED-CT: ' + expression);
        }

        request(requestOpts)
            .then(function(results) {
                if (!results || !results.computeResponse || !results.computeResponse.matches) {
                    console.log('Expected "' + expression + '" to return results with computeResponse.matches and didn\'t find any: ' + response);
                    return process.exit(0);
                }

                if (!current[expression]) {
                    current[expression] = {
                        total: results.computeResponse.total,
                        current: 0
                    };
                }

                _.each(results.computeResponse.matches, function(match) {
                    var defaultTerm = match.defaultTerm;

                    _.each(argv.replace, function(replaceString) {
                        defaultTerm = defaultTerm.replace(replaceString, '');
                    });

                    data.push([ match.conceptId, defaultTerm ]);
                    current[expression].current++;
                });

                console.log('Response received for expression "' + expression + '", ' + current[expression].total + ' total results, ' + current[expression].current + ' completed thus far, ' + Math.ceil((current[expression].current / current[expression].total) * 100) + '%');

                if (current[expression].current < current[expression].total) {
                    executeExpression(expression)
                        .then(function() {
                            deferred.resolve();
                        })
                        .catch(function(err) {
                            deferred.reject(err);
                        });
                } else {
                    deferred.resolve();
                }
            })
            .catch(function(err) {
                deferred.reject(err);
            })

        return deferred.promise;
    };

    var expressionPromises = [];

    _.each(argv.expression, function(expression) {
        expressionPromises.push(executeExpression(expression));
    });

    Q.all(expressionPromises)
        .then(function() {
            createExcel(argv.output, 'Concepts', data);
            console.log('Completed export as of ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString());
            process.exit(0);
        })
        .catch(function(err) {
            console.log(err);
            process.exit(1);
        });

    process.on('uncaughtException', function (err) {
        console.log('Uncaught exception: ' + err);
        fs.writeFileSync('temp.json', JSON.stringify(data, null, '\t'));
    });
}