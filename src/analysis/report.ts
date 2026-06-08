import type { AnalysisResult, EmailData } from "../shared/types.js";
import { formatResultSummary } from "./guidance.js";

export interface AnalysisReport {
  generatedAt: string;
  tool: string;
  email: {
    subject: string;
    senderName: string;
    senderEmail: string;
    replyTo: string | null;
    linkCount: number;
  };
  analysis: AnalysisResult;
}

function buildReportPayload(email: EmailData, result: AnalysisResult): AnalysisReport {
  return {
    generatedAt: new Date(result.analyzedAt).toISOString(),
    tool: "PhishGuard",
    email: {
      subject: email.subject,
      senderName: email.senderName,
      senderEmail: email.senderEmail,
      replyTo: email.replyTo,
      linkCount: email.links.length,
    },
    analysis: result,
  };
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function buildReportFilename(email: EmailData): string {
  const subjectPart = sanitizeFilename(email.subject || "email");
  const datePart = new Date().toISOString().slice(0, 10);
  return `phishguard-report-${datePart}-${subjectPart || "analysis"}`;
}

export function formatReportJson(email: EmailData, result: AnalysisResult): string {
  return JSON.stringify(buildReportPayload(email, result), null, 2);
}

export function formatReportMarkdown(email: EmailData, result: AnalysisResult): string {
  const lines = [
    "# PhishGuard Analysis Report",
    "",
    `**Generated:** ${new Date(result.analyzedAt).toISOString()}`,
    `**Summary:** ${formatResultSummary(result)}`,
    "",
    "## Email metadata",
    "",
    `- **Subject:** ${email.subject || "(none)"}`,
    `- **From:** ${email.senderName} <${email.senderEmail}>`,
    `- **Reply-To:** ${email.replyTo ?? "(none)"}`,
    `- **Links found:** ${email.links.length}`,
    "",
    "## Findings",
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("No phishing indicators detected.");
  } else {
    for (const finding of result.findings) {
      lines.push(`### ${finding.rule} (${finding.severity})`);
      lines.push("");
      lines.push(finding.message);
      if (finding.evidence) {
        lines.push("");
        lines.push(`> Evidence: ${finding.evidence}`);
      }
      lines.push("");
    }
  }

  lines.push("## Recommended actions", "");
  for (const tip of result.guidance) {
    lines.push(`- ${tip}`);
  }

  lines.push(
    "",
    "---",
    "",
    "_Report generated locally by PhishGuard. Redact sensitive information before sharing._"
  );

  return lines.join("\n");
}
