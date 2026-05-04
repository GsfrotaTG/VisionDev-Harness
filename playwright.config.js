module.exports = {
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
  },
};
