const core = require('@actions/core');
const xml2js = require('xml2js');
const { getPathToFile, getContentFile, formatTime } = require('../utils');

// Check if running in CI environment
const isCI = process.env.CI === 'true';

// Parse test results from XML file
const getParsedTestResults = async (options) => {
  const { testResultsPath } = options;

  if (!testResultsPath) {
    return { errors: 0, failures: 0, skipped: 0, tests: 0, time: 0 };
  }

  try {
    const xmlFilePath = getPathToFile(testResultsPath);
    const content = getContentFile(xmlFilePath);

    if (!content) {
      if (!isCI) {
        core.warning(`Test results file not found: ${xmlFilePath}`);
      }
      return { errors: 0, failures: 0, skipped: 0, tests: 0, time: 0 };
    }

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    // Handle different XML formats (JUnit, RSpec, etc.)
    if (result.testsuites) {
      return parseJUnitFormat(result.testsuites);
    } else if (result.testsuite) {
      return parseJUnitFormat({ testsuite: [result.testsuite] });
    } else if (result.rspec) {
      return parseRSpecFormat(result.rspec);
    } else {
      if (!isCI) {
        core.warning('Unknown test results format');
      }
      return { errors: 0, failures: 0, skipped: 0, tests: 0, time: 0 };
    }
  } catch (error) {
    if (!isCI) {
      core.error(`Error parsing test results: ${error.message}`);
    }
    return { errors: 0, failures: 0, skipped: 0, tests: 0, time: 0 };
  }
};

// Parse JUnit format test results
const parseJUnitFormat = (testsuites) => {
  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalTime = 0;

  const suites = testsuites.testsuite || [];

  suites.forEach((suite) => {
    if (suite.$) {
      totalTests += parseInt(suite.$.tests || 0);
      totalFailures += parseInt(suite.$.failures || 0);
      totalErrors += parseInt(suite.$.errors || 0);
      totalSkipped += parseInt(suite.$.skipped || 0);
      totalTime += parseFloat(suite.$.time || 0);
    }
  });

  return {
    tests: totalTests,
    failures: totalFailures,
    errors: totalErrors,
    skipped: totalSkipped,
    time: totalTime,
  };
};

// Parse RSpec format test results
const parseRSpecFormat = (rspec) => {
  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalTime = 0;

  if (rspec.$) {
    totalTests = parseInt(rspec.$.examples || 0);
    totalFailures = parseInt(rspec.$.failures || 0);
    totalErrors = parseInt(rspec.$.errors || 0);
    totalSkipped = parseInt(rspec.$.pending || 0);
    totalTime = parseFloat(rspec.$.duration || 0);
  }

  return {
    tests: totalTests,
    failures: totalFailures,
    errors: totalErrors,
    skipped: totalSkipped,
    time: totalTime,
  };
};

// Get summary report from test results
const getSummaryReport = (options) => {
  const { testResultsPath } = options;

  if (!testResultsPath) {
    return '';
  }

  try {
    const xmlFilePath = getPathToFile(testResultsPath);
    const content = getContentFile(xmlFilePath);

    if (!content) {
      return '';
    }

    return generateSummaryHtml(options);
  } catch (error) {
    core.error(`Error generating summary report: ${error.message}`);
    return '';
  }
};

// Generate summary HTML
const generateSummaryHtml = async (options) => {
  const parsedResults = await getParsedTestResults(options);

  const { tests, skipped, failures, errors, time } = parsedResults;
  const title = 'Test Results';

  const timeFormatted = formatTime(time);

  let html = `| ${title} | Skipped | Failures | Errors | Time |\n`;
  html += `| ----- | ------- | -------- | -------- | ------------------ |\n`;
  html += `| ${tests} | ${skipped} :zzz: | ${failures} :x: | ${errors} :fire: | ${timeFormatted} :stopwatch: |`;

  return html;
};

// Get test information for failed/skipped tests
const getNotSuccessTestInfo = async (options) => {
  const { testResultsPath } = options;

  if (!testResultsPath) {
    return { failures: [], errors: [], skipped: [], count: 0 };
  }

  try {
    const xmlFilePath = getPathToFile(testResultsPath);
    const content = getContentFile(xmlFilePath);

    if (!content) {
      return { failures: [], errors: [], skipped: [], count: 0 };
    }

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    const failures = [];
    const errors = [];
    const skipped = [];

    // Parse JUnit format
    if (result.testsuites) {
      const suites = result.testsuites.testsuite || [];
      suites.forEach((suite) => {
        if (suite.testcase) {
          suite.testcase.forEach((testcase) => {
            if (testcase.failure) {
              failures.push({
                classname: testcase.$.classname || '',
                name: testcase.$.name || '',
              });
            } else if (testcase.error) {
              errors.push({
                classname: testcase.$.classname || '',
                name: testcase.$.name || '',
              });
            } else if (testcase.skipped) {
              skipped.push({
                classname: testcase.$.classname || '',
                name: testcase.$.name || '',
              });
            }
          });
        }
      });
    }

    const count = failures.length + errors.length + skipped.length;

    return { failures, errors, skipped, count };
  } catch (error) {
    core.error(`Error parsing test info: ${error.message}`);
    return { failures: [], errors: [], skipped: [], count: 0 };
  }
};

module.exports = {
  getParsedTestResults,
  getSummaryReport,
  getNotSuccessTestInfo,
  parseJUnitFormat,
  parseRSpecFormat,
  generateSummaryHtml,
};
