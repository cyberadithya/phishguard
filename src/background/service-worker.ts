import { MESSAGE_TYPES } from "../shared/messaging.js";
import type { CheckUrlsRequest, CheckUrlsResponse } from "../shared/messaging.js";
import {
  SAFE_BROWSING_ENDPOINT,
  buildSafeBrowsingRequestBody,
  parseSafeBrowsingMatches,
} from "../analysis/url-intel.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("PhishGuard installed — analyzing Gmail locally.");
});

async function handleCheckUrls(request: CheckUrlsRequest): Promise<CheckUrlsResponse> {
  if (!request.apiKey || request.urls.length === 0) {
    return { matches: [] };
  }

  try {
    const response = await fetch(
      `${SAFE_BROWSING_ENDPOINT}?key=${encodeURIComponent(request.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSafeBrowsingRequestBody(request.urls)),
      }
    );

    if (!response.ok) {
      return {
        matches: [],
        error: `Safe Browsing request failed (HTTP ${response.status})`,
      };
    }

    const json = await response.json();
    return { matches: parseSafeBrowsingMatches(json) };
  } catch (error) {
    return {
      matches: [],
      error: error instanceof Error ? error.message : "Safe Browsing request failed",
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.EMAIL_UPDATED) {
    chrome.action.setBadgeText({
      text: String(message.result.score),
      tabId: sender.tab?.id,
    });

    const colors: Record<string, string> = {
      low: "#22c55e",
      medium: "#eab308",
      high: "#f97316",
      critical: "#ef4444",
    };

    chrome.action.setBadgeBackgroundColor({
      color: colors[message.result.riskLevel] ?? "#6b7280",
      tabId: sender.tab?.id,
    });
    return false;
  }

  if (message.type === MESSAGE_TYPES.CHECK_URLS) {
    void handleCheckUrls(message as CheckUrlsRequest).then(sendResponse);
    return true; // keep the message channel open for the async sendResponse
  }

  return false;
});
