module.exports = {
    testDir: "./tests",
    timeout: 90_000,
    expect: {
        timeout: 10_000,
    },
    use: {
        // Firefox costuma contornar restrições de sandbox no macOS
        browserName: "firefox",
        headless: true,
        trace: "on-first-retry",
    },
};
