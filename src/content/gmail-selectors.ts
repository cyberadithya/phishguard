export const GMAIL_SELECTORS = {
  main: 'div[role="main"]',
  subject: "h2.hP",
  senderName: "span.gD",
  senderEmail: "span.go",
  messageBody: "div.a3s.aiL",
  messageContainer: "div[data-message-id]",
  replyToMeta: 'span[email]',
} as const;

export function queryWithFallbacks(
  root: ParentNode,
  selectors: string[]
): Element | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el) return el;
  }
  return null;
}
