const core = require('@actions/core');
const ParserManager = require('./parsers');
const { getCoverageXmlReport } = require('./parsers/parseXml');
const { getSummaryReport } = require('./parsers/testResults');

// Get multiple reports from different files
const getMultipleReport = (options) => {
  const { multipleFiles } = options;

  if (!multipleFiles || !multipleFiles.length) {
    return '';
  }

  let html =
    '<table><tr><th>Title</th><th>Coverage</th><th>Tests</th><th>Status</th></tr><tbody>';

  multipleFiles.forEach((line) => {
    const parts = line.split(',').map((part) => part.trim());

    if (parts.length >= 2) {
      const title = parts[0];
      const coveragePath = parts[1];

      const report = generateSingleReportAsync({
        ...options,
        coveragePath,
        title,
      });

      html += toMultiRow(title, report);
    }
  });

  html += '</tbody></table>';
  return html;
};

// Generate a single report for multiple files
const generateSingleReportAsync = async (options) => {
  const { coveragePath, coverageXmlPath } = options;
  try {
    let report;
    if (coverageXmlPath) {
      report = await getCoverageXmlReport(options);
    } else {
      // Use ParserManager for JSON coverage
      const parserManager = new ParserManager();
      const parsed = await parserManager.autoDetectAndParse({
        coverageFile: coveragePath,
        includeFileDetails: false,
      });
      if (parsed.coverage && parsed.coverage.overall) {
        report = {
          coverage: parsed.coverage.overall.percentage + '%',
          color: getStatusColor(parsed.coverage.overall.percentage),
        };
      } else {
        report = { coverage: '0%', color: 'red' };
      }
    }
    const summaryReport = getSummaryReport(options);
    return {
      coverage: report.coverage,
      color: report.color,
      summary: summaryReport,
    };
  } catch (error) {
    core.error(`Error generating report for ${coveragePath}: ${error.message}`);
    return {
      coverage: '0%',
      color: 'red',
      summary: '',
    };
  }
};

// Helper to get color for status badge
const getStatusColor = (percentage) => {
  const pct = parseFloat(percentage);
  if (pct >= 90) return 'brightgreen';
  if (pct >= 80) return 'green';
  if (pct >= 70) return 'yellowgreen';
  if (pct >= 60) return 'yellow';
  if (pct >= 50) return 'orange';
  return 'red';
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

  return `<tr><td>${title}</td><td><img alt="Coverage" src="https://img.shields.io/badge/Coverage-${coverage.replace('%', '%25')}-${color}.svg" /></td><td>${testInfo}</td><td>${status}</td></tr>`;
};

// Get status from report
const getStatusFromReport = (report) => {
  const { coverage } = report;
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
  generateSingleReportAsync,
  toMultiRow,
  getStatusFromReport,
};
