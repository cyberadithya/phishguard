import { MESSAGE_TYPES } from "../shared/messaging.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("PhishGuard installed — analyzing Gmail locally.");
});

chrome.runtime.onMessage.addListener((message, sender) => {
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
  }
});
