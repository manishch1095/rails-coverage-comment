const fs = require('fs');

// Import existing parsers
const lastRunParser = require('./lastRun');
const testResultsParser = require('./testResults');
const parseXmlParser = require('./parseXml');

// Import new SimpleCov parser
const simplecovParser = require('./simplecov');

/**
 * ParserManager coordinates all coverage and test result parsers.
 * Use this class to parse coverage, last run, and test results in a unified way.
 */
class ParserManager {
  /**
   *
   */
  constructor() {
    this.parsers = {
      lastRun: lastRunParser.parseLastRun,
      testResults: testResultsParser.getParsedTestResults,
      xml: parseXmlParser.getCoverageXmlReport,
      simplecov: simplecovParser.parseSimpleCovAsync,
    };
  }

  /**
   * Parse last run data from .last_run.json
   * @param {string} filePath - Path to the .last_run.json file
   * @returns {object|null} Parsed last run data or null if file doesn't exist
   */
  parseLastRun(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return this.parsers.lastRun(filePath);
  }

  /**
   * Parse test results from XML file
   * @param {string} filePath - Path to the test results XML file
   * @returns {Promise<object|null>} Parsed test results or null if file doesn't exist
   */
  async parseTestResults(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      return await this.parsers.testResults({ testResultsPath: filePath });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error parsing test results:', err);
      return null;
    }
  }

  /**
   * Parse XML files (legacy support)
   * @param {string} filePath - Path to the XML coverage file
   * @returns {Promise<object|null>} Parsed XML data or null if file doesn't exist
   */
  async parseXml(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      return await this.parsers.xml({ coverageXmlPath: filePath });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error parsing XML coverage:', err);
      return null;
    }
  }

  /**
   * Parse SimpleCov coverage data (async)
   * @param {string} filePath - Path to the SimpleCov coverage.json file
   * @param {boolean} includeFileDetails - Whether to include individual file details
   * @returns {Promise<object|null>} Parsed coverage data or null if file doesn't exist
   */
  async parseSimpleCov(filePath, includeFileDetails = false) {
    return await this.parsers.simplecov(filePath, includeFileDetails);
  }

  /**
   * Auto-detect and parse available coverage files
   * @param {object} options - Configuration options for parsing
   * @returns {Promise<object>} Results with keys: coverage, lastRun, testResults
   */
  async autoDetectAndParse(options = {}) {
    const results = {};

    // Check for SimpleCov coverage.json
    const coverageFile = options.coverageFile || 'coverage/coverage.json';
    const includeFileDetails = options.includeFileDetails || false;
    const maxFilesToShow = options.maxFilesToShow || 50;

    results.coverage = await this.parseSimpleCov(
      coverageFile,
      includeFileDetails,
    );
    if (
      results.coverage &&
      results.coverage.files &&
      results.coverage.files.length > maxFilesToShow
    ) {
      results.coverage.files = results.coverage.files.slice(0, maxFilesToShow);
      results.coverage.filesTruncated = true;
    }

    // Check for .last_run.json
    const lastRunFile = options.lastRunFile || 'coverage/.last_run.json';
    if (fs.existsSync(lastRunFile)) {
      results.lastRun = this.parseLastRun(lastRunFile);
    }

    // Check for test results
    const testResultsFile = options.testResultsFile || 'test-results.xml';
    if (fs.existsSync(testResultsFile)) {
      results.testResults = await this.parseTestResults(testResultsFile);
    }

    return results;
  }
}

module.exports = ParserManager;
