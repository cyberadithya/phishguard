export interface EmailLink {
  displayText: string;
  href: string;
  hostname: string;
}

export interface EmailData {
  senderName: string;
  senderEmail: string;
  replyTo: string | null;
  subject: string;
  bodyText: string;
  links: EmailLink[];
  extractedAt: number;
  /** Gmail's own message id (data-message-id), when available. Used to key
   * per-email UI state (e.g. banner dismissal) more reliably than a
   * content-derived heuristic key. Optional so existing fixtures/tests are
   * unaffected. */
  messageId?: string | null;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface DetectionFinding {
  id: string;
  rule: string;
  severity: "low" | "medium" | "high";
  weight: number;
  message: string;
  evidence?: string;
}

export interface AnalysisResult {
  score: number;
  riskLevel: RiskLevel;
  findings: DetectionFinding[];
  guidance: string[];
  analyzedAt: number;
}

export interface StoredAnalysis {
  emailKey: string;
  result: AnalysisResult;
}

export interface UrlIntelMatch {
  url: string;
  threatType: string;
}
