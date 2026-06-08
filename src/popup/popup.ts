import {
  buildReportFilename,
  formatReportJson,
  formatReportMarkdown,
} from "../analysis/report.js";
import { MESSAGE_TYPES } from "../shared/messaging.js";
import type { AnalysisResult, EmailData } from "../shared/types.js";

const statusPanel = document.getElementById("status-panel")!;
const emptyState = document.getElementById("empty-state")!;
const findingsSection = document.getElementById("findings-section")!;
const guidanceSection = document.getElementById("guidance-section")!;
const exportSection = document.getElementById("export-section")!;
const riskBadge = document.getElementById("risk-badge")!;
const riskScore = document.getElementById("risk-score")!;
const emailSubject = document.getElementById("email-subject")!;
const emailSender = document.getElementById("email-sender")!;
const findingsList = document.getElementById("findings-list")!;
const guidanceList = document.getElementById("guidance-list")!;
const refreshBtn = document.getElementById("refresh-btn")!;
const copyMarkdownBtn = document.getElementById("copy-markdown-btn")!;
const downloadJsonBtn = document.getElementById("download-json-btn")!;
const exportStatus = document.getElementById("export-status")!;
const settingsLink = document.getElementById("settings-link")!;

let currentEmail: EmailData | null = null;
let currentResult: AnalysisResult | null = null;

function setExportStatus(message: string): void {
  exportStatus.textContent = message;
}

function showAnalysis(email: EmailData, result: AnalysisResult): void {
  currentEmail = email;
  currentResult = result;

  emptyState.classList.add("hidden");
  statusPanel.classList.remove("hidden");
  findingsSection.classList.remove("hidden");
  guidanceSection.classList.remove("hidden");
  exportSection.classList.remove("hidden");

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

  setExportStatus("");
}

function showEmpty(): void {
  currentEmail = null;
  currentResult = null;

  statusPanel.classList.add("hidden");
  findingsSection.classList.add("hidden");
  guidanceSection.classList.add("hidden");
  exportSection.classList.add("hidden");
  emptyState.classList.remove("hidden");
  setExportStatus("");
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

function requireCurrentAnalysis(): { email: EmailData; result: AnalysisResult } | null {
  if (!currentEmail || !currentResult) {
    setExportStatus("Analyze an email before exporting a report.");
    return null;
  }

  return { email: currentEmail, result: currentResult };
}

copyMarkdownBtn.addEventListener("click", async () => {
  const current = requireCurrentAnalysis();
  if (!current) return;

  try {
    await navigator.clipboard.writeText(
      formatReportMarkdown(current.email, current.result)
    );
    setExportStatus("Markdown report copied to clipboard.");
  } catch {
    setExportStatus("Could not copy to clipboard.");
  }
});

downloadJsonBtn.addEventListener("click", () => {
  const current = requireCurrentAnalysis();
  if (!current) return;

  const blob = new Blob([formatReportJson(current.email, current.result)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${buildReportFilename(current.email)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setExportStatus("JSON report downloaded.");
});

settingsLink.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

refreshBtn.addEventListener("click", () => {
  void loadFromActiveTab();
});

void loadFromActiveTab();
