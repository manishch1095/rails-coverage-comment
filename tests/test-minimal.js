const ParserManager = require('../src/parsers');

console.log('Testing ParserManager...');

const parserManager = new ParserManager();
const results = parserManager.autoDetectAndParse({
  coverageFile: 'tests/test-data/coverage/coverage.json',
  includeFileDetails: true,
  maxFilesToShow: 10,
});

console.log('Results:', JSON.stringify(results, null, 2));
