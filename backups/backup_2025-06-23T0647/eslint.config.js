module.exports = [
  {
    ignores: ["node_modules/**", "**/dist/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        Audio: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        performance: "readonly",
        navigator: "readonly",
        Intl: "readonly"
      }
    },
    rules: {
      // Basic rules to catch common issues
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off", // Allow console.log in development
      "no-debugger": "warn"
    },
    plugins: {},
    linterOptions: {
      reportUnusedDisableDirectives: true
    }
  },
  // Override for frontend files
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off",
      "no-debugger": "warn"
    }
  }
]; 