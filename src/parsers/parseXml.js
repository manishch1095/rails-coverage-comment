const core = require('@actions/core');
const xml2js = require('xml2js');
const { getPathToFile, getContentFile, getCoverageColor } = require('../utils');

// Parse SimpleCov XML coverage report
const getCoverageXmlReport = async (options) => {
  const { coverageXmlPath } = options;

  try {
    const xmlFilePath = getPathToFile(coverageXmlPath);
    const content = getContentFile(xmlFilePath);

    if (!content) {
      core.warning(`XML coverage file not found: ${xmlFilePath}`);
      return { html: '', coverage: '0%', color: 'red', warnings: 0 };
    }

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    if (!result.coverage) {
      core.error('Invalid XML coverage format');
      return { html: '', coverage: '0%', color: 'red', warnings: 0 };
    }

    const coverage = result.coverage;
    const totalCoverage = extractTotalCoverageFromXml(coverage);
    const files = parseFilesFromXml(coverage, options);
    const color = getCoverageColor(totalCoverage);

    const html = toHtmlFromXml({ total: totalCoverage, files }, options);

    return { html, coverage: totalCoverage + '%', color, warnings: 0 };
  } catch (error) {
    core.error(`Error parsing XML coverage report: ${error.message}`);
    return { html: '', coverage: '0%', color: 'red', warnings: 0 };
  }
};

// Extract total coverage from XML
const extractTotalCoverageFromXml = (coverage) => {
  if (coverage.$ && coverage.$.line_rate) {
    const lineRate = parseFloat(coverage.$.line_rate);
    return (lineRate * 100).toFixed(1);
  }

  if (coverage.$ && coverage.$.branch_rate) {
    const branchRate = parseFloat(coverage.$.branch_rate);
    return (branchRate * 100).toFixed(1);
  }

  return '0';
};

// Parse files from XML coverage report
const parseFilesFromXml = (coverage, options) => {
  const files = [];

  if (!coverage.packages || !coverage.packages[0]) {
    return files;
  }

  const packages = coverage.packages[0].package || [];

  packages.forEach((pkg) => {
    if (pkg.classes && pkg.classes[0]) {
      const classes = pkg.classes[0].class || [];

      classes.forEach((cls) => {
        if (cls.$ && cls.$.filename) {
          const fileName = cls.$.filename.replace(options.prefix || '', '');
          const lineRate = cls.$.line_rate ? parseFloat(cls.$.line_rate) : 0;

          // Calculate statements and missed lines
          const lines = cls.lines ? cls.lines[0].line || [] : [];
          const statements = lines.length;
          const missed = lines.filter(
            (line) => line.$ && line.$.hits === '0',
          ).length;

          files.push({
            name: fileName,
            stmts: statements.toString(),
            miss: missed.toString(),
            cover: (lineRate * 100).toFixed(1) + '%',
            missing: missed > 0 ? getMissingLines(lines) : null,
          });
        }
      });
    }
  });

  return files;
};

// Get missing lines from XML
const getMissingLines = (lines) => {
  const missingLines = [];

  lines.forEach((line) => {
    if (line.$ && line.$.hits === '0' && line.$.number) {
      missingLines.push(parseInt(line.$.number));
    }
  });

  if (missingLines.length === 0) {
    return null;
  }

  // Group consecutive lines
  const groups = [];
  let start = missingLines[0];
  let end = missingLines[0];

  for (let i = 1; i < missingLines.length; i++) {
    if (missingLines[i] === end + 1) {
      end = missingLines[i];
    } else {
      groups.push(start === end ? start.toString() : `${start}-${end}`);
      start = missingLines[i];
      end = missingLines[i];
    }
  }

  groups.push(start === end ? start.toString() : `${start}-${end}`);

  return groups.join(', ');
};

// Convert XML data to HTML
const toHtmlFromXml = (data, options) => {
  const { badgeTitle, title, hideBadge, hideReport } = options;

  const table = hideReport ? '' : toTableFromXml(data, options);
  const color = getCoverageColor(data.total);
  const coverage = data.total + '%';

  const badgeUrl = `https://img.shields.io/badge/${badgeTitle}-${coverage.replace('%', '%25')}-${color}.svg`;
  const badge = hideBadge
    ? ''
    : `<img alt="Coverage" src="${badgeUrl}" /><br/>`;

  const report = hideReport
    ? ''
    : `<details><summary>${title}</summary>${table}</details>`;

  return `${badge}${report}`;
};

// Convert XML data to table
const toTableFromXml = (data, options) => {
  const { files } = data;
  const folders = makeFoldersFromXml(files, options);

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
        html += toRowFromXml(file, !!folder, options);
      });
    });

  // Add total row
  const total = {
    name: 'TOTAL',
    stmts: files.reduce((sum, f) => sum + parseInt(f.stmts), 0).toString(),
    miss: files.reduce((sum, f) => sum + parseInt(f.miss), 0).toString(),
    cover: data.total + '%',
  };

  html += toTotalRowFromXml(total, options);
  html += '</tbody></table>';

  return html;
};

// Group files by folders for XML data
const makeFoldersFromXml = (files, options) => {
  const folders = {};

  files.forEach((file) => {
    const parts = file.name.replace(options.prefix || '', '').split('/');
    const folder = parts.slice(0, -1).join('/');

    folders[folder] = folders[folder] || [];
    folders[folder].push(file);
  });

  return folders;
};

// Convert a file row to HTML from XML data
const toRowFromXml = (item, indent = false, options) => {
  const fileNameTd = toFileNameTdFromXml(item, indent, options);
  const missingTd = toMissingTdFromXml(item, options);

  return `<tr><td>${fileNameTd}</td><td>${item.stmts}</td><td>${item.miss}</td><td>${item.cover}</td><td>${missingTd}</td></tr>`;
};

// Convert total row to HTML from XML data
const toTotalRowFromXml = (item) => {
  return `<tr><td><b>${item.name}</b></td><td><b>${item.stmts}</b></td><td><b>${item.miss}</b></td><td><b>${item.cover}</b></td><td>&nbsp;</td></tr>`;
};

// Convert file name to HTML with link from XML data
const toFileNameTdFromXml = (item, indent = false, options) => {
  const { repoUrl, commit, pathPrefix } = options;
  const indentStr = indent ? '&nbsp; &nbsp;' : '';
  const fileName = item.name.replace(options.prefix || '', '');

  const fileUrl = `${repoUrl}/blob/${commit}/${pathPrefix || ''}${fileName}`;
  return `${indentStr}<a href="${fileUrl}">${fileName}</a>`;
};

// Convert missing lines to HTML from XML data
const toMissingTdFromXml = (item, options) => {
  if (!item.missing) {
    return '&nbsp;';
  }

  const { repoUrl, commit, pathPrefix } = options;
  const fileName = item.name.replace(options.prefix || '', '');

  // Create links for missing lines
  const missingLinks = item.missing.split(', ').map((lineRange) => {
    const fileUrl = `${repoUrl}/blob/${commit}/${pathPrefix || ''}${fileName}#L${lineRange}`;
    return `<a href="${fileUrl}">${lineRange}</a>`;
  });

  return missingLinks.join(', ');
};

module.exports = {
  getCoverageXmlReport,
  extractTotalCoverageFromXml,
  parseFilesFromXml,
  getMissingLines,
  toHtmlFromXml,
  toTableFromXml,
  makeFoldersFromXml,
  toRowFromXml,
  toTotalRowFromXml,
  toFileNameTdFromXml,
  toMissingTdFromXml,
};
