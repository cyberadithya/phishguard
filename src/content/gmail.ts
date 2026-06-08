import { analyzeEmail } from "../analysis/scorer.js";
import type { EmailData, EmailLink } from "../shared/types.js";
import { MESSAGE_TYPES } from "../shared/messaging.js";
import { loadSettings, type UserSettings } from "../shared/settings.js";
import { GMAIL_SELECTORS, queryWithFallbacks } from "./gmail-selectors.js";
import { parseHostname } from "../analysis/link-parser.js";
import { clearWarningBanner, updateWarningBanner } from "./gmail-banner.js";

let lastEmailKey: string | null = null;
let cachedSettings: UserSettings | null = null;
const dismissedBannerKeys = new Set<string>();

async function getSettings(): Promise<UserSettings> {
  if (!cachedSettings) {
    cachedSettings = await loadSettings();
  }
  return cachedSettings;
}

function extractSenderInfo(root: ParentNode): {
  senderName: string;
  senderEmail: string;
} {
  const nameEl = queryWithFallbacks(root, [
    GMAIL_SELECTORS.senderName,
    'span[email][name]',
    ".gD",
  ]);
  const emailEl = queryWithFallbacks(root, [
    GMAIL_SELECTORS.senderEmail,
    'span[email]',
    ".go",
  ]);

  const senderName =
    nameEl?.getAttribute("name") ??
    nameEl?.textContent?.trim() ??
    "";
  const senderEmail =
    emailEl?.getAttribute("email") ??
    emailEl?.textContent?.trim() ??
    nameEl?.getAttribute("email") ??
    "";

  return { senderName, senderEmail };
}

function extractReplyTo(root: ParentNode): string | null {
  const metaSpans = root.querySelectorAll('span[email]');
  for (const span of metaSpans) {
    const label = span.parentElement?.textContent?.toLowerCase() ?? "";
    if (label.includes("reply-to")) {
      return span.getAttribute("email") ?? span.textContent?.trim() ?? null;
    }
  }
  return null;
}

function extractLinks(bodyEl: Element): EmailLink[] {
  const links: EmailLink[] = [];
  const anchors = bodyEl.querySelectorAll("a[href]");

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;

    links.push({
      displayText: anchor.textContent?.trim() ?? "",
      href,
      hostname: parseHostname(href),
    });
  }

  return links;
}

function extractEmailData(): EmailData | null {
  const main = document.querySelector(GMAIL_SELECTORS.main);
  if (!main) return null;

  const subjectEl = queryWithFallbacks(main, [
    GMAIL_SELECTORS.subject,
    "h2[data-thread-perm-id]",
  ]);
  const bodyEl = queryWithFallbacks(main, [
    GMAIL_SELECTORS.messageBody,
    "div.ii.gt",
    'div[dir="ltr"]',
  ]);

  if (!subjectEl && !bodyEl) return null;

  const { senderName, senderEmail } = extractSenderInfo(main);
  const subject = subjectEl?.textContent?.trim() ?? "";
  const bodyText = bodyEl?.textContent?.trim() ?? "";
  const links = bodyEl ? extractLinks(bodyEl) : [];

  if (!senderEmail && !subject && !bodyText) return null;

  return {
    senderName,
    senderEmail,
    replyTo: extractReplyTo(main),
    subject,
    bodyText,
    links,
    extractedAt: Date.now(),
  };
}

function buildEmailKey(email: EmailData): string {
  return `${email.senderEmail}|${email.subject}|${email.bodyText.slice(0, 120)}`;
}

async function notifyAnalysis(emailKey: string, email: EmailData): Promise<void> {
  const settings = await getSettings();
  const result = analyzeEmail(email, {
    disabledRuleIds: settings.disabledRuleIds,
  });

  updateWarningBanner(emailKey, result, settings, dismissedBannerKeys);

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.EMAIL_UPDATED,
    emailKey,
    result,
  });

  chrome.storage.local.set({
    lastAnalysis: { emailKey, result },
    lastEmail: email,
  });
}

async function scanCurrentEmail(force = false): Promise<void> {
  const email = extractEmailData();
  if (!email) {
    clearWarningBanner();
    return;
  }

  const emailKey = buildEmailKey(email);
  if (!force && emailKey === lastEmailKey) return;

  lastEmailKey = emailKey;
  await notifyAnalysis(emailKey, email);
}

function setupObserver(): void {
  const target = document.body;
  const observer = new MutationObserver(() => {
    void scanCurrentEmail();
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
  });

  void scanCurrentEmail();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.userSettings) return;

  cachedSettings = null;
  lastEmailKey = null;
  void scanCurrentEmail(true);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.GET_CURRENT_EMAIL) {
    const email = extractEmailData();
    const emailKey = email ? buildEmailKey(email) : null;
    sendResponse({ email, emailKey });
    return true;
  }

  if (message.type === MESSAGE_TYPES.ANALYZE_EMAIL && message.email) {
    void (async () => {
      const settings = await getSettings();
      const emailKey = message.emailKey ?? buildEmailKey(message.email);
      const result = analyzeEmail(message.email, {
        disabledRuleIds: settings.disabledRuleIds,
      });

      updateWarningBanner(emailKey, result, settings, dismissedBannerKeys);

      chrome.storage.local.set({
        lastAnalysis: { emailKey, result },
        lastEmail: message.email,
      });
      sendResponse({ result, emailKey });
    })();
    return true;
  }

  return false;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupObserver);
} else {
  setupObserver();
}
