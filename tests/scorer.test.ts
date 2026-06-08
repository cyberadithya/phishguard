import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { analyzeEmail, evaluateCorpus } from "../src/analysis/scorer.js";
import type { EmailData } from "../src/shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FixtureSample {
  id: string;
  label: "phishing" | "benign";
  description: string;
  email: EmailData;
}

function loadFixtures(filename: string): FixtureSample[] {
  const path = join(__dirname, "fixtures", filename);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("analyzeEmail", () => {
  it("flags obvious phishing with high score", () => {
    const [sample] = loadFixtures("phishing-samples.json");
    const result = analyzeEmail(sample.email);

    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.riskLevel).toMatch(/high|critical/);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.guidance.length).toBeGreaterThan(0);
  });

  it("scores benign email as low risk", () => {
    const [sample] = loadFixtures("benign-samples.json");
    const result = analyzeEmail(sample.email);

    expect(result.score).toBeLessThan(50);
    expect(result.riskLevel).toMatch(/low|medium/);
  });

  it("detects sender mismatch for brand impersonation", () => {
    const email: EmailData = {
      senderName: "PayPal",
      senderEmail: "alert@totally-not-paypal.com",
      replyTo: null,
      subject: "Account notice",
      bodyText: "Please review your account.",
      links: [],
      extractedAt: Date.now(),
    };

    const result = analyzeEmail(email);
    expect(result.findings.some((f) => f.rule === "Sender Mismatch")).toBe(true);
  });

  it("detects link deception", () => {
    const email: EmailData = {
      senderName: "Support",
      senderEmail: "support@example.com",
      replyTo: null,
      subject: "Action needed",
      bodyText: "Verify now.",
      links: [
        {
          displayText: "https://microsoft.com",
          href: "https://bad-site.com/login",
          hostname: "bad-site.com",
        },
      ],
      extractedAt: Date.now(),
    };

    const result = analyzeEmail(email);
    expect(result.findings.some((f) => f.rule === "Link Deception")).toBe(true);
  });
});

describe("evaluateCorpus", () => {
  const phishing = loadFixtures("phishing-samples.json");
  const benign = loadFixtures("benign-samples.json");
  const corpus = [...phishing, ...benign].map((s) => ({
    email: s.email,
    label: s.label,
  }));

  it("evaluates full test corpus with strong recall", () => {
    const metrics = evaluateCorpus(corpus);

    expect(metrics.total).toBe(20);
    expect(metrics.recall).toBeGreaterThanOrEqual(0.8);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0.75);
  });

  it("classifies all phishing samples above threshold", () => {
    const failures: string[] = [];

    for (const sample of phishing) {
      const result = analyzeEmail({
        ...sample.email,
        extractedAt: Date.now(),
      });
      if (result.score < 50) {
        failures.push(`${sample.id} (score ${result.score}): ${sample.description}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
