const { parseSimpleCov } = require('./src/parsers/simplecov');

// Test the parser
console.log('Testing SimpleCov parser...\n');

// Test without file details
console.log('=== Test 1: Without file details ===');
const result1 = parseSimpleCov('test-data/coverage/coverage.json', false);
console.log('Overall Summary:', JSON.stringify(result1.overall, null, 2));
console.log('Groups:', JSON.stringify(result1.groups, null, 2));
console.log('Files:', result1.files); // Should be null

console.log('\n=== Test 2: With file details ===');
const result2 = parseSimpleCov('test-data/coverage/coverage.json', true);
console.log('Overall Summary:', JSON.stringify(result2.overall, null, 2));
console.log('Groups:', JSON.stringify(result2.groups, null, 2));
console.log('Files:', JSON.stringify(result2.files, null, 2)); 