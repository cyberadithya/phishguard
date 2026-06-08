import type { AnalysisResult, EmailData, RiskLevel } from "../shared/types.js";
import { buildGuidance } from "./guidance.js";
import { runAllRules } from "./rules.js";

const MAX_SCORE = 100;

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function analyzeEmail(email: EmailData): AnalysisResult {
  const findings = runAllRules(email);
  const rawScore = findings.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.min(MAX_SCORE, rawScore);
  const riskLevel = scoreToRiskLevel(score);

  return {
    score,
    riskLevel,
    findings,
    guidance: buildGuidance(riskLevel, findings),
    analyzedAt: Date.now(),
  };
}

export function evaluateCorpus(
  samples: Array<{ email: EmailData; label: "phishing" | "benign" }>
): {
  total: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  accuracy: number;
} {
  const PHISHING_THRESHOLD = 50;

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const sample of samples) {
    const result = analyzeEmail(sample.email);
    const predictedPhishing = result.score >= PHISHING_THRESHOLD;

    if (sample.label === "phishing" && predictedPhishing) tp++;
    else if (sample.label === "benign" && predictedPhishing) fp++;
    else if (sample.label === "benign" && !predictedPhishing) tn++;
    else fn++;
  }

  const total = samples.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = total > 0 ? (tp + tn) / total : 0;

  return {
    total,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    precision,
    recall,
    accuracy,
  };
}
