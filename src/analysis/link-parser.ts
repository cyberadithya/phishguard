import type { EmailLink } from "../shared/types.js";

const SUSPICIOUS_TLDS = new Set([
  "zip",
  "mov",
  "top",
  "xyz",
  "club",
  "work",
  "click",
  "link",
  "gq",
  "tk",
  "ml",
  "cf",
  "ga",
  "buzz",
  "rest",
  "monster",
  "cam",
]);

const PUNYCODE_PREFIX = "xn--";

export function parseHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isPunycodeDomain(hostname: string): boolean {
  const labels = hostname.split(".");
  return labels.some((label) => label.startsWith(PUNYCODE_PREFIX));
}

export function isSuspiciousTld(hostname: string): boolean {
  const parts = hostname.split(".");
  const tld = parts[parts.length - 1];
  return SUSPICIOUS_TLDS.has(tld);
}

export function isLinkDeceptive(link: EmailLink): boolean {
  const display = link.displayText.trim();
  if (!display || !link.href) return false;

  if (display === link.href) return false;

  const looksLikeUrl =
    /^https?:\/\//i.test(display) ||
    /^www\./i.test(display) ||
    /^[a-z0-9-]+\.[a-z]{2,}/i.test(display);

  if (!looksLikeUrl) return false;

  const displayHost = parseHostname(
    display.startsWith("http") ? display : `https://${display}`
  );
  const hrefHost = link.hostname;

  if (!displayHost || !hrefHost) return false;

  return displayHost !== hrefHost;
}

export function extractLinksFromHtml(html: string): EmailLink[] {
  const links: EmailLink[] = [];
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const displayText = match[2].replace(/<[^>]+>/g, "").trim();
    links.push({
      displayText,
      href,
      hostname: parseHostname(href),
    });
  }

  return links;
}

export function getUniqueHostnames(links: EmailLink[]): string[] {
  return [...new Set(links.map((l) => l.hostname).filter(Boolean))];
}
