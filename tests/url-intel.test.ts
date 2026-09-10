import { describe, expect, it } from "vitest";
import {
  augmentResultWithUrlIntel,
  buildSafeBrowsingRequestBody,
  parseSafeBrowsingMatches,
  selectUrlsForIntelCheck,
} from "../src/analysis/url-intel.js";
import type { AnalysisResult, EmailLink } from "../src/shared/types.js";

const links: EmailLink[] = [
  { displayText: "verify", href: "https://fake-bank.example/login", hostname: "fake-bank.example" },
  { displayText: "verify again", href: "https://fake-bank.example/login", hostname: "fake-bank.example" },
  { displayText: "call us", href: "mailto:help@example.com", hostname: "" },
  { displayText: "anchor", href: "#section", hostname: "" },
];

const baseResult: AnalysisResult = {
  score: 30,
  riskLevel: "medium",
  findings: [
    {
      id: "urgency-language",
      rule: "Urgency Language",
      severity: "medium",
      weight: 8,
      message: "Message uses pressure language.",
    },
  ],
  guidance: ["Exercise caution before clicking links or sharing information."],
  analyzedAt: 1_700_000_000_000,
};

describe("selectUrlsForIntelCheck", () => {
  it("dedupes and filters to http(s) links only", () => {
    const urls = selectUrlsForIntelCheck(links);
    expect(urls).toEqual(["https://fake-bank.example/login"]);
  });

  it("returns an empty list when there are no http(s) links", () => {
    expect(selectUrlsForIntelCheck([links[2], links[3]])).toEqual([]);
  });
});

describe("buildSafeBrowsingRequestBody", () => {
  it("shapes a threatMatches:find request for the given URLs", () => {
    const body = buildSafeBrowsingRequestBody(["https://fake-bank.example/login"]) as {
      threatInfo: { threatEntries: Array<{ url: string }> };
    };

    expect(body.threatInfo.threatEntries).toEqual([{ url: "https://fake-bank.example/login" }]);
  });
});

describe("parseSafeBrowsingMatches", () => {
  it("extracts url/threatType pairs from a Safe Browsing response", () => {
    const matches = parseSafeBrowsingMatches({
      matches: [
        {
          threatType: "SOCIAL_ENGINEERING",
          threat: { url: "https://fake-bank.example/login" },
        },
      ],
    });

    expect(matches).toEqual([
      { url: "https://fake-bank.example/login", threatType: "SOCIAL_ENGINEERING" },
    ]);
  });

  it("returns an empty list for a clean response", () => {
    expect(parseSafeBrowsingMatches({})).toEqual([]);
    expect(parseSafeBrowsingMatches({ matches: [] })).toEqual([]);
  });

  it("ignores malformed match entries instead of throwing", () => {
    expect(parseSafeBrowsingMatches({ matches: [{}, { threatType: "MALWARE" }] })).toEqual([]);
  });
});

describe("augmentResultWithUrlIntel", () => {
  it("returns the result unchanged when there are no matches", () => {
    expect(augmentResultWithUrlIntel(baseResult, [])).toBe(baseResult);
  });

  it("adds a high-weight finding and recomputes score/risk/guidance", () => {
    const augmented = augmentResultWithUrlIntel(baseResult, [
      { url: "https://fake-bank.example/login", threatType: "SOCIAL_ENGINEERING" },
    ]);

    expect(augmented.findings).toHaveLength(2);
    expect(augmented.findings.some((f) => f.id === "url-intel-match")).toBe(true);
    expect(augmented.score).toBe(baseResult.score + 45);
    expect(augmented.riskLevel).toBe("critical");
    expect(augmented.guidance.length).toBeGreaterThan(baseResult.guidance.length);
  });

  it("caps the combined score at 100", () => {
    const highResult: AnalysisResult = { ...baseResult, score: 90 };
    const augmented = augmentResultWithUrlIntel(highResult, [
      { url: "https://fake-bank.example/login", threatType: "MALWARE" },
    ]);

    expect(augmented.score).toBe(100);
    expect(augmented.riskLevel).toBe("critical");
  });

  it("leaves the local-only base result untouched (no mutation)", () => {
    const findingsBefore = baseResult.findings.length;
    augmentResultWithUrlIntel(baseResult, [
      { url: "https://fake-bank.example/login", threatType: "MALWARE" },
    ]);
    expect(baseResult.findings.length).toBe(findingsBefore);
  });
});
