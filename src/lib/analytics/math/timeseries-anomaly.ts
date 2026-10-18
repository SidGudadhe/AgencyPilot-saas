/**
 * Time-Series Anomaly & Change-Point Detection Core
 * 
 * Provides:
 * 1. CUSUM (Cumulative Sum) Change-Point Detection for identifying structural shifts.
 * 2. Robust Z-Scores using Median Absolute Deviation (MAD), resistant to extreme outliers.
 * 3. Rolling window summary statistics (mean, median, std dev, 95% CI).
 */

import { ChangePointDetectionResult, ContinuousAnomalyResult } from "../types/intelligence";

// ============================================================================
// 1. BASIC SUMMARY STATISTICS & ROBUST MEASURES
// ============================================================================

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const avg = mean ?? calculateMean(values);
  const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Median Absolute Deviation (MAD)
 * Highly robust measure of variability: MAD = median(|x_i - median(X)|)
 */
export function calculateMAD(values: number[], median?: number): number {
  if (values.length === 0) return 0;
  const med = median ?? calculateMedian(values);
  const absoluteDeviations = values.map(val => Math.abs(val - med));
  return calculateMedian(absoluteDeviations);
}

/**
 * Calculates robust modified Z-score using MAD.
 * For normal distribution, MAD * 1.4826 ~ standard deviation.
 * Threshold of |modifiedZ| > 3.0 or 3.5 is standard for anomaly detection.
 */
export function calculateRobustZScore(
  observedValue: number,
  historicalValues: number[]
): { zScore: number; modifiedZScoreMAD: number; isAnomaly: boolean } {
  if (historicalValues.length < 3) {
    return { zScore: 0, modifiedZScoreMAD: 0, isAnomaly: false };
  }

  const mean = calculateMean(historicalValues);
  const std = calculateStandardDeviation(historicalValues, mean);
  const zScore = std > 0 ? (observedValue - mean) / std : 0;

  const median = calculateMedian(historicalValues);
  const mad = calculateMAD(historicalValues, median);

  // Scaled MAD to estimate normal std dev: sigma_est = 1.4826 * MAD
  const normalScale = 1.4826 * mad;
  const modifiedZ = normalScale > 0 ? (observedValue - median) / normalScale : (std > 0 ? zScore : 0);

  const isAnomaly = Math.abs(modifiedZ) >= 3.0;

  return {
    zScore,
    modifiedZScoreMAD: modifiedZ,
    isAnomaly,
  };
}

export function evaluateContinuousMetricAnomaly(
  observedValue: number,
  baselineValues: number[],
  thresholdZ: number = 2.5
): ContinuousAnomalyResult {
  const mean = calculateMean(baselineValues);
  const std = calculateStandardDeviation(baselineValues, mean);
  const { zScore, modifiedZScoreMAD } = calculateRobustZScore(observedValue, baselineValues);

  const isAnomaly = Math.abs(modifiedZScoreMAD) >= thresholdZ || (std > 0 && Math.abs(zScore) >= thresholdZ * 1.2);
  const direction = observedValue >= mean ? "INCREASE" : "DECREASE";

  return {
    observedValue,
    baselineMean: mean,
    baselineStdDev: std,
    zScore,
    modifiedZScoreMAD,
    isAnomaly,
    direction,
  };
}

// ============================================================================
// 2. CUSUM CHANGE-POINT DETECTION
// ============================================================================

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * Tabular CUSUM (Cumulative Sum Control Chart) for detecting abrupt parameter changes.
 * 
 * @param series Chronologically ordered time series
 * @param metricName Name of the metric being monitored
 * @param kSlack Parameter k (allowance/slack): typically 0.5 * sigma
 * @param hThreshold Decision interval h: typically 4 * sigma or 5 * sigma
 */
export function detectCUSUMChangePoint(
  series: TimeSeriesPoint[],
  metricName: string,
  kSlackMultiplier: number = 0.5,
  hThresholdMultiplier: number = 4.0
): ChangePointDetectionResult {
  if (series.length < 6) {
    return {
      detected: false,
      cusumMetric: metricName,
      preChangeMean: series.length > 0 ? calculateMean(series.map(s => s.value)) : 0,
      postChangeMean: series.length > 0 ? series[series.length - 1].value : 0,
      magnitude: 0,
      confidence: 0,
    };
  }

  // Use the first 40% of observations (minimum 3) to establish baseline reference
  const baselineCount = Math.max(3, Math.floor(series.length * 0.4));
  const baselineValues = series.slice(0, baselineCount).map(s => s.value);
  const mu0 = calculateMean(baselineValues);
  const sigma0 = Math.max(1e-4, calculateStandardDeviation(baselineValues, mu0));

  const k = kSlackMultiplier * sigma0;
  const h = hThresholdMultiplier * sigma0;

  let sHigh = 0;
  let sLow = 0;
  let changeIndex = -1;

  for (let i = baselineCount; i < series.length; i++) {
    const val = series[i].value;
    sHigh = Math.max(0, sHigh + (val - mu0 - k));
    sLow = Math.max(0, sLow - (val - mu0 + k));

    if (sHigh > h || sLow > h) {
      changeIndex = i;
      break;
    }
  }

  if (changeIndex === -1) {
    const allValues = series.map(s => s.value);
    const overallMean = calculateMean(allValues);
    return {
      detected: false,
      cusumMetric: metricName,
      preChangeMean: overallMean,
      postChangeMean: series[series.length - 1].value,
      magnitude: 0,
      confidence: 0,
    };
  }

  const preValues = series.slice(0, changeIndex).map(s => s.value);
  const postValues = series.slice(changeIndex).map(s => s.value);

  const preMean = calculateMean(preValues);
  const postMean = calculateMean(postValues);
  const magnitude = postMean - preMean;
  const relativeChange = preMean > 0 ? Math.abs(magnitude) / preMean : 1;

  // Confidence based on how far past threshold
  const confidence = Math.min(1.0, 0.7 + Math.min(0.3, relativeChange * 0.3));

  return {
    detected: true,
    changePointDate: series[changeIndex].date,
    cusumMetric: metricName,
    preChangeMean: preMean,
    postChangeMean: postMean,
    magnitude,
    confidence,
  };
}
