const core = require('@actions/core');

// Mock GitHub context for testing
const mockContext = {
  job: 'test-job',
  repo: { repo: 'rails-coverage-comment', owner: 'manishchauhan' },
  eventName: 'pull_request',
  payload: { pull_request: { number: 123 } },
};

// Mock GitHub API with changed files
const mockOctokit = {
  issues: {
    listComments: async () => ({ data: [] }),
    createComment: async (params) => {
      console.log('=== COMMENT BODY (CHANGED FILES ONLY) ===');
      console.log(params.body);
      console.log('=== END COMMENT ===');
    },
  },
  pulls: {
    listFiles: async () => ({
      data: [
        { filename: 'app/controllers/users_controller.rb' },
        { filename: 'app/models/user.rb' },
        { filename: 'app/services/user_service.rb' },
        { filename: 'spec/controllers/users_controller_spec.rb' },
        { filename: 'README.md' }, // This should be filtered out (not .rb)
      ],
    }),
  },
};

// Mock GitHub module
const mockGithub = {
  getOctokit: () => mockOctokit,
  context: mockContext,
};

// Override the GitHub module
require.cache[require.resolve('@actions/github')] = {
  exports: mockGithub,
};

// Test the action with report-only-changed-files enabled
async function testChangedFiles() {
  console.log('Testing with report-only-changed-files enabled...');

  // Set up inputs as environment variables
  process.env.INPUT_GITHUB_TOKEN = 'test-token';
  process.env.INPUT_COVERAGE_FILE =
    '/Users/manishchauhan/projects/title_chaining/coverage/coverage.json';
  process.env.INPUT_REPORT_ONLY_CHANGED_FILES = 'true';
  process.env.INPUT_INCLUDE_FILE_DETAILS = 'false';
  process.env.INPUT_MAX_FILES_TO_SHOW = '10';
  process.env.INPUT_INCLUDE_LAST_RUN = 'true';
  process.env.INPUT_LAST_RUN_TITLE = 'SimpleCov Coverage Metrics';
  process.env.INPUT_TITLE = 'Changed Files Coverage Report';
  process.env.INPUT_HIDE_COMMENT = 'false';

  // Mock the core.getInput function
  core.getInput = (name, options) => {
    const envVar = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envVar];
    if (options && options.required && !value) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value || '';
  };

  // Mock the core.getBooleanInput function
  core.getBooleanInput = (name, options) => {
    const value = core.getInput(name, options);
    return value === 'true';
  };

  // Mock the core.getMultilineInput function
  core.getMultilineInput = (name, options) => {
    const value = core.getInput(name, options);
    return value ? value.split('\n') : [];
  };

  // Mock core.info and core.error to just log
  core.info = console.log;
  core.error = console.error;
  core.warning = console.warn;
  core.setOutput = (name, value) => console.log(`Output ${name}: ${value}`);

  // Run the main action
  try {
    require('../src/index.js');
  } catch (error) {
    console.error('Error running action:', error);
  }
}

testChangedFiles();
