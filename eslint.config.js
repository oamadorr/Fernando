import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import pluginImport from "eslint-plugin-import";

export default [
    {
        ignores: [
            "node_modules/**",
            "backup-*.json",
            "localstorage-backup-*.json",
            ".firebase/**",
            ".vercel/**",
            ".playwright-mcp/**",
        ],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "module",
            globals: {
                console: "readonly",
                document: "readonly",
                window: "readonly",
                localStorage: "readonly",
                navigator: "readonly",
                firebase: "readonly",
                Chart: "readonly",
                XLSX: "readonly",
                jsPDF: "readonly",
                module: "readonly",
                require: "readonly",
                process: "readonly",
                __dirname: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
            },
        },
        plugins: {
            import: pluginImport,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...pluginImport.configs.recommended.rules,
            ...prettier.rules,
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "eqeqeq": ["error", "always"],
            semi: ["error", "always"],
        },
    },
];
