# Security & Privacy

## Privacy commitment

PhishGuard is designed with a **local-first** architecture:

- Email content is extracted from the Gmail page only when you have a message open
- All phishing analysis runs entirely in your browser
- Results are stored in `chrome.storage.local` on your device only
- **No email content is transmitted to external servers** in the current MVP

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Cache the latest analysis so the popup can display results |
| `activeTab` | Communicate with the content script on the current Gmail tab |
| `https://mail.google.com/*` | Inject the content script to read the open email's DOM |

PhishGuard does **not** request broad access to all websites or `tabs` permission to read every tab in the background.

## Data handling

**Collected locally (never sent externally):**

- Sender name and email address
- Subject line
- Email body text
- URLs found in the message
- Analysis score and findings

**Not collected:**

- Passwords or credentials
- Email from tabs you haven't opened
- Browsing history outside Gmail
- Attachments or attachment contents

## Responsible disclosure

If you discover a security vulnerability in PhishGuard itself, please report it responsibly. Do not publish exploit details before a fix is available.

## Test data

The `tests/fixtures/` directory contains **synthetic** email samples for automated testing. These are not real user emails and should not be treated as live threat intelligence.

## Ethical guidelines

1. Use PhishGuard only on mailboxes you own or have explicit permission to test
2. Do not use analysis output to impersonate security authorities
3. When reporting phishing, use your organization's official channels
4. Redact personal information before sharing screenshots in portfolios or demos
