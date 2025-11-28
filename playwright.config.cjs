const LOCAL_PORT = process.env.APP_PORT || 4173;
const LOCAL_BASE_URL = `http://localhost:${LOCAL_PORT}`;
const APP_URL = process.env.APP_URL || LOCAL_BASE_URL;

module.exports = {
    testDir: "./tests",
    timeout: 90_000,
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL: APP_URL,
        // Firefox costuma contornar restrições de sandbox no macOS
        browserName: "firefox",
        headless: true,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    webServer: process.env.APP_URL
        ? undefined
        : {
              command: `python3 -m http.server ${LOCAL_PORT}`,
              port: Number(LOCAL_PORT),
              reuseExistingServer: true,
              cwd: __dirname,
              timeout: 120_000,
          },
};
