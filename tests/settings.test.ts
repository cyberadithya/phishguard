import { describe, expect, it } from "vitest";
import { analyzeEmail } from "../src/analysis/scorer.js";
import { normalizeSettings, shouldShowBanner } from "../src/shared/settings.js";
import type { EmailData } from "../src/shared/types.js";

const phishingEmail: EmailData = {
  senderName: "PayPal",
  senderEmail: "alert@fake-paypal.com",
  replyTo: null,
  subject: "Verify your account within 24 hours",
  bodyText: "Click here immediately to verify your credentials.",
  links: [
    {
      displayText: "https://paypal.com",
      href: "https://fake-paypal.com/login",
      hostname: "fake-paypal.com",
    },
  ],
  extractedAt: Date.now(),
};

describe("user settings", () => {
  it("normalizes threshold bounds and unknown rule ids", () => {
    const settings = normalizeSettings({
      phishingThreshold: 99,
      disabledRuleIds: ["sender-mismatch", "not-a-rule"],
    });

    expect(settings.phishingThreshold).toBe(75);
    expect(settings.disabledRuleIds).toEqual(["sender-mismatch"]);
  });

  it("reduces score when rules are disabled", () => {
    const full = analyzeEmail(phishingEmail);
    const reduced = analyzeEmail(phishingEmail, {
      disabledRuleIds: ["sender-mismatch", "link-deception", "urgency-language"],
    });

    expect(reduced.score).toBeLessThan(full.score);
    expect(reduced.findings.some((f) => f.id === "sender-mismatch")).toBe(false);
  });

  it("controls banner visibility from threshold and toggle", () => {
    const settings = normalizeSettings({
      phishingThreshold: 50,
      showInPageBanner: true,
      disabledRuleIds: [],
    });

    expect(shouldShowBanner(72, settings)).toBe(true);
    expect(shouldShowBanner(30, settings)).toBe(false);
    expect(shouldShowBanner(72, { ...settings, showInPageBanner: false })).toBe(
      false
    );
  });
});
