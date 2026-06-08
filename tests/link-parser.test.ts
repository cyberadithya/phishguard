import { describe, expect, it } from "vitest";
import {
  extractLinksFromHtml,
  isLinkDeceptive,
  isPunycodeDomain,
  isSuspiciousTld,
  parseHostname,
} from "../src/analysis/link-parser.js";

describe("link-parser", () => {
  it("parses hostnames from URLs", () => {
    expect(parseHostname("https://example.com/path")).toBe("example.com");
    expect(parseHostname("not-a-url")).toBe("");
  });

  it("detects deceptive links", () => {
    expect(
      isLinkDeceptive({
        displayText: "https://paypal.com",
        href: "https://evil.com/login",
        hostname: "evil.com",
      })
    ).toBe(true);

    expect(
      isLinkDeceptive({
        displayText: "Click here",
        href: "https://evil.com",
        hostname: "evil.com",
      })
    ).toBe(false);
  });

  it("detects punycode domains", () => {
    expect(isPunycodeDomain("xn--pple-43d.com")).toBe(true);
    expect(isPunycodeDomain("apple.com")).toBe(false);
  });

  it("flags suspicious TLDs", () => {
    expect(isSuspiciousTld("phish-site.xyz")).toBe(true);
    expect(isSuspiciousTld("company.com")).toBe(false);
  });

  it("extracts links from HTML", () => {
    const html =
      '<a href="https://evil.com">https://paypal.com</a> plain text';
    const links = extractLinksFromHtml(html);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("https://evil.com");
    expect(links[0].displayText).toBe("https://paypal.com");
  });
});
