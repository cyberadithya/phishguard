# Evaluation Methodology

PhishGuard is evaluated against a **labeled synthetic corpus** in `tests/fixtures/`. The corpus is designed to validate rule behavior and measure false-positive risk on realistic transactional email — not to claim production-grade detection accuracy.

Run the report:

```bash
npm run evaluate
```

## Corpus composition

| Split | Count | Purpose |
|-------|-------|---------|
| Phishing samples | 20 | Brand spoofing, BEC, link deception, punycode, suspicious TLDs, credential paths |
| Benign samples | 20 | Legitimate services **plus** hard cases that stress-test false positives |
| **Total** | **40** | Balanced binary classification set |

### Hard benign cases (false-positive stress tests)

The second half of benign samples (`benign-011` – `benign-020`) include email types that often trigger naive phishing detectors:

- Amazon / Netflix / Stripe payment-update notices (official domains)
- PayPal and DocuSign transactional mail
- Microsoft password-expiry reminders
- Retail marketing with "act now" and "click here" language
- University IT password-reset notices from `.edu` domains

A precision drop on these samples would indicate the rule engine is too aggressive for real-world Gmail use.

## Scoring model

### Rule weights

Each triggered rule adds a **weight** to the total score. Weights reflect relative severity (e.g., sender brand spoofing and link deception score higher than generic urgency language). The raw sum is capped at **100**.

| Risk level | Score range |
|------------|-------------|
| Low | 0–24 |
| Medium | 25–49 |
| High | 50–74 |
| Critical | 75–100 |

### Classification threshold

A message is classified as **phishing** when:

```
score >= 50
```

The threshold is defined in `PHISHING_THRESHOLD` in `src/analysis/scorer.ts`. Scores in the 25–49 range are surfaced as **medium risk** in the UI but are not counted as phishing in corpus metrics.

### Why additive scoring?

- **Explainable:** Each finding maps to a visible line item in the popup.
- **Tunable:** Weights can be adjusted per rule without retraining a model.
- **Composable:** Multiple weak signals can combine to cross the threshold — mirroring how analysts triage suspicious mail.

Tradeoff: a single high-weight false positive can push a benign email into the phishing bucket. The hard benign corpus exists to catch that.

## Metrics

| Metric | Definition |
|--------|------------|
| **Precision** | TP / (TP + FP) — of flagged messages, how many are actually phishing |
| **Recall** | TP / (TP + FN) — of phishing messages, how many were flagged |
| **F1** | Harmonic mean of precision and recall |
| **Accuracy** | (TP + TN) / total |

### Confusion matrix

|  | Predicted phishing | Predicted benign |
|--|------------------|------------------|
| **Actual phishing** | True positive (TP) | False negative (FN) |
| **Actual benign** | False positive (FP) | True negative (TN) |

## Current results (40-sample corpus)

| Metric | Value |
|--------|-------|
| Threshold | score ≥ 50 |
| Precision | 100% |
| Recall | 100% |
| F1 | 100% |
| Accuracy | 100% |
| False positives | 0 |
| False negatives | 0 |

Reproduce locally with `npm run evaluate`.

## Limitations

1. **Synthetic data** — samples are hand-authored to exercise specific rules. Real-world phishing evolves faster than any static corpus.
2. **No header analysis** — SPF/DKIM/DMARC results are not parsed in the MVP; analysis is body/sender/link heuristics from the Gmail DOM.
3. **English-only keywords** — urgency rules target English templates.
4. **Gmail DOM dependency** — extraction can break if Google changes the UI.
5. **100% on this corpus ≠ 100% in production** — treat metrics as regression tests for the rule engine, not a field trial.

## Regression testing

- `tests/rules.test.ts` — one unit test per detection rule
- `tests/scorer.test.ts` — end-to-end scoring and corpus gates
- `tests/evaluate-corpus.test.ts` — printable metrics report

CI runs the full suite on every push to `main`.

## Future evaluation work

- [ ] Tag samples by difficulty (`obvious` / `subtle`) and report recall per tier
- [ ] Add intentionally missed "subtle spear-phishing" samples with documented FN acceptance
- [ ] Import a small set of public phishing templates (e.g., PhishTank snapshots) with redacted fields
- [ ] Track score distribution per benign category (marketing vs. transactional vs. personal)
