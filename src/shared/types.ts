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
