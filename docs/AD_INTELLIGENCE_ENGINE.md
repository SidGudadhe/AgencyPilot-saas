# AgencyPilot Ad Intelligence Engine Documentation

A deterministic, evidence-based advertising analytics system designed for multi-platform advertising networks (Meta, Google Ads, LinkedIn, Twitter, Snapchat, TikTok, JioAds, Disney+ Hotstar, InMobi).

---

## 1. Modular 10-Engine Architecture

Calculation, detection, and decision logic are strictly decoupled from the LLM explanation layer:

```
[Raw Platform Ingestion (Meta / Google / Indian Networks)]
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 1: Provider Data Validation Engine             │ ➔ Enforces VALID/ZERO/UNAVAILABLE/DELAYED/INVALID
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 2: Canonical Advertising Metrics Engine        │ ➔ Protected math, objective-specific rates
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 3: Ad Maturity & Evidence Assessment Engine    │ ➔ INSUFFICIENT_DATA vs COLLECTING vs SUFFICIENT
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 4: Objective-Specific Performance Baseline     │ ➔ Rolling mean, median, robust std dev, 95% CI
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 5: Statistical Anomaly Detection Engine        │ ➔ Wilson score, MAD Z-score, CUSUM, FDR
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 6: Verified Issue Detection Engine             │ ➔ VERIFIED_TECHNICAL vs EVIDENCE_BACKED_PERF
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 7: Probable Cause Analysis Engine              │ ➔ Primary & competing hypotheses, confounders
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 8: Recommendation Engine                       │ ➔ Defensible savings, evaluation plans, revert rules
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 9: Confidence & Uncertainty Engine             │ ➔ 6-dimension calibrated scoring
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Engine 10: Historical Evaluation & Backtesting        │ ➔ Ground-truth benchmark, precision & recall
└────────────────────────────────────────────────────────┘
```

---

## 2. Statistical & Mathematical Foundations

### A. Wilson Score Interval with Continuity Correction
Used for binomial metrics (CTR and CVR) to prevent small sample distortions:
$$\tilde{p} = \frac{2np + z^2 \pm z\sqrt{z^2 - (2 + 1/n) + 4p(n(1-p) + 1)}}{2(n + z^2)}$$

### B. Bayesian Beta-Binomial Updating for Sparse Conversions
When conversions are low ($0$ or $1$ on small click volume), maximum likelihood produces extreme 0.00% estimates. The conjugate Beta prior $\text{Beta}(\alpha=1, \beta=20)$ shrinks sparse observations toward a baseline mean:
$$\alpha_{\text{post}} = \alpha_{\text{prior}} + k, \quad \beta_{\text{post}} = \beta_{\text{prior}} + (n - k)$$
$$\mathbb{E}[\text{CVR}] = \frac{\alpha_{\text{post}}}{\alpha_{\text{post}} + \beta_{\text{post}}}$$

### C. Robust MAD (Median Absolute Deviation) Z-Score
Protects continuous cost metrics (CPC, CPM) against outlier distortion:
$$\text{MAD} = \text{median}(|x_i - \text{median}(X)|)$$
$$Z_{\text{MAD}} = \frac{x_i - \text{median}(X)}{1.4826 \times \text{MAD}}$$

### D. Tabular CUSUM Change-Point Detection
Detects structural shifts in spend and volume:
$$S_H(t) = \max(0, S_H(t-1) + x_t - \mu_0 - k)$$
$$S_L(t) = \max(0, S_L(t-1) - x_t + \mu_0 - k)$$

### E. Benjamini-Hochberg False Discovery Rate (FDR) Control
Ensures multiple hypothesis testing across hundreds of active ads does not inflate false alarms:
$$p_{(i)} \le \frac{i}{m} Q$$

---

## 3. Financial Protection Guarantees

1. **Zero Denominator Protection**: Never produces `NaN`, `Infinity`, or crashes on zero impressions or zero clicks.
2. **Missing Input Preservation**: Never fabricates `0` revenue or conversions without explicit evidence. Missing values remain `UNAVAILABLE` or `DELAYED`.
3. **Currency Guard**: Financial ratios (ROAS, ROI) reject calculations when spend currency differs from revenue currency.
4. **Calculated vs Reported Distinguishability**: Flags whether metrics originated directly from the ad provider API or were derived internally.

---

## 4. Backtest Evaluation Results

Tested against 12 diverse ground-truth scenarios including new ads, tracking failures, landing page 404s, severe CPA breaches, and stable mature ads:

| Metric | Result | Benchmark Target | Status |
| :--- | :--- | :--- | :--- |
| **New Ad False Alarm Rate** | **0.00%** | 0.00% | PASS |
| **Financial Math Error Rate** | **0.00%** | 0.00% | PASS |
| **Precision** | **100.0%** | $\ge 85.0\%$ | PASS |
| **Recall** | **83.3%** | $\ge 80.0\%$ | PASS |
| **False Positive Rate** | **0.00%** | $\le 10.0\%$ | PASS |
| **F1 Score** | **90.9%** | $\ge 85.0\%$ | PASS |
| **Brier Calibration Score** | **0.0747** | $\le 0.150$ | PASS |
