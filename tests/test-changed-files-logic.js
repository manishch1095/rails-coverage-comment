const { generateChangedFilesCoverage } = require('../src/index');

// Mock coverage data
const mockCoverageData = {
  files: [
    {
      name: 'application_controller.rb',
      path: '/Users/test/project/app/controllers/application_controller.rb',
      lines: 8,
      covered: 8,
      missed: 0,
      percentage: '100.0',
      missedLines: [],
    },
    {
      name: 'users_controller.rb',
      path: '/Users/test/project/app/controllers/users_controller.rb',
      lines: 25,
      covered: 22,
      missed: 3,
      percentage: '88.0',
      missedLines: [26, 27, 28],
    },
    {
      name: 'user.rb',
      path: '/Users/test/project/app/models/user.rb',
      lines: 20,
      covered: 19,
      missed: 1,
      percentage: '95.0',
      missedLines: [21],
    },
    {
      name: 'email_job.rb',
      path: '/Users/test/project/app/jobs/email_job.rb',
      lines: 16,
      covered: 12,
      missed: 4,
      percentage: '75.0',
      missedLines: [13, 14, 15, 16],
    },
    {
      name: 'helper.rb',
      path: '/Users/test/project/lib/utils/helper.rb',
      lines: 11,
      covered: 10,
      missed: 1,
      percentage: '90.0',
      missedLines: [11],
    },
  ],
};

function printResult(title, result) {
  console.log('--- ' + title + ' ---');
  if (result) {
    console.log(result);
  } else {
    console.log('(empty result)');
  }
  console.log('\n');
}

// 1. Files that exist in coverage but not in changed files
printResult(
  'Files in coverage but not in changed files',
  generateChangedFilesCoverage(mockCoverageData, ['nonexistent.rb'], {}),
);

// 2. Files that exist in changed files but not in coverage
printResult(
  'Files in changed files but not in coverage',
  generateChangedFilesCoverage({ files: [] }, ['user.rb'], {}),
);

// 3. Path matching: relative vs absolute
printResult(
  'Path matching: relative vs absolute',
  generateChangedFilesCoverage(
    mockCoverageData,
    ['app/controllers/users_controller.rb'],
    {},
  ),
);
printResult(
  'Path matching: just filename',
  generateChangedFilesCoverage(mockCoverageData, ['users_controller.rb'], {}),
);

// 4. Special characters in filenames
const specialCoverage = {
  files: [
    {
      name: 'foo-bar.rb',
      path: '/Users/test/project/app/foo-bar.rb',
      lines: 10,
      covered: 10,
      missed: 0,
      percentage: '100.0',
      missedLines: [],
    },
    {
      name: 'weird@file!.rb',
      path: '/Users/test/project/app/weird@file!.rb',
      lines: 5,
      covered: 5,
      missed: 0,
      percentage: '100.0',
      missedLines: [],
    },
  ],
};
printResult(
  'Special characters in filenames',
  generateChangedFilesCoverage(
    specialCoverage,
    ['foo-bar.rb', 'weird@file!.rb'],
    {},
  ),
);

// 5. Large number of files (performance)
const manyFiles = { files: [] };
for (let i = 0; i < 1000; i++) {
  manyFiles.files.push({
    name: `file${i}.rb`,
    path: `/Users/test/project/app/file${i}.rb`,
    lines: 10,
    covered: 10,
    missed: 0,
    percentage: '100.0',
    missedLines: [],
  });
}
printResult(
  'Large number of files',
  generateChangedFilesCoverage(manyFiles, ['file999.rb'], {}),
);

// 6. Empty/missing coverage data
printResult(
  'Empty coverage data',
  generateChangedFilesCoverage(null, ['user.rb'], {}),
);
printResult(
  'Empty changed files array',
  generateChangedFilesCoverage(mockCoverageData, [], {}),
);
