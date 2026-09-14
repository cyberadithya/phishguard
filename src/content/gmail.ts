import { analyzeEmail } from "../analysis/scorer.js";
import { augmentResultWithUrlIntel, selectUrlsForIntelCheck } from "../analysis/url-intel.js";
import type { AnalysisResult, EmailData, UrlIntelMatch } from "../shared/types.js";
import { MESSAGE_TYPES } from "../shared/messaging.js";
import type { CheckUrlsResponse } from "../shared/messaging.js";
import { loadSettings, type UserSettings } from "../shared/settings.js";
import { buildEmailKey, extractEmailData } from "./gmail-extract.js";
import {
  clearWarningBanner,
  loadDismissedBannerKeys,
  updateWarningBanner,
} from "./gmail-banner.js";

let lastEmailKey: string | null = null;
let cachedSettings: UserSettings | null = null;
let dismissedBannerKeys = new Set<string>();

async function getSettings(): Promise<UserSettings> {
  if (!cachedSettings) {
    cachedSettings = await loadSettings();
  }
  return cachedSettings;
}

async function checkUrlIntel(email: EmailData, settings: UserSettings): Promise<UrlIntelMatch[]> {
  if (!settings.enableUrlIntel || !settings.safeBrowsingApiKey) return [];

  const urls = selectUrlsForIntelCheck(email.links);
  if (urls.length === 0) return [];

  try {
    const response = (await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CHECK_URLS,
      urls,
      apiKey: settings.safeBrowsingApiKey,
    })) as CheckUrlsResponse | undefined;
    return response?.matches ?? [];
  } catch {
    // Background worker unreachable, or the safebrowsing.googleapis.com
    // permission hasn't been granted yet — fail open to the local-only result.
    return [];
  }
}

async function buildAnalysis(email: EmailData, settings: UserSettings): Promise<AnalysisResult> {
  const localResult = analyzeEmail(email, {
    disabledRuleIds: settings.disabledRuleIds,
  });

  const matches = await checkUrlIntel(email, settings);
  return matches.length > 0 ? augmentResultWithUrlIntel(localResult, matches) : localResult;
}

async function notifyAnalysis(emailKey: string, email: EmailData): Promise<void> {
  const settings = await getSettings();
  const result = await buildAnalysis(email, settings);

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

async function setupObserver(): Promise<void> {
  dismissedBannerKeys = await loadDismissedBannerKeys();

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
  if (area !== "local") return;

  if (changes.userSettings) {
    cachedSettings = null;
    lastEmailKey = null;
    void scanCurrentEmail(true);
  }
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
      const result = await buildAnalysis(message.email, settings);

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
  document.addEventListener("DOMContentLoaded", () => void setupObserver());
} else {
  void setupObserver();
}
