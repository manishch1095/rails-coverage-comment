const core = require('@actions/core');

// Mock GitHub context for testing
const mockContext = {
  job: 'test-job',
  repo: { repo: 'rails-coverage-comment', owner: 'manishchauhan' },
  eventName: 'pull_request',
  payload: { pull_request: { number: 123 } },
};

// Mock GitHub API
const mockOctokit = {
  issues: {
    listComments: async () => ({ data: [] }),
    createComment: async (params) => {
      console.log('=== CI COMMENT BODY ===');
      console.log(params.body);
      console.log('=== END CI COMMENT ===');
    },
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

// Test the action with CI workflow parameters
async function testCIOutput() {
  console.log('Testing CI workflow output...');

  // Set up inputs exactly as the CI workflow does
  process.env.INPUT_GITHUB_TOKEN = 'test-token';
  process.env.INPUT_COVERAGE_FILE = './tests/test-data/coverage/coverage.json';
  process.env.INPUT_TEST_RESULTS_PATH = './tests/test-data/test-results.xml';
  process.env.INPUT_INCLUDE_LAST_RUN = 'true';
  process.env.INPUT_LAST_RUN_TITLE = 'SimpleCov Coverage Metrics';
  process.env.INPUT_INCLUDE_FILE_DETAILS = 'true';
  process.env.INPUT_MAX_FILES_TO_SHOW = '10';
  process.env.INPUT_TITLE = 'Coverage Report';
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

testCIOutput();
