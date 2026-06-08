import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { evaluateCorpus } from "../src/analysis/scorer.js";
import type { EmailData } from "../src/shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FixtureSample {
  label: "phishing" | "benign";
  email: EmailData;
}

function loadFixtures(filename: string): FixtureSample[] {
  return JSON.parse(readFileSync(join(__dirname, "fixtures", filename), "utf-8"));
}

describe("corpus evaluation report", () => {
  it("prints evaluation metrics for portfolio documentation", () => {
    const corpus = [
      ...loadFixtures("phishing-samples.json"),
      ...loadFixtures("benign-samples.json"),
    ].map((s) => ({
      email: { ...s.email, extractedAt: Date.now() },
      label: s.label as "phishing" | "benign",
    }));

    const metrics = evaluateCorpus(corpus);

    console.log("\n--- PhishGuard Corpus Evaluation ---");
    console.log(`Precision: ${(metrics.precision * 100).toFixed(1)}%`);
    console.log(`Recall:    ${(metrics.recall * 100).toFixed(1)}%`);
    console.log(`Accuracy:  ${(metrics.accuracy * 100).toFixed(1)}%`);
    console.log("------------------------------------\n");

    expect(metrics.recall).toBeGreaterThanOrEqual(0.9);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0.75);
  });
});
