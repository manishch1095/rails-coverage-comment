const path = require('path');
const lastRunParser = require('../src/parsers/lastRun');
const testResultsParser = require('../src/parsers/testResults');
const simplecovParser = require('../src/parsers/simplecov');
const parseXmlParser = require('../src/parsers/parseXml');

// Check if running in CI environment
const isCI = process.env.CI === 'true';

// Suppress expected warnings during CI runs
const originalConsoleWarn = console.warn;
if (isCI) {
  console.warn = (...args) => {
    // Only suppress specific expected warnings
    const message = args.join(' ');
    if (
      message.includes('XML coverage file not found') ||
      message.includes('No coverage.xml found')
    ) {
      return; // Suppress these expected warnings in CI
    }
    originalConsoleWarn(...args);
  };
}

console.log('--- Testing SimpleCov JSON Parser ---');
const simplecovPath = path.join(__dirname, 'test-data/coverage/coverage.json');
const simplecov = simplecovParser.parseSimpleCov(simplecovPath, true);
console.dir(simplecov, { depth: 5 });

console.log('\n--- Testing Last Run Parser ---');
const lastRunPath = path.join(__dirname, 'test-data/coverage/.last_run.json');
const lastRun = lastRunParser.parseLastRun(lastRunPath);
console.dir(lastRun, { depth: 5 });

console.log('\n--- Testing Test Results Parser ---');
const testResultsPath = path.join(__dirname, 'test-data/test-results.xml');
// The parser expects an options object
(async () => {
  const testResults = await testResultsParser.getParsedTestResults({
    testResultsPath,
  });
  console.dir(testResults, { depth: 5 });

  console.log('\n--- Test Results Summary HTML ---');
  const summaryHtml = await testResultsParser.generateSummaryHtml({
    testResultsPath,
  });
  console.log(summaryHtml);

  // If you have a coverage XML, test the XML parser as well
  const coverageXmlPath = path.join(
    __dirname,
    'test-data/coverage/coverage.xml',
  );
  try {
    const xmlResult = await parseXmlParser.getCoverageXmlReport({
      coverageXmlPath,
      badgeTitle: 'XML',
      title: 'XML Coverage',
      hideBadge: false,
      hideReport: false,
      prefix: '',
      repoUrl: '',
      commit: '',
      pathPrefix: '',
    });
    console.log('\n--- XML Coverage Parser Output ---');
    console.dir(xmlResult, { depth: 5 });
  } catch (e) {
    if (!isCI) {
      console.log('No coverage.xml found or error parsing XML:', e.message);
    }
  }
})();
