import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  evaluateCorpus,
  formatEvaluationReport,
} from "../src/analysis/scorer.js";
import type { EmailData } from "../src/shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FixtureSample {
  id: string;
  label: "phishing" | "benign";
  description: string;
  email: EmailData;
}

function loadFixtures(filename: string): FixtureSample[] {
  return JSON.parse(readFileSync(join(__dirname, "fixtures", filename), "utf-8"));
}

describe("corpus evaluation report", () => {
  it("prints evaluation metrics report", () => {
    const corpus = [
      ...loadFixtures("phishing-samples.json"),
      ...loadFixtures("benign-samples.json"),
    ].map((s) => ({
      id: s.id,
      email: { ...s.email, extractedAt: Date.now() },
      label: s.label,
    }));

    const metrics = evaluateCorpus(corpus);

    console.log(`\n${formatEvaluationReport(metrics)}\n`);

    expect(metrics.total).toBe(40);
    expect(metrics.precision).toBeGreaterThanOrEqual(0.95);
    expect(metrics.recall).toBeGreaterThanOrEqual(0.9);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0.9);
    expect(metrics.falsePositives).toBe(0);
  });
});
