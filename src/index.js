const core = require('@actions/core');
const github = require('@actions/github');
const { getCoverageReport } = require('./parse');
const { getCoverageXmlReport } = require('./parseXml');
const {
  getSummaryReport,
  getParsedTestResults,
  getNotSuccessTestInfo,
} = require('./testResults');
const { getMultipleReport } = require('./multiFiles');

const MAX_COMMENT_LENGTH = 65536;
const FILE_STATUSES = Object.freeze({
  ADDED: 'added',
  MODIFIED: 'modified',
  REMOVED: 'removed',
  RENAMED: 'renamed',
});

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

// Get changed files for the PR
const getChangedFiles = async (options, pr_number) => {
  if (!pr_number) {
    return null;
  }

  try {
    const octokit = github.getOctokit(options.token);
    const { data: files } = await octokit.pulls.listFiles({
      repo: options.repository.split('/')[1],
      owner: options.repository.split('/')[0],
      pull_number: parseInt(pr_number),
    });

    return files.map((file) => file.filename);
  } catch (error) {
    core.error(`Error getting changed files: ${error.message}`);
    return null;
  }
};

// Main function
const main = async () => {
  const token = core.getInput('github-token', { required: true });
  const title = core.getInput('title', { required: false });
  const badgeTitle = core.getInput('badge-title', { required: false });
  const hideBadge = core.getBooleanInput('hide-badge', { required: false });
  const hideReport = core.getBooleanInput('hide-report', { required: false });
  const createNewComment = core.getBooleanInput('create-new-comment', {
    required: false,
  });
  const hideComment = core.getBooleanInput('hide-comment', { required: false });
  const xmlSkipCovered = core.getBooleanInput('xml-skip-covered', {
    required: false,
  });
  const reportOnlyChangedFiles = core.getBooleanInput(
    'report-only-changed-files',
    { required: false },
  );
  const removeLinkFromBadge = core.getBooleanInput('remove-link-from-badge', {
    required: false,
  });
  const uniqueIdForComment = core.getInput('unique-id-for-comment', {
    required: false,
  });
  const defaultBranch = core.getInput('default-branch', { required: false });
  const coveragePath = core.getInput('coverage-path', { required: false });
  const issueNumberInput = core.getInput('issue-number', { required: false });
  const coverageXmlPath = core.getInput('coverage-xml-path', {
    required: false,
  });
  const pathPrefix = core.getInput('coverage-path-prefix', { required: false });
  const testResultsPath = core.getInput('test-results-path', { required: false });
  const testResultsTitle = core.getInput('test-results-title', { required: false });
  const multipleFiles = core.getMultilineInput('multiple-files', {
    required: false,
  });

  const { context, repository } = github;
  const { repo, owner } = context.repo;
  const { eventName, payload } = context;
  const watermarkUniqueId = uniqueIdForComment
    ? `| ${uniqueIdForComment} `
    : '';
  const WATERMARK = `<!-- Rails Coverage Comment: ${context.job} ${watermarkUniqueId}-->\n`;
  let finalHtml = '';

  const options = {
    token,
    repository: repository || `${owner}/${repo}`,
    prefix: `${process.env.GITHUB_WORKSPACE}/`,
    pathPrefix,
    coveragePath,
    coverageXmlPath,
    testResultsPath,
    title,
    badgeTitle,
    hideBadge,
    hideReport,
    createNewComment,
    hideComment,
    xmlSkipCovered,
    reportOnlyChangedFiles,
    removeLinkFromBadge,
    defaultBranch,
    testResultsTitle,
    multipleFiles,
  };

  options.repoUrl =
    payload.repository?.html_url || `https://github.com/${options.repository}`;

  // Set commit and branch information based on event type
  if (eventName === 'pull_request' || eventName === 'pull_request_target') {
    options.commit = payload.pull_request.head.sha;
    options.head = payload.pull_request.head.ref;
    options.base = payload.pull_request.base.ref;
  } else if (eventName === 'push') {
    options.commit = payload.after;
    options.head = context.ref;
  } else if (eventName === 'workflow_dispatch') {
    options.commit = context.sha;
    options.head = context.ref;
  } else if (eventName === 'workflow_run') {
    options.commit = payload.workflow_run.head_sha;
    options.head = payload.workflow_run.head_branch;
  }

  // Get changed files if requested
  if (options.reportOnlyChangedFiles) {
    const changedFiles = await getChangedFiles(options, issueNumberInput);
    options.changedFiles = changedFiles;

    // If we can't get changed files, disable the feature
    if (!changedFiles) {
      options.reportOnlyChangedFiles = false;
    }
  }

  // Generate coverage report
  let report;
  if (options.coverageXmlPath) {
    report = await getCoverageXmlReport(options);
  } else {
    report = getCoverageReport(options);
  }

  const { coverage, color, html, warnings } = report;
  const summaryReport = await getSummaryReport(options);

  // Set outputs
  core.setOutput('coverage', coverage);
  core.setOutput('color', color);
  core.setOutput('warnings', warnings);

  if (summaryReport) {
    core.setOutput('summaryReport', summaryReport);
  }

  if (html) {
    const newOptions = { ...options, commit: defaultBranch };
    const output = getCoverageReport(newOptions);
    core.setOutput('coverageHtml', output.html);
  }

  // Set test results outputs
  if (testResultsPath) {
    const parsedResults = await getParsedTestResults(options);
    const { errors, failures, skipped, tests, time } = parsedResults;
    const valuesToExport = { errors, failures, skipped, tests, time };

    Object.entries(valuesToExport).forEach(([key, value]) => {
      core.info(`${key}: ${value}`);
      core.setOutput(key, value);
    });

    const notSuccessTestInfo = await getNotSuccessTestInfo(options);
    core.setOutput('notSuccessTestInfo', JSON.stringify(notSuccessTestInfo));
  }

  // Handle multiple files
  let multipleFilesHtml = '';
  if (multipleFiles && multipleFiles.length) {
    multipleFilesHtml = `\n\n${getMultipleReport(options)}`;
  }

  // Check comment length
  if (
    !options.hideReport &&
    html.length + summaryReport.length > MAX_COMMENT_LENGTH &&
    eventName !== 'workflow_dispatch' &&
    eventName !== 'workflow_run'
  ) {
    core.warning(`Your comment is too long (maximum is ${MAX_COMMENT_LENGTH} characters), coverage report will not be added.`);
    core.warning(`Try adding "hide-report: true" or "report-only-changed-files: true", or switch to "multiple-files" mode`);
    report = { ...report, html: '' };
  }

  // Build final comment
  if (!options.hideComment) {
    finalHtml = WATERMARK + html + summaryReport + multipleFilesHtml;
  }

  // Post comment if not hidden
  if (!options.hideComment && finalHtml) {
    const octokit = github.getOctokit(token);
    const issue_number = issueNumberInput || payload.pull_request?.number || payload.issue?.number;

    if (!issue_number) {
      core.error('No issue number found. Please provide issue-number input or run on a pull request.');
      return;
    }

    if (options.createNewComment) {
      core.info('Creating new comment');
      await octokit.issues.createComment({
        repo,
        owner,
        issue_number,
        body: finalHtml,
      });
    } else {
      await createOrEditComment(octokit, repo, owner, issue_number, finalHtml, WATERMARK);
    }
  }

  core.info('Rails Coverage Comment action completed successfully');
};

// Run the main function
main().catch((error) => {
  core.setFailed(error.message);
}); 