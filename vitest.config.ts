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
        lines: 55,
        statements: 55,
        functions: 85,
        branches: 80,
        "src/analysis/**": {
          lines: 90,
          statements: 90,
          functions: 95,
          branches: 80,
        },
        // The Gmail DOM extraction was split out of gmail.ts precisely so it
        // could be covered by the fixture test; hold it to that.
        "src/content/gmail-extract.ts": {
          lines: 90,
          statements: 90,
          functions: 95,
          branches: 70,
        },
      },
    },
  },
});
