# Development Guide

This document provides comprehensive instructions for developing and testing the Rails Coverage Comment GitHub Action.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rails-coverage-comment.git
   cd rails-coverage-comment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install development dependencies**
   ```bash
   npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-jsdoc
   ```

## Development Workflow

### Code Quality

1. **Linting**
   ```bash
   npm run lint          # Check for linting issues
   npm run lint:fix      # Auto-fix linting issues
   ```

2. **Formatting**
   ```bash
   npm run format        # Format code with Prettier
   npm run format:check  # Check if code is formatted
   ```

3. **Type Checking**
   - ESLint with JSDoc plugin provides type checking
   - All functions should have proper JSDoc comments

### Testing

The project includes multiple test suites:

1. **CI Output Test** - Tests the main action with mock GitHub context
   ```bash
   npm run test
   ```

2. **Parser Tests** - Tests individual parsers with test data
   ```bash
   npm run test:parsers
   ```

3. **Edge Case Tests** - Tests error handling and edge cases
   ```bash
   npm run test:edge-cases
   ```

4. **Run All Tests**
   ```bash
   npm run test:all
   ```

### Test Data

Test data is located in the `test-data/` directory:
- `coverage/coverage.json` - Sample SimpleCov coverage data
- `coverage/.last_run.json` - Sample last run data
- `test-results.xml` - Sample test results XML

### Building

Build the action for distribution:
```bash
npm run build
```

This creates a single file with all dependencies bundled.

## Architecture

### ParserManager (`src/parsers/index.js`)
- Coordinates all coverage and test result parsers
- Provides unified interface for parsing different file formats
- Handles async operations and error recovery

### Parsers
- **SimpleCov Parser** (`src/parsers/simplecov.js`) - Parses SimpleCov JSON coverage reports
- **Last Run Parser** (`src/parsers/lastRun.js`) - Parses SimpleCov `.last_run.json` files
- **Test Results Parser** (`src/parsers/testResults.js`) - Parses XML test result files
- **XML Parser** (`src/parsers/parseXml.js`) - Legacy XML coverage parser

### Main Action (`src/index.js`)
- Entry point for the GitHub Action
- Handles input validation and error handling
- Generates HTML reports and posts PR comments

## Adding New Features

### Adding a New Parser

1. Create a new parser file in `src/parsers/`
2. Export a function that returns parsed data or `null`
3. Add the parser to `ParserManager` in `src/parsers/index.js`
4. Add tests for the new parser

### Adding New Input Options

1. Add the input to `action.yml`
2. Read the input in `src/index.js` using `core.getInput()`
3. Add validation and error handling
4. Update documentation

## Error Handling

All parsers should:
- Return `null` for missing or invalid files
- Log errors using `core.error()` or `console.error()`
- Not throw unhandled exceptions
- Provide meaningful error messages

## Code Style

- Use ES6+ features (const, let, arrow functions, etc.)
- Prefer async/await over Promises
- Add JSDoc comments for all public functions
- Use meaningful variable and function names
- Keep functions small and focused

## Testing Guidelines

### Unit Tests
- Test each parser individually
- Test edge cases (missing files, invalid data)
- Test error conditions
- Mock external dependencies

### Integration Tests
- Test the complete workflow
- Test with real GitHub Action context
- Verify output format and content

### Test Data
- Use realistic test data
- Include edge cases in test data
- Keep test data up to date

## Debugging

### Local Testing
```bash
# Test with specific inputs
INPUT_COVERAGE_FILE=./test-data/coverage/coverage.json node src/index.js

# Test parsers directly
node test-parsers.js
```

### GitHub Action Debugging
- Use `core.debug()` for debug messages
- Check action logs in GitHub
- Use `core.setFailed()` for fatal errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the full test suite
6. Submit a pull request

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New functionality is tested
- [ ] Documentation is updated
- [ ] No linting errors
- [ ] Code is formatted with Prettier

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a release tag
4. Build the action: `npm run build`
5. Publish the release

## Troubleshooting

### Common Issues

1. **Parser returns undefined**
   - Check if file exists before parsing
   - Verify file format is correct
   - Add error handling

2. **Async issues**
   - Ensure all async functions are awaited
   - Check Promise chain for missing await

3. **GitHub Action not working**
   - Verify inputs are correct
   - Check action logs for errors
   - Test locally first

### Getting Help

- Check existing issues on GitHub
- Review the test files for examples
- Look at the action logs for error messages 