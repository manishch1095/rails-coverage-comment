const fs = require('fs');
const path = require('path');
const core = require('@actions/core');

/**
 * Parse SimpleCov coverage.json file
 * Based on the official SimpleCov JSON formatter format
 * @param {string} filePath - Path to coverage.json file
 * @param {boolean} includeFileDetails - Whether to include individual file details
 * @returns {Object} Parsed coverage data or null if error
 */
function parseSimpleCov(filePath, includeFileDetails = false) {
  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      core.warning(`SimpleCov coverage file not found: ${filePath}`);
      return null;
    }

    // Read and parse JSON
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Validate SimpleCov JSON structure
    if (!validateSimpleCovData(data)) {
      core.error(`Invalid SimpleCov JSON format in ${filePath}`);
      return null;
    }

    // Calculate overall summary
    const overall = calculateOverallSummary(data.files);

    // Group files by directory
    const groups = groupFilesByDirectory(data.files);

    // Generate individual file data (only if requested)
    const files = includeFileDetails ? generateFileData(data.files) : null;

    return { overall, groups, files };
  } catch (error) {
    core.error(`Error parsing SimpleCov file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Validate SimpleCov JSON data structure
 * @param {Object} data - Parsed JSON data
 * @returns {boolean} True if valid SimpleCov format
 */
function validateSimpleCovData(data) {
  // Check for required top-level fields
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check for files array
  if (!Array.isArray(data.files)) {
    return false;
  }

  // Validate each file object
  for (const file of data.files) {
    if (!validateFileData(file)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate individual file data structure
 * @param {Object} file - File coverage data
 * @returns {boolean} True if valid file format
 */
function validateFileData(file) {
  // Required fields for SimpleCov JSON format
  const requiredFields = [
    'filename',
    'covered_percent',
    'coverage',
    'covered_lines',
    'lines_of_code',
  ];

  for (const field of requiredFields) {
    if (!(field in file)) {
      return false;
    }
  }

  // Validate coverage object
  if (!file.coverage || typeof file.coverage !== 'object') {
    return false;
  }

  // Validate lines array exists
  if (!Array.isArray(file.coverage.lines)) {
    return false;
  }

  // Validate numeric fields
  const numericFields = ['covered_percent', 'covered_lines', 'lines_of_code'];
  for (const field of numericFields) {
    if (typeof file[field] !== 'number' || isNaN(file[field])) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate overall summary from all files
 * @param {Array} files - Array of file coverage data
 * @returns {Object} Overall summary
 */
function calculateOverallSummary(files) {
  let totalFiles = files.length;
  let totalLines = 0;
  let coveredLines = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  files.forEach((file) => {
    totalLines += file.lines_of_code;
    coveredLines += file.covered_lines;

    // Calculate branch coverage if available
    if (
      file.coverage.branches &&
      Object.keys(file.coverage.branches).length > 0
    ) {
      const branchData = calculateBranchCoverage(file.coverage.branches);
      totalBranches += branchData.total;
      coveredBranches += branchData.covered;
    }
  });

  return {
    files: totalFiles,
    lines: totalLines,
    covered: coveredLines,
    missed: totalLines - coveredLines,
    percentage:
      totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(2) : '0.00',
    branches:
      totalBranches > 0
        ? {
            total: totalBranches,
            covered: coveredBranches,
            missed: totalBranches - coveredBranches,
            percentage: ((coveredBranches / totalBranches) * 100).toFixed(2),
          }
        : null,
  };
}

/**
 * Calculate branch coverage for a file
 * @param {Object} branches - Branch coverage data
 * @returns {Object} Branch summary
 */
function calculateBranchCoverage(branches) {
  let total = 0;
  let covered = 0;

  Object.values(branches).forEach((branchGroup) => {
    if (typeof branchGroup === 'object' && branchGroup !== null) {
      Object.values(branchGroup).forEach((count) => {
        if (typeof count === 'number') {
          total++;
          if (count > 0) {
            covered++;
          }
        }
      });
    }
  });

  return { total, covered };
}

/**
 * Group files by directory (Controllers, Models, Jobs, etc.)
 * @param {Array} files - Array of file coverage data
 * @returns {Array} Grouped files with statistics
 */
function groupFilesByDirectory(files) {
  const groups = {};

  files.forEach((file) => {
    const dir = extractDirectory(file.filename);
    if (!groups[dir]) {
      groups[dir] = { files: 0, lines: 0, covered: 0, missed: 0 };
    }
    groups[dir].files++;
    groups[dir].lines += file.lines_of_code;
    groups[dir].covered += file.covered_lines;
    groups[dir].missed += file.lines_of_code - file.covered_lines;
  });

  // Convert to array and calculate percentages
  return Object.entries(groups)
    .map(([name, data]) => ({
      name,
      ...data,
      percentage:
        data.lines > 0 ? ((data.covered / data.lines) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.lines - a.lines); // Sort by line count descending
}

/**
 * Extract directory name from file path
 * Simple and robust directory extraction for any project structure
 * @param {string} filePath - Full file path
 * @returns {string} Directory name
 */
function extractDirectory(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return 'Other';
  }

  // Split path and handle both Unix and Windows separators
  const parts = filePath.split(/[/\\]/);

  // Look for common Rails/application directories
  const appIndex = parts.findIndex((part) => part === 'app');
  const libIndex = parts.findIndex((part) => part === 'lib');
  const specIndex = parts.findIndex((part) => part === 'spec');
  const testIndex = parts.findIndex((part) => part === 'test');

  let dir = null;

  // Extract directory after common Rails directories
  if (appIndex !== -1 && appIndex + 1 < parts.length) {
    dir = parts[appIndex + 1];
  } else if (libIndex !== -1 && libIndex + 1 < parts.length) {
    dir = parts[libIndex + 1];
  } else if (specIndex !== -1 && specIndex + 1 < parts.length) {
    dir = parts[specIndex + 1];
  } else if (testIndex !== -1 && testIndex + 1 < parts.length) {
    dir = parts[testIndex + 1];
  } else if (parts.length >= 2) {
    // Fallback: use second to last part (parent directory of file)
    dir = parts[parts.length - 2];
  }

  // Capitalize first letter and return
  if (dir) {
    return dir.charAt(0).toUpperCase() + dir.slice(1);
  }

  return 'Other';
}

/**
 * Generate file-level data (only when requested)
 * @param {Array} files - Array of file coverage data
 * @returns {Array} File details
 */
function generateFileData(files) {
  return files
    .map((file) => ({
      name: extractFileName(file.filename),
      path: file.filename,
      lines: file.lines_of_code,
      covered: file.covered_lines,
      missed: file.lines_of_code - file.covered_lines,
      percentage: file.covered_percent.toFixed(1),
      missedLines: extractMissedLines(file.coverage.lines),
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)); // Sort by coverage descending
}

/**
 * Extract file name from full path
 * @param {string} filePath - Full file path
 * @returns {string} File name
 */
function extractFileName(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return 'unknown';
  }
  return path.basename(filePath);
}

/**
 * Extract missed line numbers
 * @param {Array} lineCoverage - Line coverage array
 * @returns {Array} Array of missed line numbers
 */
function extractMissedLines(lineCoverage) {
  if (!Array.isArray(lineCoverage)) {
    return [];
  }

  return lineCoverage
    .map((coverage, index) => ({ line: index + 1, coverage }))
    .filter((line) => line.coverage === 0)
    .map((line) => line.line);
}

module.exports = {
  parseSimpleCov,
  calculateOverallSummary,
  groupFilesByDirectory,
  generateFileData,
};
