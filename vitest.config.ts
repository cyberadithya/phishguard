import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
      // Thresholds are set from measured values, as backslide guards rather
      // than aspirational targets. The global number is low because the
      // content script, service worker, popup and options page can only run
      // inside a Chrome extension context and are not importable under
      // vitest; the rule engine under src/analysis/** is what the corpus and
      // unit tests actually exercise, so it is held to a much higher bar.
      thresholds: {
        lines: 50,
        statements: 50,
        functions: 80,
        branches: 75,
        "src/analysis/**": {
          lines: 90,
          statements: 90,
          functions: 95,
          branches: 80,
        },
      },
    },
  },
});
