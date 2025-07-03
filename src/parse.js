const core = require('@actions/core');
const {
  getPathToFile,
  getContentFile,
  getCoverageColor,
  extractPercentage,
} = require('./utils');

// Check if the coverage file contains valid SimpleCov HTML content
const isValidCoverageContent = (data) => {
  if (!data || !data.length) {
    return false;
  }

  const wordsToInclude = ['SimpleCov', 'coverage', 'Total', 'Coverage'];

  return wordsToInclude.some((w) => data.includes(w));
};

// Extract total coverage percentage from SimpleCov HTML
const getTotalCoverage = (data) => {
  if (!data) return '0';

  // Look for total coverage in the HTML
  const totalMatch = data.match(/Total.*?(\d+(?:\.\d+)?)%/i);
  if (totalMatch) {
    return totalMatch[1];
  }

  // Alternative pattern for SimpleCov HTML
  const coverageMatch = data.match(/coverage.*?(\d+(?:\.\d+)?)%/i);
  if (coverageMatch) {
    return coverageMatch[1];
  }

  return '0';
};

// Parse file coverage data from SimpleCov HTML
const parseFileCoverage = (data) => {
  if (!data) return [];

  const files = [];

  // Extract file information from SimpleCov HTML
  // This regex looks for file entries in the coverage report
  const fileRegex =
    /<tr[^>]*class="[^"]*file[^"]*"[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>(\d+)<\/td>.*?<td[^>]*>(\d+)<\/td>.*?<td[^>]*>(\d+(?:\.\d+)?)%<\/td>/gis;

  let match;
  while ((match = fileRegex.exec(data)) !== null) {
    const fileName = match[1].trim();
    const statements = parseInt(match[2]) || 0;
    const missed = parseInt(match[3]) || 0;
    const coverage = match[4];

    files.push({
      name: fileName,
      stmts: statements.toString(),
      miss: missed.toString(),
      cover: coverage,
      missing: missed > 0 ? 'lines' : null, // SimpleCov doesn't provide specific line numbers in HTML
    });
  }

  return files;
};

// Get total statistics from SimpleCov HTML
const getTotal = (data) => {
  if (!data) return null;

  const totalMatch = data.match(/Total.*?(\d+).*?(\d+).*?(\d+(?:\.\d+)?)%/i);
  if (totalMatch) {
    return {
      name: 'TOTAL',
      stmts: totalMatch[1],
      miss: totalMatch[2],
      cover: totalMatch[3] + '%',
    };
  }

  return null;
};

// Get warnings from SimpleCov HTML (if any)
const getWarnings = (data) => {
  if (!data) return 0;

  // SimpleCov typically doesn't show warnings in HTML, but we can look for them
  const warningMatch = data.match(/warning/gi);
  return warningMatch ? warningMatch.length : 0;
};

// Parse coverage data from SimpleCov HTML
const parse = (data) => {
  return parseFileCoverage(data);
};

// Group files by folders
const makeFolders = (coverage, options) => {
  const folders = {};

  for (const line of coverage) {
    const parts = line.name.replace(options.prefix || '', '').split('/');
    const folder = parts.slice(0, -1).join('/');

    folders[folder] = folders[folder] || [];
    folders[folder].push(line);
  }

  return folders;
};

// Convert coverage data to HTML table
const toTable = (data, options, dataFromXml = null) => {
  const coverage = dataFromXml ? dataFromXml.files : parse(data);
  const folders = makeFolders(coverage, options);
  const total = dataFromXml ? dataFromXml.total : getTotal(data);

  let html =
    '<table><tr><th>File</th><th>Stmts</th><th>Miss</th><th>Cover</th><th>Missing</th></tr><tbody>';

  // Add files grouped by folders
  Object.keys(folders)
    .sort()
    .forEach((folder) => {
      if (folder) {
        html += `<tr><td colspan="5"><b>${folder}</b></td></tr>`;
      }

      folders[folder].forEach((file) => {
        html += toRow(file, !!folder, options);
      });
    });

  // Add total row
  if (total) {
    html += toTotalRow(total);
  }

  html += '</tbody></table>';
  return html;
};

// Convert a file row to HTML
const toRow = (item, indent = false, options) => {
  const fileNameTd = toFileNameTd(item, indent, options);
  const missingTd = toMissingTd(item, options);

  return `<tr><td>${fileNameTd}</td><td>${item.stmts}</td><td>${item.miss}</td><td>${item.cover}</td><td>${missingTd}</td></tr>`;
};

// Convert total row to HTML
const toTotalRow = (item) => {
  return `<tr><td><b>${item.name}</b></td><td><b>${item.stmts}</b></td><td><b>${item.miss}</b></td><td><b>${item.cover}</b></td><td>&nbsp;</td></tr>`;
};

// Convert file name to HTML with link
const toFileNameTd = (item, indent = false, options) => {
  const { repoUrl, commit, pathPrefix } = options;
  const indentStr = indent ? '&nbsp; &nbsp;' : '';
  const fileName = item.name.replace(options.prefix || '', '');

  const fileUrl = `${repoUrl}/blob/${commit}/${pathPrefix || ''}${fileName}`;
  return `${indentStr}<a href="${fileUrl}">${fileName}</a>`;
};

// Convert missing lines to HTML
const toMissingTd = (item) => {
  if (!item.missing || item.missing === 'lines') {
    return item.missing || '&nbsp;';
  }

  // For SimpleCov, we typically don't have specific line numbers in HTML
  // This would need to be enhanced if we parse XML coverage files
  return item.missing;
};

// Main function to get coverage report from SimpleCov HTML
const getCoverageReport = (options) => {
  const { coveragePath } = options;

  try {
    const coverageFilePath = getPathToFile(coveragePath);
    const content = getContentFile(coverageFilePath);
    const isValid = isValidCoverageContent(content);

    if (content && !isValid) {
      core.error(
        `Coverage file "${coverageFilePath}" has bad format or wrong data`,
      );
    }

    if (content && isValid) {
      const coverage = getTotalCoverage(content);
      const html = toHtml(content, options);
      const warnings = getWarnings(content);
      const color = getCoverageColor(coverage);

      return { html, coverage: coverage + '%', color, warnings };
    }
  } catch (error) {
    core.error(`Generating coverage report. ${error.message}`);
  }

  return { html: '', coverage: '0%', color: 'red', warnings: 0 };
};

// Convert coverage data to HTML output
const toHtml = (data, options) => {
  const { badgeTitle, title, hideBadge, hideReport, removeLinkFromBadge } =
    options;

  const table = hideReport ? '' : toTable(data, options);
  const total = getTotal(data);
  const color = getCoverageColor(total ? extractPercentage(total.cover) : '0');
  const coverage = total ? total.cover : '0%';

  const badgeUrl = removeLinkFromBadge
    ? `https://img.shields.io/badge/${badgeTitle}-${coverage}-${color}.svg`
    : `https://img.shields.io/badge/${badgeTitle}-${coverage}-${color}.svg`;

  const badge = hideBadge
    ? ''
    : `<img alt="Coverage" src="${badgeUrl}" /><br/>`;

  const report = hideReport
    ? ''
    : `<details><summary>${title}</summary>${table}</details>`;

  return `${badge}${report}`;
};

module.exports = {
  getCoverageReport,
  getTotalCoverage,
  getTotal,
  getWarnings,
  parse,
  toHtml,
  toTable,
  toRow,
  toTotalRow,
  toFileNameTd,
  toMissingTd,
  makeFolders,
};
