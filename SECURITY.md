# Security & Privacy

## Privacy commitment

PhishGuard is designed with a **local-first** architecture:

- Email content is extracted from the Gmail page only when you have a message open
- All phishing analysis runs entirely in your browser
- Results are stored in `chrome.storage.local` on your device only
- **No email content is transmitted to external servers.** An optional, off-by-default
  Google Safe Browsing check sends **link URLs only** (never sender, subject, or body
  text) — see "Optional threat intelligence" below.

## Permissions explained

| Permission                                         | Why it's needed                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `storage`                                          | Cache the latest analysis so the popup can display results                                          |
| `activeTab`                                        | Communicate with the content script on the current Gmail tab                                        |
| `https://mail.google.com/*`                        | Inject the content script to read the open email's DOM                                              |
| `https://safebrowsing.googleapis.com/*` (optional) | Only requested if you enable Safe Browsing URL checks in Settings; not present on a default install |

PhishGuard does **not** request broad access to all websites or `tabs` permission to read every tab in the background.

## Optional threat intelligence

PhishGuard can optionally check the URLs found in an open email against
[Google Safe Browsing](https://developers.google.com/safe-browsing/v4/get-started).
This is **off by default**. If you turn it on in Settings:

- Only the URLs from the open email are sent — never sender, subject, or body text
- You provide your own free Safe Browsing API key; it is stored only in this browser's
  `chrome.storage.local`, never committed to the repo or sent anywhere except Google's
  Safe Browsing endpoint
- The extension requests the `safebrowsing.googleapis.com` host permission only at the
  moment you enable the feature, and removes it again if you turn the feature off
- A confirmed match adds a high-weight finding on top of the local heuristic score,
  clearly labeled "Threat Intel Match (Google Safe Browsing)" in the popup and any
  exported report

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md#7-planned-features--threat-preview) for
the corresponding threat-model update.

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

## Threat modeling

For a STRIDE-based analysis of PhishGuard's extension architecture, trust boundaries, and residual risks, see [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Responsible disclosure

If you discover a security vulnerability in PhishGuard itself, please report it responsibly. Do not publish exploit details before a fix is available.

## Test data

The `tests/fixtures/` directory contains **synthetic** email samples for automated testing. These are not real user emails and should not be treated as live threat intelligence.

## Ethical guidelines

1. Use PhishGuard only on mailboxes you own or have explicit permission to test
2. Do not use analysis output to impersonate security authorities
3. When reporting phishing, use your organization's official channels
4. Redact personal information before sharing screenshots in portfolios or demos
