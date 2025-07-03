const fs = require('fs');

// Import existing parsers
const { parseLastRun } = require('./lastRun');
const { parseTestResults } = require('./testResults');
const { parseXml } = require('./parseXml');

// Import new SimpleCov parser
const { parseSimpleCov } = require('./simplecov');

/**
 * Main parser coordinator
 * Manages all coverage and test result parsers
 */
class ParserManager {
  constructor() {
    this.parsers = {
      lastRun: parseLastRun,
      testResults: parseTestResults,
      xml: parseXml,
      simplecov: parseSimpleCov,
    };
  }

  /**
   * Parse last run data from .last_run.json
   */
  parseLastRun(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return this.parsers.lastRun(filePath);
  }

  /**
   * Parse test results from XML file
   */
  parseTestResults(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return this.parsers.testResults(filePath);
  }

  /**
   * Parse XML files (legacy support)
   */
  parseXml(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return this.parsers.xml(filePath);
  }

  /**
   * Parse SimpleCov coverage data
   */
  parseSimpleCov(filePath, includeFileDetails = false) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return this.parsers.simplecov(filePath, includeFileDetails);
  }

  /**
   * Auto-detect and parse available coverage files
   */
  autoDetectAndParse(options = {}) {
    const results = {};

    // Check for SimpleCov coverage.json
    const coverageFile = options.coverageFile || 'coverage/coverage.json';
    const includeFileDetails = options.includeFileDetails || false;
    const maxFilesToShow = options.maxFilesToShow || 50;

    if (fs.existsSync(coverageFile)) {
      results.coverage = this.parseSimpleCov(coverageFile, includeFileDetails);
      
      // Limit file details if too many files
      if (results.coverage && results.coverage.files && results.coverage.files.length > maxFilesToShow) {
        results.coverage.files = results.coverage.files.slice(0, maxFilesToShow);
        results.coverage.filesTruncated = true;
      }
    }

    // Check for .last_run.json
    const lastRunFile = options.lastRunFile || 'coverage/.last_run.json';
    if (fs.existsSync(lastRunFile)) {
      results.lastRun = this.parseLastRun(lastRunFile);
    }

    // Check for test results
    const testResultsFile = options.testResultsFile || 'test-results.xml';
    if (fs.existsSync(testResultsFile)) {
      results.testResults = this.parseTestResults(testResultsFile);
    }

    return results;
  }
}

module.exports = ParserManager; 