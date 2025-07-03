const fs = require('fs');
const path = require('path');

// Get the path to a file, handling both relative and absolute paths
const getPathToFile = (filePath) => {
  if (!filePath) {
    return null;
  }

  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.resolve(process.cwd(), filePath);
};

// Read file content
const getContentFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
};

// Get coverage color based on percentage
const getCoverageColor = (coverage) => {
  const percentage = parseFloat(coverage);

  if (percentage >= 90) {
    return 'brightgreen';
  } else if (percentage >= 80) {
    return 'green';
  } else if (percentage >= 70) {
    return 'yellowgreen';
  } else if (percentage >= 60) {
    return 'yellow';
  } else if (percentage >= 50) {
    return 'orange';
  } else {
    return 'red';
  }
};

// Extract percentage from coverage string
const extractPercentage = (coverageString) => {
  if (!coverageString) return '0';

  const match = coverageString.match(/(\d+(?:\.\d+)?)%/);
  return match ? match[1] : '0';
};

// Format time in seconds to human readable format
const formatTime = (seconds) => {
  if (!seconds) return '0s';

  const numSeconds = parseFloat(seconds);
  if (numSeconds < 60) {
    return `${numSeconds.toFixed(3)}s`;
  } else if (numSeconds < 3600) {
    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = numSeconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  } else {
    const hours = Math.floor(numSeconds / 3600);
    const remainingMinutes = Math.floor((numSeconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  }
};

// Check if a file exists
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

// Get file extension
const getFileExtension = (filePath) => {
  return path.extname(filePath).toLowerCase();
};

// Sanitize HTML content
const sanitizeHtml = (html) => {
  if (!html) return '';

  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

module.exports = {
  getPathToFile,
  getContentFile,
  getCoverageColor,
  extractPercentage,
  formatTime,
  fileExists,
  getFileExtension,
  sanitizeHtml,
};
