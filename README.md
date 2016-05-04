# term-query

![npm](https://img.shields.io/npm/v/term-query.svg) ![license](https://img.shields.io/npm/l/term-query.svg)

Small tool to query rxnorm and snomed REST API's

![nodei.co](https://nodei.co/npm/term-query.png?downloads=true&downloadRank=true&stars=true)


## Features
- Run queries against SNOMED-CT and RXNORM REST APIs
- Customized RXNORM queries to include brands and classes for each code/concept
- Commands pre-populated with queries for allergies, medications and body sites

## Install

Ensure that Node.JS is installed: https://www.nodejs.org

`npm install term-query -g`

## Usage

Runs the default query for medications against snomed and produces a "medications.xlsx" file:

```
term-query medications
```

Runs a query for all "IN+PIN" tty's and outputs them to "allergies.xlsx" file:

```
term-query rxnorm --tty "IN+PIN" --output "allergies.xlsx"
```

| Command | Description |
| ------- | ----------- |
| rxnorm | Queries RXNorm using custom options |
| snomed | Queries Snomed-CT using custom options |
| medications | Creates a medications list using default options for rxnorm command |
| problems | Creates a problems list using default options for snomed command |
| allergies | Creates an allergies list using default options for rxnorm command |
| bodySite | Creates a bodySite list using default options for snomed command |

Options:

| Option | Required | Description | Type | Default |
| ------ | -------- | ----------- | ---- | ------- |
| --help | No | Show help | boolean | |
  
### RxNorm Command Options

| Option | Required | Description | Type | Default |
| ------ | -------- | ----------- | ---- | ------- |
| --help | No | Show help | boolean | |
| --brands, -b | No | Include brand information for each concept | boolean | false |
| --classes, -c | No | Include class information for each concept | boolean | false |
| --output, -o | No | The name of the file to output the XLSX to | string | "output.xlsx" |
| --tty, -t | Yes | | | |

### SNOMED Command Options

| Option | Required | Description | Type | Default |
| ------ | -------- | ----------- | ---- | ------- |
| --help | No | Show help | boolean | |
| --limit, -l | No | Limits the results returned from the query | number | 10000 |
| --expression, -x | Yes | The expression (can be repeated) to run against the SNOMED-CT API | string | < 91723000 \| Anatomical structure (body structure) \| |
| --version, -v | No | The version of SNOMED-CT to execute | string | v20160131 |
| --edition, -e | No | The edition of SNOMED-CT to execute | string | en-edition |
  
## Dependencies
Package | Version | Dev
--- |:---:|:---:
[q](https://www.npmjs.com/package/q) | ^1.4.1 | ✖
[request](https://www.npmjs.com/package/request) | ^2.72.0 | ✖
[request-promise](https://www.npmjs.com/package/request-promise) | ^3.0.0 | ✖
[simple-rate-limiter](https://www.npmjs.com/package/simple-rate-limiter) | ^0.2.3 | ✖
[underscore](https://www.npmjs.com/package/underscore) | ^1.8.3 | ✖
[xlsx](https://www.npmjs.com/package/xlsx) | ^0.8.0 | ✖
[yargs](https://www.npmjs.com/package/yargs) | ^4.6.0 | ✖
[node-readme](https://www.npmjs.com/package/node-readme) | ^0.1.9 | ✔


## References
- [SNOMED CT Expression Constraint Language Specification and Guide](http://ihtsdo.org/fileadmin/user_upload/doc/download/doc_ExpressionConstraintLanguageSpecificationAndGuide_Current-en-US_INT_20150820.pdf?ok)
- [SNOMED CT Snapshot Browser REST API](http://docs.snomedctsnapshotapi.apiary.io)
- [RxNorm API](https://rxnav.nlm.nih.gov/RxNormAPIs.html)