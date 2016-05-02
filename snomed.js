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
        default: 10000
    },
    'expression': {
        alias: 'x',
        describe: 'The expression to run against the SNOMED-CT API',
        default: '< 91723000 | Anatomical structure (body structure) |'
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

    var requestData = {
        "expression": argv.expression,
        "limit": argv.limit,
        "skip": 0,
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

    request(requestOpts)      // 9172300
        .then(function(results) {
            if (!results || !results.computeResponse || !results.computeResponse.matches) {
                console.log('Expected results with computeResponse.matches and didn\'t find any');
                return process.exit(0);
            }

            _.each(results.computeResponse.matches, function(match) {
                var defaultTerm = match.defaultTerm
                    .replace(/ \(body structure\)/gi, '');

                data.push([ match.conceptId, defaultTerm ]);
            });

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