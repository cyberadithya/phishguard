export const PHISHING_THRESHOLD = 50;
export const SETTINGS_STORAGE_KEY = "userSettings";

export interface UserSettings {
  phishingThreshold: number;
  showInPageBanner: boolean;
  disabledRuleIds: string[];
  /** Opt-in: check email link URLs against Google Safe Browsing. Off by default. */
  enableUrlIntel: boolean;
  /** User-supplied Safe Browsing API key. Stored only in chrome.storage.local. */
  safeBrowsingApiKey: string;
}

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
}

export const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    id: "sender-mismatch",
    name: "Sender Mismatch",
    description: "Display name references a brand that does not match the sender domain.",
  },
  {
    id: "reply-to-divergence",
    name: "Reply-To Divergence",
    description: "Reply-To address differs from the From address.",
  },
  {
    id: "link-deception",
    name: "Link Deception",
    description: "A link shows one URL but points somewhere else.",
  },
  {
    id: "punycode-domain",
    name: "Homograph Domain",
    description: "Link uses a punycode domain that may impersonate a real site.",
  },
  {
    id: "suspicious-tld",
    name: "Suspicious TLD",
    description: "Link uses a top-level domain commonly abused in phishing.",
  },
  {
    id: "urgency-language",
    name: "Urgency Language",
    description: "Message uses pressure or credential-related language.",
  },
  {
    id: "credential-link",
    name: "Credential Harvesting Link",
    description: "Login or verification path on an untrusted domain.",
  },
  {
    id: "domain-mismatch",
    name: "Sender/Link Domain Mismatch",
    description: "Links point outside the sender's organization.",
  },
  {
    id: "wire-fraud",
    name: "Wire Transfer Fraud",
    description: "Urgent payment request patterns common in BEC scams.",
  },
  {
    id: "ip-link",
    name: "IP Address Link",
    description: "Link points to a raw IP address instead of a domain.",
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  phishingThreshold: PHISHING_THRESHOLD,
  showInPageBanner: true,
  disabledRuleIds: [],
  enableUrlIntel: false,
  safeBrowsingApiKey: "",
};

export function normalizeSettings(raw: Partial<UserSettings> | undefined): UserSettings {
  const threshold = Number(raw?.phishingThreshold ?? DEFAULT_SETTINGS.phishingThreshold);
  const disabledRuleIds = Array.isArray(raw?.disabledRuleIds)
    ? raw.disabledRuleIds.filter((id) => RULE_DEFINITIONS.some((rule) => rule.id === id))
    : [];

  const safeBrowsingApiKey =
    typeof raw?.safeBrowsingApiKey === "string"
      ? raw.safeBrowsingApiKey.trim()
      : DEFAULT_SETTINGS.safeBrowsingApiKey;

  return {
    phishingThreshold: Math.min(75, Math.max(25, threshold)),
    showInPageBanner: raw?.showInPageBanner ?? DEFAULT_SETTINGS.showInPageBanner,
    disabledRuleIds,
    // Never enable URL intel with no key configured, regardless of stored value.
    enableUrlIntel: Boolean(raw?.enableUrlIntel ?? DEFAULT_SETTINGS.enableUrlIntel) && Boolean(safeBrowsingApiKey),
    safeBrowsingApiKey,
  };
}

export async function loadSettings(): Promise<UserSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(stored[SETTINGS_STORAGE_KEY]);
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await chrome.storage.local.set({
    [SETTINGS_STORAGE_KEY]: normalizeSettings(settings),
  });
}

export function shouldShowBanner(
  score: number,
  settings: UserSettings
): boolean {
  return settings.showInPageBanner && score >= settings.phishingThreshold;
}
