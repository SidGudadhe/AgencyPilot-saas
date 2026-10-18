import {
  calculateWilsonScoreInterval,
  compareProportions,
  estimateBetaBinomial,
  applyBenjaminiHochbergCorrection,
  erf,
  standardNormalCdf,
} from "../src/lib/analytics/math/statistical-distributions";
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculateMAD,
  calculateRobustZScore,
  detectCUSUMChangePoint,
} from "../src/lib/analytics/math/timeseries-anomaly";
import { FinancialCalculator } from "../src/lib/analytics/math/financial-calculator";

describe("Mathematical & Statistical Core Tests", () => {
  describe("Normal Distribution & CDF", () => {
    test("standardNormalCdf returns 0.5 at z=0", () => {
      expect(standardNormalCdf(0)).toBeCloseTo(0.5, 4);
    });

    test("standardNormalCdf returns ~0.8413 at z=1.0", () => {
      expect(standardNormalCdf(1.0)).toBeCloseTo(0.8413, 3);
    });

    test("standardNormalCdf returns ~0.9772 at z=2.0", () => {
      expect(standardNormalCdf(2.0)).toBeCloseTo(0.9772, 3);
    });
  });

  describe("Wilson Score Interval", () => {
    test("calculates correct confidence interval for standard click rate", () => {
      // 50 clicks out of 1000 impressions (5% CTR)
      const res = calculateWilsonScoreInterval(50, 1000, 0.95, true);
      expect(res.observedRate).toBeCloseTo(0.05, 4);
      expect(res.lowerBound).toBeGreaterThan(0.035);
      expect(res.upperBound).toBeLessThan(0.068);
      expect(res.lowerBound).toBeLessThan(res.observedRate);
      expect(res.upperBound).toBeGreaterThan(res.observedRate);
    });

    test("handles extreme boundary case of 0 successes", () => {
      const res = calculateWilsonScoreInterval(0, 100, 0.95, true);
      expect(res.observedRate).toBe(0);
      expect(res.lowerBound).toBe(0);
      expect(res.upperBound).toBeGreaterThan(0);
      expect(res.upperBound).toBeLessThan(0.06);
    });

    test("handles zero trials safely without throwing or NaN", () => {
      const res = calculateWilsonScoreInterval(0, 0);
      expect(res.observedRate).toBe(0);
      expect(res.lowerBound).toBe(0);
      expect(res.upperBound).toBe(0);
    });
  });

  describe("Two-Proportion Comparison", () => {
    test("detects statistically significant CTR collapse", () => {
      // Baseline: 400 clicks / 10,000 impressions = 4.0% CTR
      // Observed: 15 clicks / 1,000 impressions = 1.5% CTR
      const res = compareProportions(15, 1000, 400, 10000);
      expect(res.observedRate).toBeCloseTo(0.015, 3);
      expect(res.baselineRate).toBeCloseTo(0.040, 3);
      expect(res.relativeChangeRatio).toBeLessThan(-0.6);
      expect(res.isSignificant).toBe(true);
      expect(res.pValue).toBeLessThan(0.001);
    });

    test("returns not significant for normal sampling variance", () => {
      // Baseline: 200 clicks / 10,000 impressions = 2.0%
      // Observed: 19 clicks / 1,000 impressions = 1.9%
      const res = compareProportions(19, 1000, 200, 10000);
      expect(res.isSignificant).toBe(false);
      expect(res.pValue).toBeGreaterThan(0.05);
    });
  });

  describe("Bayesian Beta-Binomial Estimation", () => {
    test("shrinks sparse 0-conversion sample toward prior instead of assuming 0.00%", () => {
      // 0 conversions on 25 clicks with prior Beta(1, 20)
      const res = estimateBetaBinomial(0, 25, 1.0, 20.0);
      expect(res.posteriorAlpha).toBe(1);
      expect(res.posteriorBeta).toBe(45);
      // Posterior mean = 1 / 46 ~ 2.17% (not 0.00%!)
      expect(res.posteriorMean).toBeCloseTo(0.0217, 3);
      expect(res.shrinkageWeight).toBeGreaterThan(0.4);
    });

    test("converges toward observed rate as sample size grows", () => {
      // 50 conversions on 1000 clicks (5%)
      const res = estimateBetaBinomial(50, 1000, 1.0, 20.0);
      expect(res.posteriorMean).toBeCloseTo(0.05, 2);
      expect(res.shrinkageWeight).toBeLessThan(0.05);
    });
  });

  describe("Benjamini-Hochberg FDR Multi-Testing Correction", () => {
    test("adjusts raw p-values and controls false discoveries", () => {
      const tests = [
        { id: "ad-1", pValue: 0.001 },
        { id: "ad-2", pValue: 0.008 },
        { id: "ad-3", pValue: 0.039 },
        { id: "ad-4", pValue: 0.048 },
        { id: "ad-5", pValue: 0.250 },
      ];

      const results = applyBenjaminiHochbergCorrection(tests, 0.05);
      expect(results.length).toBe(5);
      // ad-1 with p=0.001 should remain significant
      const ad1 = results.find(r => r.id === "ad-1")!;
      expect(ad1.isSignificant).toBe(true);

      // ad-5 with p=0.25 should be non-significant
      const ad5 = results.find(r => r.id === "ad-5")!;
      expect(ad5.isSignificant).toBe(false);
    });
  });

  describe("MAD Robust Z-Score & Outlier Protection", () => {
    test("computes MAD accurately", () => {
      const data = [10, 12, 11, 13, 12, 100]; // 100 is extreme outlier
      const median = calculateMedian(data);
      expect(median).toBe(12);
      const mad = calculateMAD(data, median);
      expect(mad).toBe(1); // Deviations: [2, 0, 1, 1, 0, 88] -> sorted: [0, 0, 1, 1, 2, 88] -> median: 1
    });

    test("flags 100 as anomaly using robust MAD Z-score", () => {
      const data = [10, 12, 11, 13, 12, 11, 12, 10];
      const res = calculateRobustZScore(100, data);
      expect(res.isAnomaly).toBe(true);
      expect(res.modifiedZScoreMAD).toBeGreaterThan(10);
    });
  });

  describe("CUSUM Change-Point Detection", () => {
    test("identifies abrupt structural shift in spend series", () => {
      const series = [
        { date: "2026-10-01", value: 1000 },
        { date: "2026-10-02", value: 1050 },
        { date: "2026-10-03", value: 980 },
        { date: "2026-10-04", value: 1020 },
        // Abrupt jump
        { date: "2026-10-05", value: 4500 },
        { date: "2026-10-06", value: 4800 },
        { date: "2026-10-07", value: 5000 },
      ];

      const res = detectCUSUMChangePoint(series, "spend");
      expect(res.detected).toBe(true);
      expect(res.changePointDate).toBe("2026-10-05");
      expect(res.magnitude).toBeGreaterThan(3000);
    });

    test("does not fire on steady stationary series", () => {
      const series = [
        { date: "2026-10-01", value: 1000 },
        { date: "2026-10-02", value: 1020 },
        { date: "2026-10-03", value: 990 },
        { date: "2026-10-04", value: 1010 },
        { date: "2026-10-05", value: 995 },
        { date: "2026-10-06", value: 1005 },
        { date: "2026-10-07", value: 1000 },
      ];

      const res = detectCUSUMChangePoint(series, "spend");
      expect(res.detected).toBe(false);
    });
  });

  describe("Financial Calculator Protection Rules", () => {
    test("never returns NaN or Infinity on zero clicks/impressions", () => {
      const ctr = FinancialCalculator.calculateCTR(0, 0);
      expect(ctr.value).toBe(0);
      expect(ctr.status).toBe("ZERO_DENOMINATOR");

      const cpc = FinancialCalculator.calculateCPC(500, 0);
      expect(cpc.value).toBeNull();
      expect(cpc.status).toBe("ZERO_DENOMINATOR");

      const cpm = FinancialCalculator.calculateCPM(500, 0);
      expect(cpm.value).toBeNull();
      expect(cpm.status).toBe("ZERO_DENOMINATOR");
    });

    test("never fabricates 0 ROAS when revenue is missing/null", () => {
      const roas = FinancialCalculator.calculateROAS(null, 5000);
      expect(roas.value).toBeNull();
      expect(roas.status).toBe("MISSING_INPUT");
    });

    test("blocks ROAS calculation when currencies do not match", () => {
      const roas = FinancialCalculator.calculateROAS(10000, 5000, "INR", "USD");
      expect(roas.value).toBeNull();
      expect(roas.status).toBe("CURRENCY_MISMATCH");
    });

    test("computes accurate ROAS when inputs are valid and currencies match", () => {
      const roas = FinancialCalculator.calculateROAS(15000, 5000, "INR", "INR");
      expect(roas.value).toBe(3.0);
      expect(roas.status).toBe("VALID");
    });
  });
});
