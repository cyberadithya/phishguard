// @vitest-environment jsdom
//
// Only this file needs a DOM, so the environment is opted into per-file rather
// than globally — the rest of the suite stays on the faster `node` environment.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEmailKey,
  extractEmailData,
  extractLinks,
  extractMessageId,
  extractReplyTo,
  extractSenderInfo,
} from "../src/content/gmail-extract.js";
import type { EmailData } from "../src/shared/types.js";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/gmail-dom");
const sampleMessage = readFileSync(resolve(fixtureDir, "sample-message.html"), "utf8");

function render(html: string): void {
  document.body.innerHTML = html;
}

describe("Gmail DOM extraction (synthetic fixture)", () => {
  beforeEach(() => render(sampleMessage));

  it("extracts the subject from h2.hP", () => {
    const email = extractEmailData(document);
    expect(email?.subject).toBe("Action required: verify your account within 24 hours");
  });

  it("prefers the name/email attributes over the spans' text content", () => {
    const main = document.querySelector('div[role="main"]')!;
    expect(extractSenderInfo(main)).toEqual({
      senderName: "PayPal Security",
      // Not "<security@paypa1-alerts.example>" — the attribute wins, so the
      // angle brackets Gmail renders never reach the rule engine.
      senderEmail: "security@paypa1-alerts.example",
    });
  });

  it("extracts a Reply-To that diverges from the From address", () => {
    const email = extractEmailData(document);
    expect(email?.replyTo).toBe("refunds@mail-collect.example");
    expect(email?.replyTo).not.toBe(email?.senderEmail);
  });

  it("resolves Gmail's data-message-id by walking up from the body element", () => {
    const email = extractEmailData(document);
    expect(email?.messageId).toBe("msg-f:1795240991234567890");
  });

  it("extracts the body text", () => {
    const email = extractEmailData(document);
    expect(email?.bodyText).toContain("We detected unusual activity on your account");
    expect(email?.bodyText).toContain("PayPal Security Team");
  });

  it("extracts real links and skips in-page anchors and mailto: links", () => {
    const email = extractEmailData(document);
    expect(email?.links.map((link) => link.href)).toEqual([
      "https://paypa1-alerts.example/verify",
      "http://203.0.113.45/login",
    ]);
  });

  it("records each link's display text and resolved hostname", () => {
    const main = document.querySelector('div[role="main"]')!;
    const body = main.querySelector("div.a3s.aiL")!;
    const [deceptive, ipLink] = extractLinks(body);

    expect(deceptive).toEqual({
      displayText: "https://www.paypal.com/verify",
      href: "https://paypa1-alerts.example/verify",
      hostname: "paypa1-alerts.example",
    });
    expect(ipLink.hostname).toBe("203.0.113.45");
  });

  it("returns null when there is no Gmail message container", () => {
    render("<div><p>Inbox list, no open message</p></div>");
    expect(extractEmailData(document)).toBeNull();
  });

  it("returns null when the message container has no subject, sender or body", () => {
    render('<div role="main"><h2 class="hP"></h2></div>');
    expect(extractEmailData(document)).toBeNull();
  });

  it("returns null for a message id when no container carries one", () => {
    render('<div role="main"><div class="a3s aiL">body only</div></div>');
    const body = document.querySelector("div.a3s.aiL");
    expect(extractMessageId(body)).toBeNull();
  });
});

describe("buildEmailKey", () => {
  const base: EmailData = {
    senderName: "Sender",
    senderEmail: "sender@example.com",
    replyTo: null,
    subject: "Subject",
    bodyText: "Body text",
    links: [],
    extractedAt: 0,
    messageId: null,
  };

  it("prefers Gmail's real message id", () => {
    expect(buildEmailKey({ ...base, messageId: "msg-f:123" })).toBe("msg:msg-f:123");
  });

  it("falls back to the content-derived heuristic key when there is no message id", () => {
    expect(buildEmailKey(base)).toBe("sender@example.com|Subject|Body text");
  });
});

describe("extractReplyTo known fragility", () => {
  // This is not aspirational — it pins current behaviour so that fixing it is
  // a deliberate, visible change rather than an accident. extractReplyTo()
  // matches on the parent element's text, so if Gmail ever nests the Reply-To
  // row around the sender block, the sender's own address is returned as the
  // reply-to and the reply-to-divergence rule silently stops firing.
  it("returns the sender address when the Reply-To label wraps the sender block", () => {
    render(`
      <div role="main">
        <h2 class="hP">Subject</h2>
        <div class="hb">
          Reply-To:
          <span class="gD" name="Sender" email="sender@example.com">Sender</span>
          <span class="go" email="sender@example.com">&lt;sender@example.com&gt;</span>
        </div>
        <div class="hb2"><span email="attacker@evil.example">attacker@evil.example</span></div>
        <div data-message-id="m1"><div class="a3s aiL">body</div></div>
      </div>
    `);

    const main = document.querySelector('div[role="main"]')!;
    expect(extractReplyTo(main)).toBe("sender@example.com");
    // The address a user would actually reply to is never surfaced:
    expect(extractReplyTo(main)).not.toBe("attacker@evil.example");
  });
});
