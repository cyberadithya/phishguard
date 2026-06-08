import type { AnalysisResult, EmailData, RiskLevel } from "../shared/types.js";
import { PHISHING_THRESHOLD } from "../shared/settings.js";
import { buildGuidance } from "./guidance.js";
import { runAllRules } from "./rules.js";

const MAX_SCORE = 100;

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export interface AnalyzeOptions {
  disabledRuleIds?: string[];
}

export function analyzeEmail(
  email: EmailData,
  options: AnalyzeOptions = {}
): AnalysisResult {
  const disabled = new Set(options.disabledRuleIds ?? []);
  const findings = runAllRules(email).filter((finding) => !disabled.has(finding.id));
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

export { PHISHING_THRESHOLD };

export interface CorpusSampleResult {
  id?: string;
  label: "phishing" | "benign";
  score: number;
  riskLevel: RiskLevel;
  predictedPhishing: boolean;
  correct: boolean;
}

export interface CorpusEvaluation {
  total: number;
  threshold: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  sampleResults: CorpusSampleResult[];
}

export function evaluateCorpus(
  samples: Array<{
    email: EmailData;
    label: "phishing" | "benign";
    id?: string;
  }>
): CorpusEvaluation {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  const sampleResults: CorpusSampleResult[] = [];

  for (const sample of samples) {
    const result = analyzeEmail(sample.email);
    const predictedPhishing = result.score >= PHISHING_THRESHOLD;
    const correct =
      (sample.label === "phishing" && predictedPhishing) ||
      (sample.label === "benign" && !predictedPhishing);

    sampleResults.push({
      id: sample.id,
      label: sample.label,
      score: result.score,
      riskLevel: result.riskLevel,
      predictedPhishing,
      correct,
    });

    if (sample.label === "phishing" && predictedPhishing) tp++;
    else if (sample.label === "benign" && predictedPhishing) fp++;
    else if (sample.label === "benign" && !predictedPhishing) tn++;
    else fn++;
  }

  const total = samples.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = total > 0 ? (tp + tn) / total : 0;

  return {
    total,
    threshold: PHISHING_THRESHOLD,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    precision,
    recall,
    f1Score,
    accuracy,
    sampleResults,
  };
}

export function formatEvaluationReport(metrics: CorpusEvaluation): string {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const lines = [
    "--- PhishGuard Corpus Evaluation ---",
    `Threshold: score >= ${metrics.threshold}`,
    `Samples:   ${metrics.total}`,
    "",
    "Confusion matrix:",
    `  TP (phishing → flagged):  ${metrics.truePositives}`,
    `  FP (benign → flagged):    ${metrics.falsePositives}`,
    `  TN (benign → not flagged): ${metrics.trueNegatives}`,
    `  FN (phishing → missed):   ${metrics.falseNegatives}`,
    "",
    `Precision: ${pct(metrics.precision)}`,
    `Recall:    ${pct(metrics.recall)}`,
    `F1 score:  ${pct(metrics.f1Score)}`,
    `Accuracy:  ${pct(metrics.accuracy)}`,
    "------------------------------------",
  ];

  const failures = metrics.sampleResults.filter((s) => !s.correct);
  if (failures.length > 0) {
    lines.push("", "Misclassifications:");
    for (const failure of failures) {
      const kind = failure.label === "phishing" ? "FN" : "FP";
      lines.push(
        `  ${kind} ${failure.id ?? "unknown"} — score ${failure.score} (${failure.riskLevel})`
      );
    }
    lines.push("------------------------------------");
  }

  return lines.join("\n");
}
