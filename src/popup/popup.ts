import { MESSAGE_TYPES } from "../shared/messaging.js";
import type { AnalysisResult, EmailData } from "../shared/types.js";

const statusPanel = document.getElementById("status-panel")!;
const emptyState = document.getElementById("empty-state")!;
const findingsSection = document.getElementById("findings-section")!;
const guidanceSection = document.getElementById("guidance-section")!;
const riskBadge = document.getElementById("risk-badge")!;
const riskScore = document.getElementById("risk-score")!;
const emailSubject = document.getElementById("email-subject")!;
const emailSender = document.getElementById("email-sender")!;
const findingsList = document.getElementById("findings-list")!;
const guidanceList = document.getElementById("guidance-list")!;
const refreshBtn = document.getElementById("refresh-btn")!;

function showAnalysis(email: EmailData, result: AnalysisResult): void {
  emptyState.classList.add("hidden");
  statusPanel.classList.remove("hidden");
  findingsSection.classList.remove("hidden");
  guidanceSection.classList.remove("hidden");

  riskBadge.textContent = result.riskLevel;
  riskBadge.className = `risk-badge ${result.riskLevel}`;
  riskScore.textContent = `${result.score}/100`;
  emailSubject.textContent = email.subject || "(No subject)";
  emailSender.textContent = `${email.senderName} <${email.senderEmail}>`;

  findingsList.innerHTML = "";
  if (result.findings.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No phishing indicators detected.";
    li.className = "finding-item low";
    findingsList.appendChild(li);
  } else {
    for (const finding of result.findings) {
      const li = document.createElement("li");
      li.className = `finding-item ${finding.severity}`;
      li.innerHTML = `
        <div class="finding-rule">${finding.rule}</div>
        <div class="finding-message">${finding.message}</div>
        ${finding.evidence ? `<div class="finding-evidence">${finding.evidence}</div>` : ""}
      `;
      findingsList.appendChild(li);
    }
  }

  guidanceList.innerHTML = "";
  for (const tip of result.guidance) {
    const li = document.createElement("li");
    li.textContent = tip;
    guidanceList.appendChild(li);
  }
}

function showEmpty(): void {
  statusPanel.classList.add("hidden");
  findingsSection.classList.add("hidden");
  guidanceSection.classList.add("hidden");
  emptyState.classList.remove("hidden");
}

async function loadFromActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes("mail.google.com")) {
    showEmpty();
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.GET_CURRENT_EMAIL,
    });

    if (response?.email) {
      const analyzeResponse = await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.ANALYZE_EMAIL,
        email: response.email,
        emailKey: response.emailKey,
      });
      showAnalysis(response.email, analyzeResponse.result);
      return;
    }
  } catch {
    // Content script may not be ready
  }

  const stored = await chrome.storage.local.get(["lastEmail", "lastAnalysis"]);
  if (stored.lastEmail && stored.lastAnalysis?.result) {
    showAnalysis(stored.lastEmail, stored.lastAnalysis.result);
    return;
  }

  showEmpty();
}

refreshBtn.addEventListener("click", () => {
  loadFromActiveTab();
});

loadFromActiveTab();
