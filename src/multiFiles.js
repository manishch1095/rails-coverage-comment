const core = require('@actions/core');
const { getCoverageReport } = require('./parse');
const { getCoverageXmlReport } = require('./parseXml');
const { getSummaryReport } = require('./testResults');

// Get multiple reports from different files
const getMultipleReport = (options) => {
  const { multipleFiles } = options;

  if (!multipleFiles || !multipleFiles.length) {
    return '';
  }

  let html = '<table><tr><th>Title</th><th>Coverage</th><th>Tests</th><th>Status</th></tr><tbody>';

  multipleFiles.forEach((line) => {
    const parts = line.split(',').map((part) => part.trim());
    
    if (parts.length >= 2) {
      const title = parts[0];
      const coveragePath = parts[1];
      const testResultsPath = parts[2] || '';

      const report = generateSingleReport({
        ...options,
        coveragePath,
        testResultsPath,
        title
      });

      html += toMultiRow(title, report);
    }
  });

  html += '</tbody></table>';
  return html;
};

// Generate a single report for multiple files
const generateSingleReport = (options) => {
  const { coveragePath, coverageXmlPath, testResultsPath } = options;

  try {
    let report;

    if (coverageXmlPath) {
      report = getCoverageXmlReport(options);
    } else {
      report = getCoverageReport(options);
    }

    const summaryReport = getSummaryReport(options);

    return {
      coverage: report.coverage,
      color: report.color,
      summary: summaryReport
    };
  } catch (error) {
    core.error(`Error generating report for ${coveragePath}: ${error.message}`);
    return {
      coverage: '0%',
      color: 'red',
      summary: ''
    };
  }
};

// Convert multiple report to table row
const toMultiRow = (title, report) => {
  const { coverage, color, summary } = report;
  
  // Extract test information from summary
  let testInfo = '';
  if (summary) {
    const testMatch = summary.match(/\| (\d+) \|/);
    if (testMatch) {
      testInfo = testMatch[1];
    }
  }

  const status = getStatusFromReport(report);
  
  return `<tr><td>${title}</td><td><img alt="Coverage" src="https://img.shields.io/badge/Coverage-${coverage}-${color}.svg" /></td><td>${testInfo}</td><td>${status}</td></tr>`;
};

// Get status from report
const getStatusFromReport = (report) => {
  const { coverage, summary } = report;
  const coverageNum = parseFloat(coverage);
  
  if (coverageNum >= 90) {
    return '🟢 Excellent';
  } else if (coverageNum >= 80) {
    return '🟡 Good';
  } else if (coverageNum >= 70) {
    return '🟠 Fair';
  } else {
    return '🔴 Poor';
  }
};

module.exports = {
  getMultipleReport,
  generateSingleReport,
  toMultiRow,
  getStatusFromReport,
}; 