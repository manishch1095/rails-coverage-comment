# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Rails Coverage Comment action
- Support for SimpleCov HTML coverage reports
- Support for SimpleCov XML coverage reports
- Test results parsing (JUnit and RSpec formats)
- Coverage badge with color coding
- Detailed file-by-file coverage breakdown
- Direct links to source files in repository
- Test summary with pass/fail/skip counts
- Option to show coverage only for changed files
- Comment updates instead of creating new ones
- Support for multiple coverage reports in monorepos
- Output variables for coverage percentage, color, and test statistics
- Comprehensive documentation and examples

### Features
- **Coverage Badge**: Shows coverage percentage with color-coded badges
- **Detailed Report**: HTML table with file-by-file coverage breakdown
- **File Links**: Direct links to source files in the repository
- **Test Summary**: Test results summary with pass/fail/skip counts
- **Changed Files Only**: Option to show coverage only for changed files
- **Comment Updates**: Updates existing comments instead of creating new ones
- **Multiple Reports**: Support for multiple coverage reports in monorepos
- **Multiple Formats**: Support for both HTML and XML coverage reports

### Technical Details
- Built with Node.js 20
- Uses @actions/core and @actions/github for GitHub Actions integration
- Uses xml2js for XML parsing
- Compiled with @vercel/ncc for single-file distribution
- Comprehensive error handling and logging
- Support for various GitHub event types (pull_request, push, workflow_dispatch, workflow_run) 