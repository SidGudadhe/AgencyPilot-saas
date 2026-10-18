/**
 * Engine 5: Statistical Anomaly Detection Engine
 * 
 * Applies rigorous mathematical tests:
 * 1. Two-proportion Wilson / Z-tests for binomial rates (CTR, CVR) with effect size checks.
 * 2. Robust MAD Z-scores for continuous metrics (CPC, CPM).
 * 3. CUSUM change-point detection for sudden shifts in spend or volume.
 * 4. Tracking disruption detector (computes exact binomial probability of seeing 0 conversions given click volume).
 * 5. Practical effect size gates to prevent trivial statistically significant deviations from firing alerts.
 */

import { compareProportions } from "../math/statistical-distributions";
import { detectCUSUMChangePoint, evaluateContinuousMetricAnomaly, TimeSeriesPoint } from "../math/timeseries-anomaly";
import { AdPerformanceBaseline, BinomialTestResult, StatisticalAnomalyReport } from "../types/intelligence";

export interface AnomalyDetectionInput {
  adId: string;
  testDate: string;
  observed: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number | null;
    revenue: number | null;
    cpc?: number | null;
    cpm?: number | null;
  };
  baseline: AdPerformanceBaseline;
  recentTimeSeries?: {
    spendSeries?: TimeSeriesPoint[];
    conversionsSeries?: TimeSeriesPoint[];
  };
  historicalConversionRate?: number; // E.g. 0.03 (3%)
  consecutiveDaysWithZeroConversions?: number;
}

export class StatisticalAnomalyEngine {
  /**
   * Evaluates an ad's performance against its baseline using statistical rigor.
   */
  public static analyze(input: AnomalyDetectionInput): StatisticalAnomalyReport {
    const report: StatisticalAnomalyReport = {
      adId: input.adId,
      testDate: input.testDate,
    };

    if (!input.baseline.isReliable) {
      // If baseline is not reliable, do not run speculative anomaly detection
      return report;
    }

    const { observed, baseline } = input;

    // 1. CTR Binomial Test (clicks / impressions)
    if (baseline.metrics.ctr && observed.impressions >= 100) {
      const baselineTrials = Math.max(100, Math.round(baseline.metrics.ctr.sampleSize * 500));
      const baselineSuccesses = Math.round(baselineTrials * (baseline.metrics.ctr.mean / 100));

      const propRes = compareProportions(
        observed.clicks,
        observed.impressions,
        baselineSuccesses,
        baselineTrials,
        0.01 // 99% confidence threshold
      );

      // Require practical effect size: at least 25% relative difference to trigger alert
      const hasPracticalEffect = Math.abs(propRes.relativeChangeRatio) >= 0.25;

      const ctrAnomaly: BinomialTestResult = {
        observedRate: propRes.observedRate * 100,
        baselineRate: baseline.metrics.ctr.mean,
        confidenceIntervalWilson95: [propRes.confidenceIntervalWilson95[0] * 100, propRes.confidenceIntervalWilson95[1] * 100],
        pValue: propRes.pValue,
        isSignificant: propRes.isSignificant && hasPracticalEffect,
        effectSizeDifference: (propRes.observedRate * 100) - baseline.metrics.ctr.mean,
        relativeChangeRatio: propRes.relativeChangeRatio,
      };

      report.ctrAnomaly = ctrAnomaly;
    }

    // 2. CVR Binomial Test (conversions / clicks)
    if (baseline.metrics.cvr && observed.clicks >= 40 && observed.conversions !== null) {
      const baselineTrials = Math.max(50, Math.round(baseline.metrics.cvr.sampleSize * 50));
      const baselineSuccesses = Math.round(baselineTrials * (baseline.metrics.cvr.mean / 100));

      const propRes = compareProportions(
        observed.conversions,
        observed.clicks,
        baselineSuccesses,
        baselineTrials,
        0.05
      );

      const hasPracticalEffect = Math.abs(propRes.relativeChangeRatio) >= 0.30;

      const cvrAnomaly: BinomialTestResult = {
        observedRate: propRes.observedRate * 100,
        baselineRate: baseline.metrics.cvr.mean,
        confidenceIntervalWilson95: [propRes.confidenceIntervalWilson95[0] * 100, propRes.confidenceIntervalWilson95[1] * 100],
        pValue: propRes.pValue,
        isSignificant: propRes.isSignificant && hasPracticalEffect,
        effectSizeDifference: (propRes.observedRate * 100) - baseline.metrics.cvr.mean,
        relativeChangeRatio: propRes.relativeChangeRatio,
      };

      report.cvrAnomaly = cvrAnomaly;
    }

    // 3. CPC Anomaly Test (Continuous MAD Z-score)
    if (baseline.metrics.cpc && observed.cpc && baseline.metrics.cpc.sampleSize >= 4) {
      const syntheticSample = generateSampleFromSummary(baseline.metrics.cpc.mean, baseline.metrics.cpc.standardDeviation, baseline.metrics.cpc.sampleSize);
      report.cpcAnomaly = evaluateContinuousMetricAnomaly(observed.cpc, syntheticSample, 2.8);
    }

    // 4. CPM Anomaly Test
    if (baseline.metrics.cpm && observed.cpm && baseline.metrics.cpm.sampleSize >= 4) {
      const syntheticSample = generateSampleFromSummary(baseline.metrics.cpm.mean, baseline.metrics.cpm.standardDeviation, baseline.metrics.cpm.sampleSize);
      report.cpmAnomaly = evaluateContinuousMetricAnomaly(observed.cpm, syntheticSample, 2.8);
    }

    // 5. CUSUM Spend Change-Point Detection
    if (input.recentTimeSeries?.spendSeries && input.recentTimeSeries.spendSeries.length >= 7) {
      report.spendChangePoint = detectCUSUMChangePoint(input.recentTimeSeries.spendSeries, "spend");
    }

    // 6. Tracking Disruption Anomaly: Probability of 0 conversions given expected rate
    const historicalRate = input.historicalConversionRate ?? (baseline.metrics.cvr ? baseline.metrics.cvr.mean / 100 : 0.03);
    const consecutiveDaysZero = input.consecutiveDaysWithZeroConversions ?? (observed.conversions === 0 ? 1 : 0);

    if (observed.clicks >= 60 && observed.conversions === 0 && historicalRate > 0.01) {
      // Binomial probability P(K = 0 | n clicks, p) = (1 - p)^n
      const probZero = Math.pow(1 - historicalRate, observed.clicks);
      const isTrackingDrop = probZero < 0.01 && consecutiveDaysZero >= 2;

      report.trackingDropAnomaly = {
        isTrackingDrop,
        consecutiveDaysWithZeroConversions: consecutiveDaysZero,
        expectedConversionsGivenClicks: Math.round(observed.clicks * historicalRate),
        binomialZeroProbability: probZero,
      };
    }

    return report;
  }
}

function generateSampleFromSummary(mean: number, std: number, count: number): number[] {
  const result: number[] = [];
  const safeStd = Math.max(1e-4, std);
  for (let i = 0; i < count; i++) {
    // Deterministic spread around mean for robust MAD computation
    const offset = ((i - count / 2) / (count / 2)) * safeStd * 1.5;
    result.push(Math.max(0, mean + offset));
  }
  return result;
}
