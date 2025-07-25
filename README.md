# Rails Coverage Comment

<!-- Test PR comment functionality -->

![license](https://img.shields.io/github/license/manishchauhan/rails-coverage-comment)
![version](https://img.shields.io/github/package-json/v/manishchauhan/rails-coverage-comment)

This GitHub Action comments a pull request with a HTML test coverage report based on SimpleCov coverage reports generated by your Rails test runner.

**Note:** This action does not run any tests, but expects the tests to have been run by another action already and SimpleCov coverage reports to be generated.

## Features

- 📊 **Coverage Badge**: Shows coverage percentage with color-coded badges
- 📋 **Detailed Report**: HTML table with file-by-file coverage breakdown
- 🔗 **File Links**: Direct links to source files in the repository
- 📈 **Test Summary**: Test results summary with pass/fail/skip counts
- 🎯 **Changed Files Only**: Option to show coverage only for changed files
- 🔄 **Comment Updates**: Updates existing comments instead of creating new ones
- 📁 **Multiple Reports**: Support for multiple coverage reports in monorepos
- 📄 **Multiple Formats**: Support for both HTML and XML coverage reports
- ✨ **Clean Code**: Well-tested and lint-free implementation

## Quick Start

Add this action to your GitHub workflow for Ubuntu runners:

```yaml
- name: Rails coverage comment
  uses: manishch1095/rails-coverage-comment@v1.0.0
  with:
    coverage-path: ./coverage/index.html
    test-results-path: ./test-results.xml
```

## Inputs

| Name                        | Required | Default                 | Description                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-token`              | ✓        | `${{github.token}}`     | GitHub API Access Token                                                                                                                                                                                                                                                                                                                                                             |
| `coverage-path`             |          | `./coverage/index.html` | The location of the SimpleCov HTML coverage report                                                                                                                                                                                                                                                                                                                                  |
| `coverage-xml-path`         |          | ''                      | The location of SimpleCov XML coverage report (coverage/coverage.xml)                                                                                                                                                                                                                                                                                                                |
| `test-results-path`         |          | ''                      | The location of test results XML file                                                                                                                                                                                                                                                                                                                                               |
| `issue-number`              |          | ''                      | PR Number where you'd like your comments to be posted to. Required to post a comment when running the workflow on an event that isn't `push` or `pull-request`.                                                                                                                                                                                                                    |
| `coverage-path-prefix`      |          | ''                      | Prefix for path when linking to files in comment                                                                                                                                                                                                                                                                                                                                    |
| `title`                     |          | `Coverage Report`       | Title for the coverage report. Useful for monorepo projects                                                                                                                                                                                                                                                                                                                         |
| `badge-title`               |          | `Coverage`              | Title for the badge icon                                                                                                                                                                                                                                                                                                                                                            |
| `hide-badge`                |          | false                   | Hide badge with percentage                                                                                                                                                                                                                                                                                                                                                          |
| `hide-report`               |          | false                   | Hide coverage report                                                                                                                                                                                                                                                                                                                                                                |
| `report-only-changed-files` |          | false                   | Show in report only changed files for this commit, and not all files                                                                                                                                                                                                                                                                                                                |
| `test-results-title`        |          | ''                      | Title for summary for test results                                                                                                                                                                                                                                                                                                                                                  |
| `create-new-comment`        |          | false                   | When false, will update the same comment, otherwise will publish new comment on each run.                                                                                                                                                                                                                                                                                           |
| `hide-comment`              |          | false                   | Hide the whole comment (use when you need only the `output`). Useful for auto-update badges in readme.                                                                                                                                                                                                                                                                              |
| `xml-skip-covered`          |          | false                   | Hide files from xml report with 100% coverage                                                                                                                                                                                                                                                                                                                                       |
| `default-branch`            |          | `main`                  | This branch name is useful when generating "coverageHtml", it points direct links to files on this branch (instead of commit). Usually "main" or "master"                                                                                                                                                                                                                         |
| `multiple-files`            |          | ''                      | You can pass array of titles and files to generate single comment with table of results. Single line should look like `Title, ./path/to/coverage/index.html, ./path/to/test-results.xml`                                                                                                                                                                                             |
| `remove-link-from-badge`    |          | false                   | When true, it will remove the link from badge to readme                                                                                                                                                                                                                                                                                                                             |
| `unique-id-for-comment`     |          | ''                      | When running in a matrix, pass the matrix value, so each comment will be updated its own comment `unique-id-for-comment: ${{ matrix.ruby-version }}`                                                                                                                                                                                                                              |
| `include-last-run`          |          | false                   | Include SimpleCov .last_run.json data in the comment (shows line and branch coverage)                                                                                                                                                                                                                                                                                               |
| `last-run-title`            |          | 'Last Run Coverage'      | Title for the last run coverage section                                                                                                                                                                                                                                                                                                                                             |

## Output Variables

| Name                 | Example                        | Description                                                                           |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `coverage`           | 85.5%                          | Percentage of the coverage, get from SimpleCov                                       |
| `color`              | green                          | Color of the percentage. See the [badge colors](#badges-colors)                      |
| `coverageHtml`       | ...                            | Html with links to files of missing lines. See the [output-example](#output-example) |
| `summaryReport`      | ...                            | Markdown with summary of: Tests/Skipped/Failures/Errors/Time                         |
| `warnings`           | 0                              | Number of warnings, get from SimpleCov                                               |
| `tests`              | 109                            | Total number of tests, get from test results                                         |
| `skipped`            | 2                              | Total number of skipped tests, get from test results                                 |
| `failures`           | 1                              | Total number of tests with failures, get from test results                           |
| `errors`             | 0                              | Total number of tests with errors, get from test results                             |
| `time`               | 0.583                          | Seconds it took to run all the tests, get from test results                          |
| `notSuccessTestInfo` | [example](#notSuccessTestInfo) | Info from testcase that has failures/errors/skipped, get from test results           |
| `line-coverage`      | 93.3%                          | Line coverage percentage from .last_run.json                                         |
| `branch-coverage`    | 76.8%                          | Branch coverage percentage from .last_run.json                                       |

### notSuccessTestInfo

The format will be JSON.stringify in current structure:

```json
{
  "failures": [{ "classname": "...", "name": "..." }],
  "errors": [{ "classname": "...", "name": "..." }],
  "skipped": [{ "classname": "...", "name": "..." }],
  "count": 3
}
```

## Badge Colors

| Coverage | Color        |
| -------- | ------------ |
| 90-100%  | brightgreen  |
| 80-89%   | green        |
| 70-79%   | yellowgreen  |
| 60-69%   | yellow       |
| 50-59%   | orange       |
| 0-49%    | red          |

## Output Example

<img alt="Coverage" src="https://img.shields.io/badge/Coverage-85.5%25-green.svg" /><br/><details><summary>Coverage Report</summary><table><tr><th>File</th><th>Stmts</th><th>Miss</th><th>Cover</th><th>Missing</th></tr><tbody><tr><td colspan="5"><b>app/controllers</b></td></tr><tr><td>&nbsp; &nbsp;<a href="https://github.com/example/repo/blob/main/app/controllers/application_controller.rb">application_controller.rb</a></td><td>10</td><td>0</td><td>100%</td><td>&nbsp;</td></tr><tr><td>&nbsp; &nbsp;<a href="https://github.com/example/repo/blob/main/app/controllers/users_controller.rb">users_controller.rb</a></td><td>25</td><td>3</td><td>88%</td><td><a href="https://github.com/example/repo/blob/main/app/controllers/users_controller.rb#L15">15</a>, <a href="https://github.com/example/repo/blob/main/app/controllers/users_controller.rb#L22-24">22-24</a></td></tr><tr><td><b>TOTAL</b></td><td><b>35</b></td><td><b>3</b></td><td><b>85.5%</b></td><td>&nbsp;</td></tr></tbody></table></details>

| Test Results | Skipped | Failures | Errors   | Time               |
| ------------ | ------- | -------- | -------- | ------------------ |
| 109          | 2 :zzz: | 1 :x:    | 0 :fire: | 0.583s :stopwatch: |

## Example Usage

### Basic Rails Setup with RSpec

```yaml
name: Rails Coverage Comment
on:
  pull_request:
    branches:
      - '*'

permissions:
  contents: write
  checks: write
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install dependencies
        run: |
          bundle install

      - name: Run tests with coverage
        run: |
          bundle exec rspec --format progress --format RspecJunitFormatter --out test-results.xml

      - name: Rails coverage comment
        uses: manishch1095/rails-coverage-comment@v1.0.0
        with:
          coverage-path: ./coverage/index.html
          test-results-path: ./test-results.xml
```

### Rails Setup with Minitest

```yaml
name: Rails Coverage Comment
on:
  pull_request:
    branches:
      - '*'

permissions:
  contents: write
  checks: write
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install dependencies
        run: |
          bundle install

      - name: Run tests with coverage
        run: |
          bundle exec rails test --format=JUnit --out=test-results.xml

      - name: Rails coverage comment
        uses: manishch1095/rails-coverage-comment@v1.0.0
        with:
          coverage-path: ./coverage/index.html
          test-results-path: ./test-results.xml
```

### Using XML Coverage Report

```yaml
- name: Rails coverage comment
  uses: manishch1095/rails-coverage-comment@v1.0.0
  with:
    coverage-xml-path: ./coverage/coverage.xml
```

### Using Coverage Output Variables

```yaml
- name: Rails coverage comment
  id: coverageComment
  uses: manishch1095/rails-coverage-comment@v1.0.0
  with:
    coverage-path: ./coverage/index.html
    test-results-path: ./test-results.xml

- name: Check the output coverage
  run: |
    echo "Coverage Percentage - ${{ steps.coverageComment.outputs.coverage }}"
    echo "Coverage Color - ${{ steps.coverageComment.outputs.color }}"
    echo "Coverage Html - ${{ steps.coverageComment.outputs.coverageHtml }}"
    echo "Summary Report - ${{ steps.coverageComment.outputs.summaryReport }}"
    echo "Coverage Warnings - ${{ steps.coverageComment.outputs.warnings }}"
    echo "Coverage Errors - ${{ steps.coverageComment.outputs.errors }}"
    echo "Coverage Failures - ${{ steps.coverageComment.outputs.failures }}"
    echo "Coverage Skipped - ${{ steps.coverageComment.outputs.skipped }}"
    echo "Coverage Tests - ${{ steps.coverageComment.outputs.tests }}"
    echo "Coverage Time - ${{ steps.coverageComment.outputs.time }}"
    echo "Not Success Test Info - ${{ steps.coverageComment.outputs.notSuccessTestInfo }}"
```

### Using SimpleCov .last_run.json

```yaml
- name: Rails coverage comment
  id: coverageComment
  uses: manishch1095/rails-coverage-comment@v1.0.0
  with:
    coverage-path: ./coverage/index.html
    test-results-path: ./test-results.xml
    include-last-run: true
    last-run-title: 'Coverage Metrics'

- name: Check last run coverage
  run: |
    echo "Line Coverage - ${{ steps.coverageComment.outputs.line-coverage }}"
    echo "Branch Coverage - ${{ steps.coverageComment.outputs.branch-coverage }}"
```

### Multiple Coverage Reports (Monorepo)

```yaml
- name: Rails coverage comment
  uses: manishch1095/rails-coverage-comment@v1.0.0
  with:
    multiple-files: |
      API Coverage, ./api/coverage/index.html, ./api/test-results.xml
      Web Coverage, ./web/coverage/index.html, ./web/test-results.xml
      Admin Coverage, ./admin/coverage/index.html, ./admin/test-results.xml
```

### Only Changed Files

```yaml
- name: Rails coverage comment
  uses: manishch1095/rails-coverage-comment@v1.0.0
  with:
    coverage-path: ./coverage/index.html
    report-only-changed-files: true
```

## SimpleCov Configuration

Make sure your `spec_helper.rb` or `test_helper.rb` includes SimpleCov configuration:

```ruby
require 'simplecov'
SimpleCov.start 'rails' do
  add_filter '/bin/'
  add_filter '/db/'
  add_filter '/spec/' # for RSpec
  add_filter '/test/' # for Minitest
  
  add_group 'Controllers', 'app/controllers'
  add_group 'Models', 'app/models'
  add_group 'Helpers', 'app/helpers'
  add_group 'Libraries', 'lib'
end
```

For XML output, add this to your SimpleCov configuration:

```ruby
SimpleCov.formatter = SimpleCov::Formatter::MultiFormatter.new([
  SimpleCov::Formatter::HTMLFormatter,
  SimpleCov::Formatter::XMLFormatter
])
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [pytest-coverage-comment](https://github.com/MishaKav/pytest-coverage-comment)
- Built for the Rails community

<!-- Testing PR comment functionality with new features --> 

<!-- Test PR comment generation --> 
