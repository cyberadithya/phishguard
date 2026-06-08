import {
  DEFAULT_SETTINGS,
  RULE_DEFINITIONS,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type UserSettings,
} from "../shared/settings.js";

const thresholdSlider = document.getElementById("threshold-slider") as HTMLInputElement;
const thresholdValue = document.getElementById("threshold-value")!;
const showBannerCheckbox = document.getElementById("show-banner") as HTMLInputElement;
const rulesList = document.getElementById("rules-list")!;
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
  });
}

function applySettingsToForm(settings: UserSettings): void {
  thresholdSlider.value = String(settings.phishingThreshold);
  thresholdValue.textContent = String(settings.phishingThreshold);
  showBannerCheckbox.checked = settings.showInPageBanner;
  renderRuleToggles(settings.disabledRuleIds);
}

function setStatus(message: string): void {
  statusEl.textContent = message;
}

thresholdSlider.addEventListener("input", () => {
  thresholdValue.textContent = thresholdSlider.value;
});

saveBtn.addEventListener("click", async () => {
  const settings = readFormSettings();
  await saveSettings(settings);
  setStatus("Settings saved. Reopen Gmail messages to apply changes.");
});

resetBtn.addEventListener("click", async () => {
  applySettingsToForm(DEFAULT_SETTINGS);
  await saveSettings(DEFAULT_SETTINGS);
  setStatus("Settings reset to defaults.");
});

void (async () => {
  const settings = await loadSettings();
  applySettingsToForm(settings);
})();
