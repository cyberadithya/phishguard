import {
  DEFAULT_SETTINGS,
  RULE_DEFINITIONS,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type UserSettings,
} from "../shared/settings.js";
import { SAFE_BROWSING_ORIGIN } from "../analysis/url-intel.js";

const thresholdSlider = document.getElementById("threshold-slider") as HTMLInputElement;
const thresholdValue = document.getElementById("threshold-value")!;
const showBannerCheckbox = document.getElementById("show-banner") as HTMLInputElement;
const rulesList = document.getElementById("rules-list")!;
const enableUrlIntelCheckbox = document.getElementById("enable-url-intel") as HTMLInputElement;
const safeBrowsingKeyInput = document.getElementById("safe-browsing-key") as HTMLInputElement;
const urlIntelStatusEl = document.getElementById("url-intel-status")!;
const saveBtn = document.getElementById("save-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const statusEl = document.getElementById("status")!;

function renderRuleToggles(disabledRuleIds: string[]): void {
  rulesList.innerHTML = "";

  for (const rule of RULE_DEFINITIONS) {
    const item = document.createElement("div");
    item.className = "rule-item";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.ruleId = rule.id;
    checkbox.checked = !disabledRuleIds.includes(rule.id);

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "rule-name";
    name.textContent = rule.name;

    const description = document.createElement("div");
    description.className = "rule-description";
    description.textContent = rule.description;

    text.append(name, description);
    label.append(checkbox, text);
    item.append(label);
    rulesList.append(item);
  }
}

function readFormSettings(): UserSettings {
  const disabledRuleIds: string[] = [];

  for (const checkbox of rulesList.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
    if (!checkbox.checked && checkbox.dataset.ruleId) {
      disabledRuleIds.push(checkbox.dataset.ruleId);
    }
  }

  return normalizeSettings({
    phishingThreshold: Number(thresholdSlider.value),
    showInPageBanner: showBannerCheckbox.checked,
    disabledRuleIds,
    enableUrlIntel: enableUrlIntelCheckbox.checked,
    safeBrowsingApiKey: safeBrowsingKeyInput.value,
  });
}

function applySettingsToForm(settings: UserSettings): void {
  thresholdSlider.value = String(settings.phishingThreshold);
  thresholdValue.textContent = String(settings.phishingThreshold);
  showBannerCheckbox.checked = settings.showInPageBanner;
  renderRuleToggles(settings.disabledRuleIds);
  enableUrlIntelCheckbox.checked = settings.enableUrlIntel;
  safeBrowsingKeyInput.value = settings.safeBrowsingApiKey;
}

function setStatus(message: string): void {
  statusEl.textContent = message;
}

function setUrlIntelStatus(message: string, warn = false): void {
  urlIntelStatusEl.textContent = message;
  urlIntelStatusEl.classList.toggle("warn", warn);
}

thresholdSlider.addEventListener("input", () => {
  thresholdValue.textContent = thresholdSlider.value;
});

// Requesting the Safe Browsing host permission needs a user gesture, so it
// happens right on the checkbox click rather than deferred to Save. If the
// user declines, the checkbox reverts and the setting is never persisted as
// enabled without the permission actually being granted.
enableUrlIntelCheckbox.addEventListener("change", () => {
  if (!enableUrlIntelCheckbox.checked) {
    setUrlIntelStatus("");
    return;
  }

  if (!safeBrowsingKeyInput.value.trim()) {
    enableUrlIntelCheckbox.checked = false;
    setUrlIntelStatus("Add a Safe Browsing API key first.", true);
    return;
  }

  void (async () => {
    try {
      const granted = await chrome.permissions.request({
        origins: [SAFE_BROWSING_ORIGIN],
      });

      if (!granted) {
        enableUrlIntelCheckbox.checked = false;
        setUrlIntelStatus("Permission denied — Safe Browsing checks were not enabled.", true);
        return;
      }

      setUrlIntelStatus('Permission granted. Click "Save settings" to apply.');
    } catch {
      enableUrlIntelCheckbox.checked = false;
      setUrlIntelStatus("Could not request permission.", true);
    }
  })();
});

saveBtn.addEventListener("click", async () => {
  const settings = readFormSettings();
  await saveSettings(settings);

  // Hygiene: drop the host permission once it's no longer needed, rather
  // than holding an unused grant. Best-effort — a failure here doesn't block
  // saving the rest of the settings.
  if (!settings.enableUrlIntel) {
    try {
      await chrome.permissions.remove({ origins: [SAFE_BROWSING_ORIGIN] });
    } catch {
      // Ignore — nothing to revoke, or the browser declined the removal.
    }
  }

  applySettingsToForm(settings);
  setStatus("Settings saved. Reopen Gmail messages to apply changes.");
});

resetBtn.addEventListener("click", async () => {
  applySettingsToForm(DEFAULT_SETTINGS);
  await saveSettings(DEFAULT_SETTINGS);
  try {
    await chrome.permissions.remove({ origins: [SAFE_BROWSING_ORIGIN] });
  } catch {
    // Ignore.
  }
  setStatus("Settings reset to defaults.");
});

void (async () => {
  const settings = await loadSettings();
  applySettingsToForm(settings);
})();
