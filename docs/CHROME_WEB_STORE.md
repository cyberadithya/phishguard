# Publishing to the Chrome Web Store

Optional but strong for a resume — you can list "published Chrome extension" with a live link.

## Prerequisites

- Google account
- One-time [Chrome Web Store developer registration](https://chrome.google.com/webstore/devconsole) fee ($5 USD)
- Built `dist/` folder (`npm run build`)
- Store assets (see below)

## Before you submit

1. **Test locally** — load unpacked `dist/` and run through [DEMO.md](../DEMO.md)
2. **Run CI checks locally**

   ```bash
   npm test
   npm run build
   ```

3. **Zip the extension** — zip the contents of `dist/`, not the folder itself:

   ```bash
   cd dist && zip -r ../phishguard-v1.0.0.zip . && cd ..
   ```

## Required store assets

| Asset | Size | Notes |
|-------|------|-------|
| Extension icon | 128×128 PNG | Already in `icons/icon128.png` |
| Screenshots | 1280×800 or 640×400 | Use `docs/screenshots.html` or live Gmail captures |
| Small promo tile | 440×280 | Optional |
| Detailed description | — | Summarize from README threat model + privacy |
| Privacy policy | URL or inline | Point to [SECURITY.md](../SECURITY.md) on GitHub |

## Suggested listing copy

**Short description:** Analyze Gmail messages for phishing with explainable, local scoring.

**Category:** Productivity or Privacy & Security

**Permission justification** (required in review):

- `storage` — cache latest analysis for the popup
- `activeTab` — read the open Gmail message when you click the extension
- `mail.google.com` — inject content script on Gmail only

## Review tips

- Emphasize **local-only analysis** — no external data transmission
- Provide a **test Gmail account** or clear steps to reproduce with a composed draft
- Expect 1–3 business days for first review
- Manifest V3 extensions are required; PhishGuard already uses MV3

## After approval

Add to your README:

```markdown
[Install from Chrome Web Store](https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID)
```

Update your resume bullet to include the published link.
