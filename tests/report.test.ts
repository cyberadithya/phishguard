import { describe, expect, it } from "vitest";
import {
  buildReportFilename,
  formatReportJson,
  formatReportMarkdown,
} from "../src/analysis/report.js";
import type { AnalysisResult, EmailData } from "../src/shared/types.js";

const sampleEmail: EmailData = {
  senderName: "PayPal Security",
  senderEmail: "alert@fake-paypal.com",
  replyTo: null,
  subject: "Verify your account",
  bodyText: "Unusual activity detected.",
  links: [
    {
      displayText: "https://paypal.com",
      href: "https://fake-paypal.com/login",
      hostname: "fake-paypal.com",
    },
  ],
  extractedAt: Date.now(),
};

const sampleResult: AnalysisResult = {
  score: 72,
  riskLevel: "high",
  findings: [
    {
      id: "sender-mismatch",
      rule: "Sender Mismatch",
      severity: "high",
      weight: 22,
      message: "Sender name references a brand that does not match the sender domain.",
      evidence: "PayPal Security <alert@fake-paypal.com>",
    },
  ],
  guidance: ["Do not click links."],
  analyzedAt: 1_700_000_000_000,
};

describe("analysis report export", () => {
  it("builds a stable JSON report payload", () => {
    const json = formatReportJson(sampleEmail, sampleResult);
    const parsed = JSON.parse(json);

    expect(parsed.tool).toBe("PhishGuard");
    expect(parsed.email.subject).toBe("Verify your account");
    expect(parsed.analysis.score).toBe(72);
    expect(parsed.analysis.findings).toHaveLength(1);
  });

  it("builds a markdown report for IT sharing", () => {
    const markdown = formatReportMarkdown(sampleEmail, sampleResult);

    expect(markdown).toContain("# PhishGuard Analysis Report");
    expect(markdown).toContain("### Sender Mismatch (high)");
    expect(markdown).toContain("Do not click links.");
    expect(markdown).toContain("Redact sensitive information");
  });

  it("sanitizes report filenames", () => {
    expect(buildReportFilename(sampleEmail)).toMatch(/^phishguard-report-/);
    expect(buildReportFilename({ ...sampleEmail, subject: "Hello!!!" })).not.toContain("!");
  });
});
