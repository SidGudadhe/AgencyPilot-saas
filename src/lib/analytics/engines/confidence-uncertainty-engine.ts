/**
 * Engine 9: Confidence and Uncertainty Engine
 * 
 * Provides an objective, transparent, multi-dimensional confidence score.
 * 
 * Dimensions:
 * 1. Data Quality Score (freshness, completeness, consistency)
 * 2. Sample Size Adequacy (ratio of observed sample to maturity threshold)
 * 3. Statistical Certainty (1 - p-value or 1 - margin of error)
 * 4. Baseline Reliability (number of baseline data points, stability)
 * 5. Signal Persistence (consistency of signal across multiple days)
 * 6. Corroboration Score (independent multi-metric or technical corroboration)
 * 
 * Never delegates confidence scoring to arbitrary LLM guesses.
 */

import {
  AdMaturityAssessment,
  AdPerformanceBaseline,
  ConfidenceEvaluation,
  DataQualityReport,
  StatisticalAnomalyReport,
  VerifiedIssue,
} from "../types/intelligence";

export interface ConfidenceEvaluationInput {
  dataQuality: DataQualityReport;
  maturity: AdMaturityAssessment;
  baseline: AdPerformanceBaseline;
  anomalies?: StatisticalAnomalyReport;
  issue?: VerifiedIssue;
  signalDaysCount?: number;
  corroboratingSignalsCount?: number;
}

export class ConfidenceUncertaintyEngine {
  /**
   * Evaluates aggregate confidence across 6 calibrated dimensions.
   */
  public static evaluate(input: ConfidenceEvaluationInput): ConfidenceEvaluation {
    const { dataQuality, maturity, baseline, anomalies, issue, signalDaysCount = 1, corroboratingSignalsCount = 0 } = input;
    const uncertaintyFactors: string[] = [];

    // 1. Data Quality Dimension (0.0 to 1.0)
    let dataQualityScore = dataQuality.completenessScore;
    if (dataQuality.isStale) {
      dataQualityScore *= 0.6;
      uncertaintyFactors.push(`Data is stale by ${Math.round(dataQuality.syncStalenessHours)} hours.`);
    }
    if (!dataQuality.consistencyChecks.passed) {
      dataQualityScore *= 0.7;
      uncertaintyFactors.push("Data failed internal consistency checks.");
    }

    // 2. Sample Size Adequacy Dimension (0.0 to 1.0)
    let sampleSizeAdequacy = maturity.maturityScore;
    if (maturity.conversionLagWindowActive) {
      sampleSizeAdequacy *= 0.75;
      uncertaintyFactors.push("Conversion attribution lag window is currently active.");
    }
    if (maturity.evidenceState === "INSUFFICIENT_DATA") {
      sampleSizeAdequacy = Math.min(0.3, sampleSizeAdequacy);
      uncertaintyFactors.push("Sample size is insufficient for reliable performance inference.");
    }

    // 3. Statistical Certainty Dimension (0.0 to 1.0)
    let statisticalCertainty = 0.5; // Default neutral
    if (issue?.evidence_state === "VERIFIED_TECHNICAL_ISSUE") {
      statisticalCertainty = 0.98; // Direct technical probe
    } else if (anomalies?.ctrAnomaly) {
      statisticalCertainty = Math.max(0.2, 1.0 - anomalies.ctrAnomaly.pValue);
    } else if (anomalies?.cvrAnomaly) {
      statisticalCertainty = Math.max(0.2, 1.0 - anomalies.cvrAnomaly.pValue);
    } else if (baseline.isReliable) {
      statisticalCertainty = 0.75;
    }

    // 4. Baseline Reliability Dimension (0.0 to 1.0)
    let baselineReliability = 0.4;
    if (baseline.isReliable) {
      baselineReliability = Math.min(1.0, 0.6 + (baseline.dataPointsCount / 30) * 0.4);
    } else {
      uncertaintyFactors.push("Historical baseline lacks sufficient historical points (<5 days).");
    }

    // 5. Signal Persistence Dimension (0.0 to 1.0)
    const signalPersistence = Math.min(1.0, 0.4 + (signalDaysCount / 5) * 0.6);
    if (signalDaysCount <= 1 && issue?.evidence_state !== "VERIFIED_TECHNICAL_ISSUE") {
      uncertaintyFactors.push("Signal observed on a single day only; could represent transient volatility.");
    }

    // 6. Corroboration Score Dimension (0.0 to 1.0)
    let corroborationScore = 0.5;
    if (corroboratingSignalsCount >= 2) {
      corroborationScore = 0.95;
    } else if (corroboratingSignalsCount === 1) {
      corroborationScore = 0.75;
    } else {
      corroborationScore = 0.45;
    }

    // If verified technical issue, weight technical directness heavily
    let aggregateConfidence = 0;
    if (issue?.evidence_state === "VERIFIED_TECHNICAL_ISSUE") {
      aggregateConfidence = 0.95 * dataQualityScore + 0.05 * sampleSizeAdequacy;
    } else {
      // Weighted geometric/linear combination for performance evaluation
      aggregateConfidence =
        dataQualityScore * 0.20 +
        sampleSizeAdequacy * 0.25 +
        statisticalCertainty * 0.20 +
        baselineReliability * 0.15 +
        signalPersistence * 0.10 +
        corroborationScore * 0.10;
    }

    aggregateConfidence = Math.max(0.05, Math.min(0.99, aggregateConfidence));

    let tier: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (aggregateConfidence >= 0.80) {
      tier = "HIGH";
    } else if (aggregateConfidence >= 0.55) {
      tier = "MEDIUM";
    }

    return {
      aggregateConfidence,
      tier,
      dimensions: {
        dataQualityScore,
        sampleSizeAdequacy,
        statisticalCertainty,
        baselineReliability,
        signalPersistence,
        corroborationScore,
      },
      uncertaintyFactors,
    };
  }
}
