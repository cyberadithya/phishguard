import { describe, expect, it } from "vitest";
import {
  checkCredentialHarvestingLinks,
  checkIpAddressLinks,
  checkLinkDeception,
  checkPunycodeDomains,
  checkReplyToDivergence,
  checkSenderDomainMismatch,
  checkSenderMismatch,
  checkSuspiciousTlds,
  checkUrgencyLanguage,
  checkWireFraud,
} from "../src/analysis/rules.js";
import type { EmailData } from "../src/shared/types.js";

function baseEmail(overrides: Partial<EmailData> = {}): EmailData {
  return {
    senderName: "Example",
    senderEmail: "sender@example.com",
    replyTo: null,
    subject: "Subject",
    bodyText: "Body",
    links: [],
    extractedAt: Date.now(),
    ...overrides,
  };
}

describe("detection rules", () => {
  it("checkSenderMismatch flags brand impersonation", () => {
    const finding = checkSenderMismatch(
      baseEmail({
        senderName: "PayPal",
        senderEmail: "alert@fake-paypal.com",
      })
    );

    expect(finding?.rule).toBe("Sender Mismatch");
  });

  it("checkReplyToDivergence flags mismatched reply-to", () => {
    const finding = checkReplyToDivergence(
      baseEmail({
        senderEmail: "ceo@company.com",
        replyTo: "payments@external.xyz",
      })
    );

    expect(finding?.rule).toBe("Reply-To Divergence");
  });

  it("checkLinkDeception flags mismatched href", () => {
    const findings = checkLinkDeception(
      baseEmail({
        links: [
          {
            displayText: "https://paypal.com",
            href: "https://evil.com/login",
            hostname: "evil.com",
          },
        ],
      })
    );

    expect(findings[0]?.rule).toBe("Link Deception");
  });

  it("checkPunycodeDomains flags xn-- labels", () => {
    const findings = checkPunycodeDomains(
      baseEmail({
        links: [
          {
            displayText: "Apple",
            href: "https://xn--pple-43d.com",
            hostname: "xn--pple-43d.com",
          },
        ],
      })
    );

    expect(findings[0]?.rule).toBe("Homograph Domain");
  });

  it("checkSuspiciousTlds flags abusive TLDs", () => {
    const findings = checkSuspiciousTlds(
      baseEmail({
        links: [
          {
            displayText: "Offer",
            href: "https://promo-deals.xyz",
            hostname: "promo-deals.xyz",
          },
        ],
      })
    );

    expect(findings[0]?.rule).toBe("Suspicious TLD");
  });

  it("checkUrgencyLanguage flags pressure phrases", () => {
    const findings = checkUrgencyLanguage(
      baseEmail({
        subject: "URGENT",
        bodyText: "Verify your account within 24 hours.",
      })
    );

    expect(findings.some((f) => f.rule === "Urgency Language")).toBe(true);
  });

  it("checkCredentialHarvestingLinks flags login paths on untrusted hosts", () => {
    const findings = checkCredentialHarvestingLinks(
      baseEmail({
        links: [
          {
            displayText: "Login",
            href: "https://random-site.top/login",
            hostname: "random-site.top",
          },
        ],
      })
    );

    expect(findings[0]?.rule).toBe("Credential Harvesting Link");
  });

  it("checkSenderDomainMismatch flags external untrusted links", () => {
    const finding = checkSenderDomainMismatch(
      baseEmail({
        senderEmail: "billing@acmecorp.com",
        links: [
          {
            displayText: "Pay",
            href: "https://payments-random.xyz/pay",
            hostname: "payments-random.xyz",
          },
        ],
      })
    );

    expect(finding?.rule).toBe("Sender/Link Domain Mismatch");
  });

  it("checkWireFraud flags executive payment scams", () => {
    const finding = checkWireFraud(
      baseEmail({
        senderName: "CEO",
        senderEmail: "ceo@company.com",
        replyTo: "finance@external-mail.xyz",
        bodyText: "Please process a wire transfer today.",
      })
    );

    expect(finding?.rule).toBe("Wire Transfer Fraud");
  });

  it("checkIpAddressLinks flags raw IP destinations", () => {
    const findings = checkIpAddressLinks(
      baseEmail({
        links: [
          {
            displayText: "Portal",
            href: "http://192.0.2.10/login",
            hostname: "192.0.2.10",
          },
        ],
      })
    );

    expect(findings[0]?.rule).toBe("IP Address Link");
  });
});
