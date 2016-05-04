var createExcel = require('./createExcel');
var limit = require("simple-rate-limiter");
var requestOG = limit(require("request")).to(100).per(1000);
var _ = require('underscore');
var Q = require('q');
var fs = require('fs');

exports.command = 'rxnorm';

exports.describe = 'Queries RXNorm using custom options';

exports.builder = {
    'tty': {
        alias: 't',
        required: true
    },
    'brands': {
        alias: 'b',
        boolean: true,
        describe: 'Include brand information for each concept',
        default: false
    },
    'classes': {
        alias: 'c',
        boolean: true,
        describe: 'Include class information for each concept',
        default: false
    },
    'output': {
        alias: 'o',
        describe: 'The name of the file to output the XLSX to',
        required: true,
        default: 'output.xlsx'
    }
};

exports.handler = function (argv) {
    var headers = ['code', 'display'];
    var data = [headers];
    
    if (argv.brands) {
        headers.push('brands');
    }
    
    if (argv.classes) {
        headers.push('classes');
    }

    try {
        var tempData = require('./temp.json');
        data = tempData;
    } catch (ex) {

    }

    var ingredientRequestOpts = {
        method: 'GET',
        url: 'https://rxnav.nlm.nih.gov/REST/allconcepts?tty=' + argv.tty,
        headers: {
            'Accept': 'application/json'
        },
        json: true
    };

    console.log('Starting export as of ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString());

    var request = function(options) {
        var deferred = Q.defer();

        requestOG(options, function(error, response, body) {
            if (error) {
                deferred.reject(body);
            } else {
                deferred.resolve(body);
            }
        });

        return deferred.promise;
    };

    var getBrands = function(rxcui) {
        var requestOpts = {
            method: 'GET',
            url: 'https://rxnav.nlm.nih.gov/REST/brands?ingredientids=' + rxcui,
            headers: {
                'Accept': 'application/json'
            },
            json: true
        };

        return request(requestOpts);
    };

    var getClasses = function(rxcui) {
        var requestOpts = {
            method: 'GET',
            url: 'https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui?relas=has_VAClass&rxcui=' + rxcui,
            headers: {
                'Accept': 'application/json'
            },
            json: true
        };

        return request(requestOpts);
    };

    var populateRowData = function(rowData, total, index) {
        var deferred = Q.defer();

        var promises = [];
        
        if (argv.brands) {
            promises.push(getBrands(rowData[0]));
        }

        Q.all(promises)
            .then(function(results) {
                if (argv.brands) {
                    console.log('Got brands and classes for ' + rowData[1] + ' (' + rowData[0] + ')');

                    var brandResults = results[0];

                    // Brands
                    if (brandResults && brandResults.brandGroup && brandResults.brandGroup.conceptProperties) {
                        var brands = [];
                        _.each(brandResults.brandGroup.conceptProperties, function (conceptProperties) {
                            brands.push(conceptProperties.name);
                        });
                        rowData[2] = brands.join(' | ');
                    }
                }

                if (argv.classes) {
                    var classResults = argv.brands ? results[1] : results[0];
                    
                    // Classes
                    if (classResults && classResults.rxclassDrugInfoList && classResults.rxclassDrugInfoList.rxclassDrugInfo) {
                        var classes = [];
                        _.each(classResults.rxclassDrugInfoList.rxclassDrugInfo, function (drugInfo) {
                            if (drugInfo.rxclassMinConceptItem) {
                                classes.push(drugInfo.rxclassMinConceptItem.className);
                            }
                        });
                        
                        if (argv.brands) {
                            rowData[3] = classes.join(' | ');
                        } else {
                            rowData[2] = classes.join(' | ');
                        }
                    }
                }

                data.push(rowData);

                var percentComplete = (data.length / total) * 100;
                console.log(Math.round(percentComplete) + '% complete');

                deferred.resolve();
            })
            .catch(function(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    };

    request(ingredientRequestOpts)
        .then(function(results) {
            var promises = [];

            var acceptableNodeIds = [
                'N0000191916',      // Atorvastatin Calcium
                'N0000006649',      // Nitrofurantoin
                'N0000006752',      // Azithromycin
                'N0000006204',      // TOPIRAMATE
                'N0000006450',      // Lisinopril
                'N0000179370',      // Penicillin
                'N0000006760'       // Propranolol
            ];

            var acceptableCuis = [
                '8787',             // Propranolol
                '83367',            // Atorvastatin
                '83366',            // Atorvastatin calcium
                '1483793',          // ATORVASTATIN CALCIUM PROPYLENE GLYCOL SOLVATE
                '1297766',          // atorvastatin calcium trihydrate
                '7454',             // Nitrofurantoin
                '235559',           // NITROFURANTOIN, MACROCRYSTALS
                '221129',           // Nitrofurantoin, Monohydrate
                '18631',            // Azithromycin
                '1299904',          // Azithromycin ANHYDROUS
                '253155',           // Azithromycin Dihydrate
                '1298839',          // Azithromycin Monohydrate
                '38404',
                '29046',            // Lisinopril
                '70618',            // Penicillin
                '7980',             // Penicillin G
                '7954',             // Penicillin V
            ];

            var totalConcepts = results.minConceptGroup.minConcept.length;
            console.log('Processing ' + totalConcepts + ' IN+PIN codes');

            _.each(results.minConceptGroup.minConcept, function(minConcept, index) {
                /*
                if (index > 2000) {
                    return;
                }

                if (acceptableCuis.indexOf(minConcept.rxcui) < 0) {
                    return;
                }
                 */

                // If we have already processed the row in a previous run...
                if (_.find(data, function(nextData) {
                        return nextData[0] == minConcept.rxcui;
                    })) {
                    return;
                }

                var conceptName = minConcept.name
                    .replace(' (procedure)', '');

                var rowData = [minConcept.rxcui, conceptName, ''];
                promises.push(populateRowData(rowData, totalConcepts, index));
            });

            return Q.all(promises);
        })
        .then(function() {
            createExcel(argv.output, 'Concepts', data);
            console.log('Completed export as of ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString());
            process.exit(0);
        })
        .catch(function(err) {
            fs.writeFileSync('temp.json', JSON.stringify(data, null, '\t'));
            console.log(err);
            process.exit(1);
        });

    process.on('uncaughtException', function (err) {
        console.log('Uncaught exception: ' + err);
        fs.writeFileSync('temp.json', JSON.stringify(data, null, '\t'));
    });
}