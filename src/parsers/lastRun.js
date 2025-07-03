const fs = require('fs');
const path = require('path');
const core = require('@actions/core');

// Check if running in CI environment
const isCI = process.env.CI === 'true';

// Parse SimpleCov .last_run.json file
const parseLastRun = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    if (!data.result) {
      return null;
    }

    return {
      line: data.result.line || 0,
      branch: data.result.branch || 0,
    };
  } catch (error) {
    if (!isCI) {
      core.warning(`Failed to parse .last_run.json: ${error.message}`);
    }
    return null;
  }
};

// Get coverage color based on percentage
const getCoverageColor = (percentage) => {
  if (percentage >= 90) return 'brightgreen';
  if (percentage >= 80) return 'green';
  if (percentage >= 70) return 'yellowgreen';
  if (percentage >= 60) return 'yellow';
  if (percentage >= 50) return 'orange';
  return 'red';
};

// Generate HTML for last run coverage
const generateLastRunHtml = (lastRunData, options = {}) => {
  if (!lastRunData) {
    return '';
  }

  const { title = 'Last Run Coverage', hideBadge = false } = options;

  const lineColor = getCoverageColor(lastRunData.line);
  const branchColor = getCoverageColor(lastRunData.branch);

  const lineBadge = `https://img.shields.io/badge/Line-${lastRunData.line.toFixed(1)}%25-${lineColor}.svg`;
  const branchBadge = `https://img.shields.io/badge/Branch-${lastRunData.branch.toFixed(1)}%25-${branchColor}.svg`;

  const badges = hideBadge
    ? ''
    : `<img alt="Line Coverage" src="${lineBadge}" /> <img alt="Branch Coverage" src="${branchBadge}" /><br/>`;

  const table = `
<table>
<tr><th>Coverage Type</th><th>Percentage</th><th>Status</th></tr>
<tr><td>Line Coverage</td><td>${lastRunData.line.toFixed(1)}%</td><td>${getStatusEmoji(lastRunData.line)}</td></tr>
<tr><td>Branch Coverage</td><td>${lastRunData.branch.toFixed(1)}%</td><td>${getStatusEmoji(lastRunData.branch)}</td></tr>
</table>`;

  return `<details><summary>${title}</summary>${badges}${table}</details>`;
};

// Get status emoji based on coverage percentage
const getStatusEmoji = (percentage) => {
  if (percentage >= 90) return '🟢 Excellent';
  if (percentage >= 80) return '🟡 Good';
  if (percentage >= 70) return '🟠 Fair';
  return '🔴 Poor';
};

// Get last run data from coverage directory
const getLastRunData = (coveragePath) => {
  if (!coveragePath || typeof coveragePath !== 'string') {
    return null;
  }

  try {
    const coverageDir = path.dirname(coveragePath);
    const lastRunPath = path.join(coverageDir, '.last_run.json');

    return parseLastRun(lastRunPath);
  } catch (error) {
    core.warning(`Failed to get last run data: ${error.message}`);
    return null;
  }
};

module.exports = {
  parseLastRun,
  getLastRunData,
  generateLastRunHtml,
  getCoverageColor,
  getStatusEmoji,
};
