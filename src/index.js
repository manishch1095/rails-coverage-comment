const core = require('@actions/core');
const github = require('@actions/github');
const ParserManager = require('./parsers');
const { getMultipleReport } = require('./multiFiles');

const MAX_COMMENT_LENGTH = 65536;

// Get coverage color based on percentage
const getCoverageColor = (percentage) => {
  if (percentage >= 90) return 'brightgreen';
  if (percentage >= 80) return 'green';
  if (percentage >= 70) return 'yellowgreen';
  if (percentage >= 60) return 'yellow';
  if (percentage >= 50) return 'orange';
  return 'red';
};

// Generate coverage summary HTML
const generateCoverageSummary = (coverageData, options = {}) => {
  if (!coverageData) return '';

  const { overall, groups } = coverageData;
  const { title = 'Coverage Report' } = options;

  let html = '## ' + title + '\n\n';
  html += 'Code coverage analysis completed successfully.\n\n';

  // Overall summary
  html += '### Overall Summary\n\n';
  html += '| Metric | Value |\n';
  html += '|--------|-------|\n';
  html += '| Files | ' + overall.files + ' |\n';
  html += '| Lines | ' + overall.lines + ' |\n';
  html += '| Covered | ' + overall.covered + ' |\n';
  html += '| Missed | ' + overall.missed + ' |\n';
  html += '| **Coverage** | **' + overall.percentage + '%** |\n';

  if (overall.branches) {
    html +=
      '| **Branch Coverage** | **' + overall.branches.percentage + '%** |\n';
  }

  html += '\n';

  // Group breakdown
  if (groups && groups.length > 0) {
    html += '### Coverage by Category\n\n';
    html += '| Category | Files | Lines | Covered | Missed | Coverage |\n';
    html += '|----------|-------|-------|---------|--------|----------|\n';

    groups.forEach((group) => {
      html +=
        '| ' +
        group.name +
        ' | ' +
        group.files +
        ' | ' +
        group.lines +
        ' | ' +
        group.covered +
        ' | ' +
        group.missed +
        ' | ' +
        group.percentage +
        '% |\n';
    });

    html += '\n';
  }

  return html;
};

// Generate file details HTML
const generateFileDetails = (coverageData, options = {}) => {
  if (!coverageData || !coverageData.files) return '';

  const { files, filesTruncated } = coverageData;
  const { maxFilesToShow = 50 } = options;

  let html = '### File Coverage Details\n\n';
  html += 'Individual file coverage breakdown:\n\n';
  html += '| File | Lines | Covered | Missed | Coverage |\n';
  html += '|------|-------|---------|--------|----------|\n';

  files.forEach((file) => {
    html +=
      '| `' +
      file.name +
      '` | ' +
      file.lines +
      ' | ' +
      file.covered +
      ' | ' +
      file.missed +
      ' | ' +
      file.percentage +
      '% |\n';
  });

  if (filesTruncated) {
    html +=
      '\n*Showing first ' +
      maxFilesToShow +
      ' files. Enable `include-file-details: true` to see all files.*\n';
  }

  html += '\n';
  return html;
};

// Generate last run coverage HTML
const generateLastRunSection = (lastRunData, options = {}) => {
  if (!lastRunData) return '';
  const { title = 'Last Run Coverage', hideBadge = false } = options;
  const { line, branch } = lastRunData;

  let html = '## ' + title + '\n\n';

  if (!hideBadge) {
    html +=
      '![Line Coverage](https://img.shields.io/badge/Line-' +
      line.toFixed(1) +
      '%25-' +
      getCoverageColor(line) +
      ')\n';
    html +=
      '![Branch Coverage](https://img.shields.io/badge/Branch-' +
      branch.toFixed(1) +
      '%25-' +
      getCoverageColor(branch) +
      ')\n\n';
  }

  html += '| Coverage Type | Percentage |\n';
  html += '|---------------|------------|\n';
  html += '| Line | ' + line.toFixed(1) + '% |\n';
  html += '| Branch | ' + branch.toFixed(1) + '% |\n\n';
  return html;
};

// Generate test results HTML
const generateTestResultsSection = (testResults, options = {}) => {
  if (!testResults) return '';
  const { title = 'Test Results' } = options;
  const { tests, errors, failures, skipped, time } = testResults;
  
  let html = '## ' + title + '\n\n';
  html += '**Test Execution Summary:**\n\n';
  html += '📊 **Total Tests:** ' + tests + '\n';
  html += '❌ **Failures:** ' + failures + '\n';
  html += '⚠️ **Errors:** ' + errors + '\n';
  html += '⏭️ **Skipped:** ' + skipped + '\n';
  html += '⏱️ **Execution Time:** ' + time + 's\n\n';
  
  // Add status summary
  if (failures === 0 && errors === 0) {
    html += '✅ **Status:** All tests passed successfully!\n\n';
  } else {
    html += '❌ **Status:** Some tests failed or encountered errors.\n\n';
  }
  
  return html;
};

// Create or edit a comment on a PR
const createOrEditComment = async (
  octokit,
  repo,
  owner,
  issue_number,
  body,
  WATERMARK,
) => {
  // Check if we should create a new comment or edit an existing one
  const { data: comments } = await octokit.issues.listComments({
    repo,
    owner,
    issue_number,
  });

  const comment = comments.find((c) => c.body.startsWith(WATERMARK));

  if (comment) {
    core.info('Found previous comment, updating');
    await octokit.issues.updateComment({
      repo,
      owner,
      comment_id: comment.id,
      body,
    });
  } else {
    core.info('No previous comment found, creating a new one');
    await octokit.issues.createComment({
      repo,
      owner,
      issue_number,
      body,
    });
  }
};

// Main function
const main = async () => {
  const token = core.getInput('github-token', { required: true });
  const title = core.getInput('title', { required: false });

  const hideBadge = core.getBooleanInput('hide-badge', { required: false });
  const hideReport = core.getBooleanInput('hide-report', { required: false });
  const coverageFile = core.getInput('coverage-file', { required: false });
  const includeFileDetails = core.getBooleanInput('include-file-details', {
    required: false,
  });
  const maxFilesToShow =
    parseInt(core.getInput('max-files-to-show', { required: false })) || 50;
  const includeLastRun = core.getBooleanInput('include-last-run', {
    required: false,
  });
  const lastRunTitle =
    core.getInput('last-run-title', { required: false }) || 'Last Run Coverage';
  const testResultsPath = core.getInput('test-results-path', {
    required: false,
  });
  const testResultsTitle =
    core.getInput('test-results-title', { required: false }) || 'Test Results';
  const issueNumberInput = core.getInput('issue-number', { required: false });
  const hideComment = core.getBooleanInput('hide-comment', { required: false });
  const createNewComment = core.getBooleanInput('create-new-comment', {
    required: false,
  });
  const uniqueIdForComment = core.getInput('unique-id-for-comment', {
    required: false,
  });
  const multipleFiles = core.getMultilineInput('multiple-files', {
    required: false,
  });

  const { context, repository } = github;
  const { repo, owner } = context.repo;
  const { eventName, payload } = context;
  const watermarkUniqueId = uniqueIdForComment
    ? '| ' + uniqueIdForComment + ' '
    : '';
  const WATERMARK =
    '<!-- Rails Coverage Comment: ' +
    context.job +
    ' ' +
    watermarkUniqueId +
    '-->\n';
  let finalHtml = '';

  // Initialize parser manager and parse all available data
  const parserManager = new ParserManager();
  const parsedData = await parserManager.autoDetectAndParse({
    coverageFile: coverageFile,
    includeFileDetails: includeFileDetails,
    maxFilesToShow: maxFilesToShow,
    lastRunFile: 'coverage/.last_run.json',
    testResultsFile: testResultsPath || 'test-results.xml',
  });

  // Generate coverage section
  let coverageHtml = '';
  if (parsedData.coverage && !hideReport) {
    core.info('Coverage data found and report not hidden');
    coverageHtml = generateCoverageSummary(parsedData.coverage, {
      title: title,
      hideBadge: hideBadge,
    });
    // Add file details if requested
    if (includeFileDetails && parsedData.coverage.files) {
      coverageHtml += generateFileDetails(parsedData.coverage, {
        maxFilesToShow: maxFilesToShow,
      });
    }
    // Set coverage outputs
    const { overall } = parsedData.coverage;
    core.setOutput('coverage', overall.percentage + '%');
    core.setOutput('color', getCoverageColor(parseFloat(overall.percentage)));
    core.setOutput('warnings', '0');
  } else {
    core.info('Coverage data not found or report is hidden');
    core.info('parsedData.coverage:', !!parsedData.coverage);
    core.info('hideReport:', hideReport);
  }

  // Generate last run section
  let lastRunHtml = '';
  if (includeLastRun && parsedData.lastRun) {
    lastRunHtml = generateLastRunSection(parsedData.lastRun, {
      title: lastRunTitle,
      hideBadge: hideBadge,
    });
    core.setOutput('line-coverage', parsedData.lastRun.line.toFixed(1) + '%');
    core.setOutput(
      'branch-coverage',
      parsedData.lastRun.branch.toFixed(1) + '%',
    );
  }

  // Generate test results section
  let testResultsHtml = '';
  if (parsedData.testResults) {
    testResultsHtml = generateTestResultsSection(parsedData.testResults, {
      title: testResultsTitle,
    });
    // Set test results outputs
    const { errors, failures, skipped, tests, time } = parsedData.testResults;
    const valuesToExport = { errors, failures, skipped, tests, time };
    Object.entries(valuesToExport).forEach(([key, value]) => {
      core.info(key + ': ' + value);
      core.setOutput(key, value);
    });
  }

  // Handle multiple files (legacy support)
  let multipleFilesHtml = '';
  if (multipleFiles && multipleFiles.length) {
    const options = {
      token,
      repository: repository || owner + '/' + repo,
      prefix: process.env.GITHUB_WORKSPACE + '/',
      multipleFiles,
    };
    multipleFilesHtml = '\n\n' + getMultipleReport(options);
  }

  // Check comment length
  const totalLength =
    coverageHtml.length +
    lastRunHtml.length +
    testResultsHtml.length +
    multipleFilesHtml.length;
  if (
    totalLength > MAX_COMMENT_LENGTH &&
    eventName !== 'workflow_dispatch' &&
    eventName !== 'workflow_run'
  ) {
    core.warning(
      'Your comment is too long (maximum is ' +
        MAX_COMMENT_LENGTH +
        ' characters), some sections will be truncated.',
    );
    core.warning(
      'Try adding "hide-report: true" or "include-file-details: false" to reduce comment size.',
    );
  }

  // Combine all sections
  finalHtml =
    WATERMARK +
    '\n\n' +
    coverageHtml +
    '\n\n' +
    testResultsHtml +
    '\n\n' +
    lastRunHtml +
    '\n\n' +
    multipleFilesHtml;

  // Post comment if not hidden
  if (!hideComment && finalHtml) {
    const octokit = github.getOctokit(token);
    const issue_number =
      issueNumberInput || payload.pull_request?.number || payload.issue?.number;

    if (!issue_number) {
      core.error(
        'No issue number found. Please provide issue-number input or run on a pull request.',
      );
      return;
    }

    if (createNewComment) {
      core.info('Creating new comment');
      await octokit.issues.createComment({
        repo,
        owner,
        issue_number,
        body: finalHtml,
      });
    } else {
      await createOrEditComment(
        octokit,
        repo,
        owner,
        issue_number,
        finalHtml,
        WATERMARK,
      );
    }
  }

  core.info('Rails Coverage Comment action completed successfully');
  core.info('Coverage HTML: ' + coverageHtml);
  if (lastRunHtml) core.info('Last Run HTML: ' + lastRunHtml);
  if (testResultsHtml) core.info('Test Results HTML: ' + testResultsHtml);
  if (multipleFilesHtml) core.info('Multiple Files HTML: ' + multipleFilesHtml);
};

// Run the main function
main().catch((error) => {
  core.setFailed(error.message);
});
