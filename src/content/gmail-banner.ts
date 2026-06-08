import type { AnalysisResult } from "../shared/types.js";
import type { UserSettings } from "../shared/settings.js";
import { shouldShowBanner } from "../shared/settings.js";

const BANNER_HOST_ID = "phishguard-banner-host";

const BANNER_STYLES = `
  :host {
    display: block;
    margin: 0 0 12px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .banner {
    border-radius: 10px;
    padding: 12px 14px;
    border: 1px solid transparent;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  }
  .banner.high {
    background: #fff7ed;
    border-color: #fdba74;
    color: #7c2d12;
  }
  .banner.critical {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #7f1d1d;
  }
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .title {
    font-size: 14px;
    font-weight: 700;
  }
  .score {
    font-size: 12px;
    font-weight: 600;
  }
  .message {
    font-size: 13px;
    line-height: 1.45;
    margin-bottom: 8px;
  }
  .findings {
    font-size: 12px;
    line-height: 1.4;
    margin: 0;
    padding-left: 18px;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  button {
    border: none;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .dismiss {
    background: rgba(15, 23, 42, 0.08);
    color: inherit;
  }
`;

function bannerMessage(riskLevel: AnalysisResult["riskLevel"]): string {
  if (riskLevel === "critical") {
    return "This message shows multiple high-risk phishing signals. Avoid clicking links or replying.";
  }

  return "This message has strong phishing indicators. Verify the sender before taking action.";
}

function removeBanner(): void {
  document.getElementById(BANNER_HOST_ID)?.remove();
}

function findBannerAnchor(): Element | null {
  return (
    document.querySelector('div[role="main"]') ??
    document.querySelector(".nH") ??
    document.body
  );
}

export function updateWarningBanner(
  emailKey: string,
  result: AnalysisResult,
  settings: UserSettings,
  dismissedKeys: Set<string>
): void {
  removeBanner();

  if (dismissedKeys.has(emailKey) || !shouldShowBanner(result.score, settings)) {
    return;
  }

  const anchor = findBannerAnchor();
  if (!anchor) return;

  const host = document.createElement("div");
  host.id = BANNER_HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BANNER_STYLES;

  const wrapper = document.createElement("div");
  wrapper.className = `banner ${result.riskLevel}`;

  const titleRow = document.createElement("div");
  titleRow.className = "title-row";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = `PhishGuard: ${result.riskLevel.toUpperCase()} risk`;

  const score = document.createElement("div");
  score.className = "score";
  score.textContent = `Score ${result.score}/100`;

  titleRow.append(title, score);

  const message = document.createElement("div");
  message.className = "message";
  message.textContent = bannerMessage(result.riskLevel);

  const findings = document.createElement("ul");
  findings.className = "findings";
  for (const finding of result.findings.slice(0, 3)) {
    const item = document.createElement("li");
    item.textContent = finding.rule;
    findings.appendChild(item);
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "dismiss";
  dismissBtn.type = "button";
  dismissBtn.textContent = "Dismiss for this email";
  dismissBtn.addEventListener("click", () => {
    dismissedKeys.add(emailKey);
    removeBanner();
  });

  actions.append(dismissBtn);
  wrapper.append(titleRow, message, findings, actions);
  shadow.append(style, wrapper);

  anchor.insertAdjacentElement("afterbegin", host);
}

export function clearWarningBanner(): void {
  removeBanner();
}
