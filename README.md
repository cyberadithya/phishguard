# PhishGuard

[![CI](https://github.com/cyberadithya/phishguard/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberadithya/phishguard/actions/workflows/ci.yml)

**PhishGuard** is a Chrome extension that analyzes open Gmail messages for phishing indicators using a local, explainable rule engine. All analysis runs in your browser — no email content is sent to external servers.

> **Resume one-liner:** Built a Chrome extension that analyzes Gmail messages locally using 12+ heuristic rules and URL checks, scoring phishing risk with explainable factors (100% precision/recall on a 40-email labeled corpus with false-positive stress tests).

## Threat model

| Aspect | Detail |
|--------|--------|
| **Threat** | Phishing emails that trick users into clicking malicious links, revealing credentials, or replying to impersonated senders |
| **User** | College students and general Gmail users reviewing suspicious messages |
| **Trust boundary** | Email content is read from the Gmail DOM only when the user has the message open |
| **Out of scope** | Attachment malware analysis, server-side ML, non-Gmail clients (Outlook support planned) |

Full STRIDE threat model for the extension: [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Features

- **12 heuristic detection rules** — sender mismatch, reply-to divergence, link deception, punycode domains, suspicious TLDs, urgency language, and more
- **Explainable risk score (0–100)** with per-finding evidence
- **Actionable guidance** — what to do when a message looks suspicious
- **Privacy-first** — 100% local analysis, no external API calls in the MVP
- **Badge indicator** — risk score shown on the extension icon while viewing Gmail
- **In-page warning banner** — high-risk alerts displayed directly in Gmail
- **IT export report** — copy Markdown or download JSON for security teams
- **Configurable settings** — adjustable threshold, per-rule toggles, banner on/off

## Screenshots

| Low risk (benign email) | Critical risk (phishing indicators) |
|-------------------------|---------------------------------------|
| ![Low risk analysis](docs/images/popup-low-risk.svg) | ![High risk analysis](docs/images/popup-high-risk.svg) |

To capture live PNG screenshots from the actual popup UI, open [`docs/screenshots.html`](docs/screenshots.html) in Chrome.

## Architecture

```mermaid
flowchart LR
  subgraph browser [Chrome Extension]
    Gmail[Gmail DOM]
    ContentScript[Content Script]
    Scorer[Rule Engine]
    Popup[Popup UI]
    Storage[chrome.storage.local]
  end
  Gmail --> ContentScript
  ContentScript --> Scorer
  Scorer --> Storage
  Scorer --> Popup
  ContentScript --> Popup
```

### Detection rules

1. Sender mismatch (display name vs. From address)
2. Reply-To divergence
3. Link deception (display URL ≠ href)
4. Punycode / homograph domains
5. Suspicious TLDs (.xyz, .tk, .click, etc.)
6. Urgency and credential language
7. Credential-harvesting link paths
8. Sender/link domain mismatch
9. Raw IP address links

## Getting started

### Prerequisites

- Node.js 18+
- Google Chrome

### Install and build

```bash
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Open [Gmail](https://mail.google.com) and click an email
6. Click the PhishGuard extension icon to view the analysis

### Run tests

```bash
npm test
npm run evaluate   # print precision/recall on the test corpus
```

The test suite includes 20 phishing and 20 benign samples in `tests/fixtures/`, including hard benign cases (Amazon payment updates, marketing urgency, university IT notices) to stress-test false positives.

See [DEMO.md](DEMO.md) for a 2-minute portfolio demo script.

For Chrome Web Store publishing steps, see [docs/CHROME_WEB_STORE.md](docs/CHROME_WEB_STORE.md).

## Evaluation results

On the included labeled test corpus (threshold: score ≥ 50 = phishing):

| Metric | Value |
|--------|-------|
| Samples | 40 (20 phishing, 20 benign) |
| Precision | 100% |
| Recall | 100% |
| F1 | 100% |
| Accuracy | 100% |

**Confusion matrix**

|  | Predicted phishing | Predicted benign |
|--|-------------------|------------------|
| Actual phishing | 20 TP | 0 FN |
| Actual benign | 0 FP | 20 TN |

See [docs/EVALUATION.md](docs/EVALUATION.md) for scoring methodology, rule weights, and limitations.

*Synthetic samples are designed for rule validation and regression testing, not real-world production accuracy.*

## Project structure

```
src/
  analysis/       # Rule engine, link parser, scorer, guidance
  content/        # Gmail DOM extraction (content script)
  background/     # Service worker (badge updates)
  popup/          # Extension popup UI
  shared/         # Types and messaging
tests/
  fixtures/       # Labeled phishing and benign email samples
```

## Limitations

- **Gmail only** — DOM selectors may break if Google updates the Gmail UI
- **Heuristic-based** — no machine learning; sophisticated spear-phishing may evade rules
- **False positives** — marketing emails with urgency language may score medium risk
- **English-focused** — keyword rules target English phishing templates
- **No attachment scanning** — malicious PDFs/ZIPs are not analyzed
- **No threat intel APIs** — VirusTotal / Safe Browsing integration is a planned enhancement

## Ethical use

- Analyze only **your own email** or **synthetic test samples**
- Do not store or transmit other users' email content
- Use findings to educate and protect — not to harass senders
- Report real phishing to your IT team or [PhishTank](https://phishtank.org/)

See [SECURITY.md](SECURITY.md) for privacy details.

## Settings

Open **Extension options** (right-click the PhishGuard icon → Options) or use the **Settings** link in the popup to:

- Adjust the phishing alert threshold (25–75)
- Toggle the in-page Gmail warning banner
- Enable or disable individual detection rules

## Roadmap

- [ ] Outlook Web App support
- [ ] Optional VirusTotal / Google Safe Browsing URL checks
- [x] User-configurable sensitivity threshold
- [x] Export analysis report for IT submission

## License

MIT
