module.exports = {
  testDir: './tests',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    browserName: 'chromium',
    headless: true,
    trace: 'on-first-retry',
  },
};
