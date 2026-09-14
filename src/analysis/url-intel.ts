import type {
  AnalysisResult,
  DetectionFinding,
  EmailLink,
  UrlIntelMatch,
} from "../shared/types.js";
import { buildGuidance } from "./guidance.js";
import { scoreToRiskLevel } from "./scorer.js";

/**
 * Optional, opt-in URL threat intelligence via Google Safe Browsing.
 *
 * This module is intentionally separate from the local rule engine
 * (rules.ts / scorer.ts): the core scorer stays synchronous, deterministic,
 * and network-free so the 40-sample corpus and unit tests remain a pure
 * regression gate. This module only *augments* an already-computed
 * AnalysisResult with a finding derived from a network response the caller
 * fetched elsewhere (see src/background/service-worker.ts). Nothing in this
 * file performs network I/O itself, which keeps the request/response
 * shaping independently unit-testable without mocking fetch.
 *
 * See docs/THREAT_MODEL.md §7 for the threat-model update that shipped with
 * this feature, and SECURITY.md for the permission/data-handling summary.
 */

export const SAFE_BROWSING_ORIGIN = "https://safebrowsing.googleapis.com/*";
export const SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const MAX_URLS_PER_REQUEST = 50;
const URL_INTEL_FINDING_ID = "url-intel-match";
const URL_INTEL_WEIGHT = 45;

/** Unique http(s) URLs from an email's links, capped for one API request. */
export function selectUrlsForIntelCheck(links: EmailLink[]): string[] {
  const unique = new Set<string>();

  for (const link of links) {
    if (unique.size >= MAX_URLS_PER_REQUEST) break;
    if (/^https?:\/\//i.test(link.href)) {
      unique.add(link.href);
    }
  }

  return [...unique];
}

export function buildSafeBrowsingRequestBody(urls: string[]): Record<string, unknown> {
  return {
    client: {
      clientId: "phishguard-extension",
      clientVersion: "1.0.0",
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.map((url) => ({ url })),
    },
  };
}

interface RawSafeBrowsingMatch {
  threatType?: string;
  threat?: { url?: string };
}

/** Parses a Safe Browsing threatMatches:find response body into matches. */
export function parseSafeBrowsingMatches(responseJson: unknown): UrlIntelMatch[] {
  const matches = (responseJson as { matches?: RawSafeBrowsingMatch[] } | undefined)?.matches;
  if (!Array.isArray(matches)) return [];

  const results: UrlIntelMatch[] = [];
  for (const match of matches) {
    if (match?.threat?.url && match.threatType) {
      results.push({ url: match.threat.url, threatType: match.threatType });
    }
  }
  return results;
}

/**
 * Layers a Safe Browsing finding on top of an already-computed local
 * AnalysisResult. Additive with the rest of the scorer's model: one finding
 * regardless of how many URLs matched, capped at MAX_SCORE like every other
 * rule. Returns the original result unchanged when there are no matches.
 */
export function augmentResultWithUrlIntel(
  result: AnalysisResult,
  matches: UrlIntelMatch[]
): AnalysisResult {
  if (matches.length === 0) return result;

  const threatTypes = [...new Set(matches.map((m) => m.threatType))];
  const finding: DetectionFinding = {
    id: URL_INTEL_FINDING_ID,
    rule: "Threat Intel Match (Google Safe Browsing)",
    severity: "high",
    weight: URL_INTEL_WEIGHT,
    message: `${matches.length} link${matches.length === 1 ? "" : "s"} matched Google Safe Browsing's threat list (${threatTypes.join(", ")}).`,
    evidence: matches.map((m) => `${m.url} — ${m.threatType}`).join("; "),
  };

  const findings = [...result.findings, finding];
  const score = Math.min(100, result.score + finding.weight);
  const riskLevel = scoreToRiskLevel(score);

  return {
    ...result,
    score,
    riskLevel,
    findings,
    guidance: buildGuidance(riskLevel, findings),
  };
}
