/**
 * Pure Gmail DOM extraction.
 *
 * Everything in this module reads from a DOM tree and returns plain data — no
 * `chrome.*` APIs, no listeners, no storage. That separation is what makes it
 * testable: importing `gmail.ts` outside an extension context throws, because
 * it registers `chrome.runtime.onMessage` listeners at module scope, so the
 * extraction logic could not previously be exercised by a unit test at all.
 *
 * See `tests/gmail-extract.test.ts` and the hand-authored fixture in
 * `tests/fixtures/gmail-dom/` for the regression tests this enables.
 */
import { parseHostname } from "../analysis/link-parser.js";
import type { EmailData, EmailLink } from "../shared/types.js";
import { GMAIL_SELECTORS, queryWithFallbacks } from "./gmail-selectors.js";

export function extractSenderInfo(root: ParentNode): {
  senderName: string;
  senderEmail: string;
} {
  const nameEl = queryWithFallbacks(root, [GMAIL_SELECTORS.senderName, "span[email][name]", ".gD"]);
  const emailEl = queryWithFallbacks(root, [GMAIL_SELECTORS.senderEmail, "span[email]", ".go"]);

  const senderName = nameEl?.getAttribute("name") ?? nameEl?.textContent?.trim() ?? "";
  const senderEmail =
    emailEl?.getAttribute("email") ??
    emailEl?.textContent?.trim() ??
    nameEl?.getAttribute("email") ??
    "";

  return { senderName, senderEmail };
}

/**
 * NOTE (known fragility): this matches on the *parent element's* text
 * containing "reply-to", and returns the first `span[email]` whose parent
 * does. If Gmail ever nests the Reply-To row inside the sender block, the
 * sender's own parent can match first and the sender address is returned as
 * the reply-to — which would silently stop the `reply-to-divergence` rule from
 * firing. `tests/gmail-extract.test.ts` pins the current behaviour and the
 * fixture documents the layout this depends on.
 */
export function extractReplyTo(root: ParentNode): string | null {
  const metaSpans = root.querySelectorAll("span[email]");
  for (const span of metaSpans) {
    const label = span.parentElement?.textContent?.toLowerCase() ?? "";
    if (label.includes("reply-to")) {
      return span.getAttribute("email") ?? span.textContent?.trim() ?? null;
    }
  }
  return null;
}

export function extractLinks(bodyEl: Element): EmailLink[] {
  const links: EmailLink[] = [];
  const anchors = bodyEl.querySelectorAll("a[href]");

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;

    links.push({
      displayText: anchor.textContent?.trim() ?? "",
      href,
      hostname: parseHostname(href),
    });
  }

  return links;
}

/** Gmail's own message id for the rendered message, when present in the DOM. */
export function extractMessageId(bodyEl: Element | null): string | null {
  const container = bodyEl?.closest(GMAIL_SELECTORS.messageContainer);
  return container?.getAttribute("data-message-id") ?? null;
}

/**
 * `root` defaults to `document` so production behaviour is unchanged; tests
 * pass a jsdom document (or any subtree) instead.
 */
export function extractEmailData(root: ParentNode = document): EmailData | null {
  const main = root.querySelector(GMAIL_SELECTORS.main);
  if (!main) return null;

  const subjectEl = queryWithFallbacks(main, [GMAIL_SELECTORS.subject, "h2[data-thread-perm-id]"]);
  const bodyEl = queryWithFallbacks(main, [
    GMAIL_SELECTORS.messageBody,
    "div.ii.gt",
    'div[dir="ltr"]',
  ]);

  if (!subjectEl && !bodyEl) return null;

  const { senderName, senderEmail } = extractSenderInfo(main);
  const subject = subjectEl?.textContent?.trim() ?? "";
  const bodyText = bodyEl?.textContent?.trim() ?? "";
  const links = bodyEl ? extractLinks(bodyEl) : [];

  if (!senderEmail && !subject && !bodyText) return null;

  return {
    senderName,
    senderEmail,
    replyTo: extractReplyTo(main),
    subject,
    bodyText,
    links,
    extractedAt: Date.now(),
    messageId: extractMessageId(bodyEl),
  };
}

/** Prefer Gmail's real message id (stable across re-renders of the same
 * message) and fall back to the previous content-derived heuristic key when
 * Gmail's DOM doesn't expose one — e.g. if selectors drift. This keeps
 * banner-dismiss state and analysis dedup working even when the thread view
 * re-renders the same message, which the heuristic key could miss or collide
 * on for near-identical subjects/bodies. */
export function buildEmailKey(email: EmailData): string {
  if (email.messageId) return `msg:${email.messageId}`;
  return `${email.senderEmail}|${email.subject}|${email.bodyText.slice(0, 120)}`;
}
