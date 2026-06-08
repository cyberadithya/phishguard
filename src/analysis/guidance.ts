import type { AnalysisResult, DetectionFinding, RiskLevel } from "../shared/types.js";

const GUIDANCE_BY_RULE: Record<string, string> = {
  "Sender Mismatch":
    "Verify the sender through a separate channel before trusting this message.",
  "Reply-To Divergence":
    "Do not reply directly; contact the organization using their official website or phone number.",
  "Link Deception":
    "Do not click the link. Hover over links to confirm the real destination, or type the URL manually.",
  "Homograph Domain":
    "This link may visually mimic a trusted brand. Avoid clicking and report to your IT/security team.",
  "Suspicious TLD":
    "Treat links with uncommon domains as untrusted until verified.",
  "Urgency Language":
    "Phishers create false urgency. Slow down and verify the request independently.",
  "Credential Harvesting Link":
    "Never enter credentials on a page reached from an unsolicited email.",
  "Sender/Link Domain Mismatch":
    "Legitimate companies usually link to their own domain. Verify via the official site.",
  "IP Address Link":
    "Reputable services rarely use raw IP links. Do not click.",
  "Wire Transfer Fraud":
    "Verify payment requests in person or by phone using a known number. BEC scams often impersonate executives.",
};

const RISK_GUIDANCE: Record<RiskLevel, string[]> = {
  low: [
    "No major phishing indicators detected, but stay cautious with unexpected attachments or requests.",
  ],
  medium: [
    "Exercise caution before clicking links or sharing information.",
    "When in doubt, contact the sender through a known-good channel.",
  ],
  high: [
    "Strong phishing indicators present. Do not click links or download attachments.",
    "Report this message to your IT department or email provider's phishing report feature.",
  ],
  critical: [
    "This message shows multiple high-risk phishing signals. Do not interact with it.",
    "Report immediately and delete the message after reporting.",
    "If you already clicked a link or entered credentials, change passwords and notify IT.",
  ],
};

export function buildGuidance(
  riskLevel: RiskLevel,
  findings: DetectionFinding[]
): string[] {
  const guidance = new Set<string>(RISK_GUIDANCE[riskLevel]);

  for (const finding of findings) {
    const ruleGuidance = GUIDANCE_BY_RULE[finding.rule];
    if (ruleGuidance) guidance.add(ruleGuidance);
  }

  return [...guidance];
}

export function formatResultSummary(result: AnalysisResult): string {
  const labels: Record<RiskLevel, string> = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
    critical: "Critical Risk",
  };
  return `${labels[result.riskLevel]} — Score ${result.score}/100 (${result.findings.length} findings)`;
}
