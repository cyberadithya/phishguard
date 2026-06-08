import type { DetectionFinding, EmailData } from "../shared/types.js";
import {
  getUniqueHostnames,
  isLinkDeceptive,
  isPunycodeDomain,
  isSuspiciousTld,
  parseHostname,
} from "./link-parser.js";

const URGENCY_KEYWORDS = [
  { pattern: /verify\s+(your\s+)?account/i, weight: 12 },
  { pattern: /within\s+24\s+hours/i, weight: 10 },
  { pattern: /urgent(ly)?/i, weight: 8 },
  { pattern: /immediately/i, weight: 8 },
  { pattern: /suspended|suspend/i, weight: 10 },
  { pattern: /unusual\s+activity/i, weight: 10 },
  { pattern: /confirm\s+your\s+(identity|password|credentials)/i, weight: 12 },
  { pattern: /click\s+(here|below|now)/i, weight: 6 },
  { pattern: /act\s+now/i, weight: 8 },
  { pattern: /password\s+expir/i, weight: 10 },
  { pattern: /update\s+(your\s+)?payment/i, weight: 10 },
  { pattern: /update\s+your\s+account/i, weight: 12 },
  { pattern: /mailbox/i, weight: 8 },
  { pattern: /wire\s+transfer/i, weight: 14 },
  { pattern: /gift\s+card/i, weight: 12 },
];

const CREDENTIAL_DOMAINS = [
  "login",
  "signin",
  "account",
  "secure",
  "verify",
  "update",
  "password",
  "auth",
];

function extractEmailAddress(value: string): string | null {
  const match = value.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? match[0].toLowerCase() : null;
}

function domainFromEmail(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "";
}

export function checkSenderMismatch(email: EmailData): DetectionFinding | null {
  const senderEmail = extractEmailAddress(email.senderEmail);
  if (!senderEmail || !email.senderName.trim()) return null;

  const nameLooksLikeEmail = extractEmailAddress(email.senderName);
  if (nameLooksLikeEmail && nameLooksLikeEmail !== senderEmail) {
    return {
      id: "sender-mismatch",
      rule: "Sender Mismatch",
      severity: "high",
      weight: 20,
      message: "Display name shows a different email than the actual sender.",
      evidence: `Name: ${email.senderName}, From: ${senderEmail}`,
    };
  }

  const brandInName = email.senderName.replace(/<[^>]+>/g, "").trim();
  const senderDomain = domainFromEmail(senderEmail);
  const commonBrands = [
    "paypal",
    "microsoft",
    "google",
    "apple",
    "amazon",
    "netflix",
    "bank",
    "docusign",
    "chase",
    "wells fargo",
  ];
  const nameLower = brandInName.toLowerCase();

  for (const brand of commonBrands) {
    if (nameLower.includes(brand) && !domainMatchesBrand(senderDomain, brand)) {
      return {
        id: "sender-mismatch",
        rule: "Sender Mismatch",
        severity: "high",
        weight: 22,
        message: `Sender name references "${brand}" but the email domain does not match.`,
        evidence: `${brandInName} <${senderEmail}>`,
      };
    }
  }

  return null;
}

export function checkReplyToDivergence(email: EmailData): DetectionFinding | null {
  if (!email.replyTo) return null;

  const senderEmail = extractEmailAddress(email.senderEmail);
  const replyEmail = extractEmailAddress(email.replyTo);
  if (!senderEmail || !replyEmail) return null;

  if (senderEmail !== replyEmail) {
    const senderDomain = domainFromEmail(senderEmail);
    const replyDomain = domainFromEmail(replyEmail);

    return {
      id: "reply-to-divergence",
      rule: "Reply-To Divergence",
      severity: senderDomain !== replyDomain ? "high" : "medium",
      weight: senderDomain !== replyDomain ? 18 : 10,
      message: "Reply-To address differs from the sender address.",
      evidence: `From: ${senderEmail}, Reply-To: ${replyEmail}`,
    };
  }

  return null;
}

export function checkLinkDeception(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];

  for (const link of email.links) {
    if (isLinkDeceptive(link)) {
      findings.push({
        id: "link-deception",
        rule: "Link Deception",
        severity: "high",
        weight: 18,
        message: "A link displays one URL but points to a different destination.",
        evidence: `Shows "${link.displayText}" → ${link.href}`,
      });
    }
  }

  return findings;
}

export function checkPunycodeDomains(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];
  const hostnames = getUniqueHostnames(email.links);

  for (const hostname of hostnames) {
    if (isPunycodeDomain(hostname)) {
      findings.push({
        id: "punycode-domain",
        rule: "Homograph Domain",
        severity: "high",
        weight: 20,
        message: "Link uses a punycode (homograph) domain that may impersonate a real site.",
        evidence: hostname,
      });
    }
  }

  return findings;
}

export function checkSuspiciousTlds(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];
  const hostnames = getUniqueHostnames(email.links);

  for (const hostname of hostnames) {
    if (isSuspiciousTld(hostname)) {
      findings.push({
        id: "suspicious-tld",
        rule: "Suspicious TLD",
        severity: "medium",
        weight: 10,
        message: "Link uses a top-level domain commonly abused in phishing.",
        evidence: hostname,
      });
    }
  }

  return findings;
}

export function checkUrgencyLanguage(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];
  const text = `${email.subject} ${email.bodyText}`;

  for (const { pattern, weight } of URGENCY_KEYWORDS) {
    const match = text.match(pattern);
    if (match) {
      findings.push({
        id: "urgency-language",
        rule: "Urgency Language",
        severity: weight >= 12 ? "high" : "medium",
        weight,
        message: "Message uses pressure or credential-related language common in phishing.",
        evidence: match[0],
      });
    }
  }

  return findings;
}

export function checkCredentialHarvestingLinks(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];

  for (const link of email.links) {
    const path = link.href.toLowerCase();
    const hostname = link.hostname;

    for (const keyword of CREDENTIAL_DOMAINS) {
      if (path.includes(keyword) && !isTrustedDomain(hostname)) {
        findings.push({
          id: "credential-link",
          rule: "Credential Harvesting Link",
          severity: "medium",
          weight: 8,
          message: "Link path suggests a login or verification page on an untrusted domain.",
          evidence: link.href,
        });
        break;
      }
    }
  }

  return findings;
}

export function checkSenderDomainMismatch(email: EmailData): DetectionFinding | null {
  const senderEmail = extractEmailAddress(email.senderEmail);
  if (!senderEmail) return null;

  const senderDomain = domainFromEmail(senderEmail);
  const linkHosts = getUniqueHostnames(email.links).filter(Boolean);

  if (linkHosts.length === 0) return null;

  const hasMatchingDomain = linkHosts.some(
    (host) => host === senderDomain || host.endsWith(`.${senderDomain}`)
  );

  if (!hasMatchingDomain) {
    const externalHosts = linkHosts.filter((h) => !isTrustedDomain(h));
    if (externalHosts.length > 0) {
      return {
        id: "domain-mismatch",
        rule: "Sender/Link Domain Mismatch",
        severity: "medium",
        weight: 12,
        message: "Links point to domains that do not match the sender's organization.",
        evidence: externalHosts.join(", "),
      };
    }
  }

  return null;
}

function domainMatchesBrand(domain: string, brand: string): boolean {
  if (!domain) return false;
  const firstLabel = domain.split(".")[0];
  return (
    firstLabel === brand ||
    domain === `${brand}.com` ||
    domain.endsWith(`.${brand}.com`)
  );
}

function isTrustedDomain(hostname: string): boolean {
  const trusted = [
    "google.com",
    "gmail.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "paypal.com",
    "linkedin.com",
    "github.com",
  ];
  return trusted.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

export function checkWireFraud(email: EmailData): DetectionFinding | null {
  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  const mentionsWire =
    text.includes("wire transfer") ||
    text.includes("gift card") ||
    text.includes("bitcoin") ||
    text.includes("urgent payment");

  if (!mentionsWire) return null;

  const senderEmail = extractEmailAddress(email.senderEmail);
  const replyEmail = email.replyTo ? extractEmailAddress(email.replyTo) : null;

  if (replyEmail && senderEmail && replyEmail !== senderEmail) {
    return {
      id: "wire-fraud",
      rule: "Wire Transfer Fraud",
      severity: "high",
      weight: 22,
      message:
        "Message requests urgent payment with a reply address different from the sender — common in BEC scams.",
      evidence: `From: ${senderEmail}, Reply-To: ${replyEmail}`,
    };
  }

  if (/ceo|executive|director|manager/i.test(email.senderName) && mentionsWire) {
    return {
      id: "wire-fraud",
      rule: "Wire Transfer Fraud",
      severity: "high",
      weight: 20,
      message: "Executive impersonation combined with an urgent payment request.",
      evidence: email.senderName,
    };
  }

  return null;
}

export function checkIpAddressLinks(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  for (const link of email.links) {
    const host = parseHostname(link.href);
    if (ipPattern.test(host)) {
      findings.push({
        id: "ip-link",
        rule: "IP Address Link",
        severity: "high",
        weight: 15,
        message: "Link points directly to an IP address instead of a domain name.",
        evidence: link.href,
      });
    }
  }

  return findings;
}

export function runAllRules(email: EmailData): DetectionFinding[] {
  const findings: DetectionFinding[] = [];

  const singles = [
    checkSenderMismatch(email),
    checkReplyToDivergence(email),
    checkSenderDomainMismatch(email),
    checkWireFraud(email),
  ];

  for (const finding of singles) {
    if (finding) findings.push(finding);
  }

  findings.push(
    ...checkLinkDeception(email),
    ...checkPunycodeDomains(email),
    ...checkSuspiciousTlds(email),
    ...checkUrgencyLanguage(email),
    ...checkCredentialHarvestingLinks(email),
    ...checkIpAddressLinks(email)
  );

  return dedupeFindings(findings);
}

function dedupeFindings(findings: DetectionFinding[]): DetectionFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.id}:${f.evidence ?? f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
