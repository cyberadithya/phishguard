# PhishGuard Demo Guide

Use this guide for portfolio demos, interviews, or class presentations.

## Setup (2 minutes)

```bash
git clone https://github.com/cyberadithya/phishguard.git
cd phishguard
npm install
npm run build
```

Load `dist/` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Live demo script (2 minutes)

### 1. Show a clean email (low risk)

1. Open Gmail and select a normal email (newsletter, GitHub notification, personal message)
2. Click the PhishGuard icon
3. Point out:
   - Low risk score
   - Empty or minimal findings list
   - Privacy note in the footer

### 2. Paste a phishing sample into Gmail

Create a draft or use a test Gmail account with a composed message containing:

- **From display name:** PayPal Security
- **Body:** "URGENT: Verify your account within 24 hours. Click here: https://www.paypal.com/verify"
- **Link href (HTML):** `https://paypa1-secure.com/login` (use Gmail's link insert with mismatched URL)

Click PhishGuard and highlight:

- Risk score ≥ 50 (high/critical)
- **Sender Mismatch** finding
- **Link Deception** finding
- **Urgency Language** finding
- Actionable **What to do** guidance

### 3. Show the in-page banner (optional)

If the phishing sample scores above your threshold, PhishGuard shows a warning banner at the top of Gmail with the risk level and top findings. Mention that users can dismiss it per email or tune sensitivity in Settings.

### 4. Export a report (optional)

In the popup, click **Copy Markdown** or **Download JSON** to show how a user could share a local report with campus IT.

### 5. Explain the architecture (30 seconds)

> "The content script reads the open Gmail message from the DOM. A local rule engine scores 12+ heuristics — sender spoofing, deceptive links, punycode domains, urgency language. Nothing leaves the browser. Users can tune the threshold and toggle rules in Settings."

### 6. Show automated tests (optional)

```bash
npm test
npm run evaluate
```

Mention the labeled test corpus in `tests/fixtures/`.

## Talking points for interviews

- **Threat model:** User-facing phishing in Gmail; local analysis preserves privacy
- **Tradeoffs:** Heuristics are explainable but can false-positive on marketing email
- **Next steps:** VirusTotal API integration, Outlook support
- **Phase 3 features:** In-page banner, IT export reports, configurable settings
- **Ethics:** Synthetic test data only; report real phishing through official channels

## Resume bullet

> Built PhishGuard, a Chrome extension that analyzes Gmail messages locally using 12+ heuristic rules and URL checks, scoring phishing risk with explainable factors (100% precision/recall on a 40-email labeled corpus with false-positive stress tests).

Run `npm run evaluate` to verify metrics before updating your resume.
