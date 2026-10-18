/**
 * Engine 4: Objective-Specific Performance Baseline Engine
 * 
 * Establishes rigorous rolling baselines for each campaign objective.
 * Prioritizes:
 * 1. Explicit business targets (Target CPA, Target ROAS).
 * 2. Ad-group/Campaign-specific rolling historical baselines.
 * 3. Account-wide baselines.
 * 
 * If sample size < 5 or data points are insufficient, flags baseline as NOT reliable,
 * preventing unsupported performance judgments.
 */

import { calculateMean, calculateMedian, calculateStandardDeviation } from "../math/timeseries-anomaly";
import { AdPerformanceBaseline, CampaignObjective, MetricBaselineValue } from "../types/intelligence";

export interface HistoricalDataPoint {
  date: string;
  ctr?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  cvr?: number | null;
  cpa?: number | null;
  roas?: number | null;
}

export interface BaselineGenerationInput {
  id: string;
  workspaceId: string;
  scope: "AD" | "AD_GROUP" | "CAMPAIGN" | "ACCOUNT" | "BUSINESS_TARGET";
  objective: CampaignObjective;
  currency: string;
  startDate: string;
  endDate: string;
  history: HistoricalDataPoint[];
  configuredTargetCpa?: number;
  configuredTargetRoas?: number;
}

export class PerformanceBaselineEngine {
  /**
   * Generates a statistically grounded baseline from historical performance series.
   */
  public static generateBaseline(input: BaselineGenerationInput): AdPerformanceBaseline {
    const validHistory = input.history.filter(h => Boolean(h));
    const sampleSize = validHistory.length;
    // A baseline requires at least 5 clean days of historical data to be statistically stable
    const isReliable = sampleSize >= 5 || Boolean(input.configuredTargetCpa || input.configuredTargetRoas);

    const ctrBaseline = this.buildMetricBaseline(validHistory.map(h => h.ctr).filter((v): v is number => typeof v === "number" && !isNaN(v)));
    const cpcBaseline = this.buildMetricBaseline(validHistory.map(h => h.cpc).filter((v): v is number => typeof v === "number" && !isNaN(v)));
    const cpmBaseline = this.buildMetricBaseline(validHistory.map(h => h.cpm).filter((v): v is number => typeof v === "number" && !isNaN(v)));
    const cvrBaseline = this.buildMetricBaseline(validHistory.map(h => h.cvr).filter((v): v is number => typeof v === "number" && !isNaN(v)));
    const cpaBaseline = this.buildMetricBaseline(validHistory.map(h => h.cpa).filter((v): v is number => typeof v === "number" && !isNaN(v)));
    const roasBaseline = this.buildMetricBaseline(validHistory.map(h => h.roas).filter((v): v is number => typeof v === "number" && !isNaN(v)));

    return {
      id: input.id,
      workspaceId: input.workspaceId,
      scope: input.scope,
      objective: input.objective,
      currency: input.currency,
      isReliable,
      dataPointsCount: sampleSize,
      startDate: input.startDate,
      endDate: input.endDate,
      metrics: {
        ctr: ctrBaseline,
        cpc: cpcBaseline,
        cpm: cpmBaseline,
        cvr: cvrBaseline,
        cpa: cpaBaseline,
        roas: roasBaseline,
        targetCpa: input.configuredTargetCpa,
        targetRoas: input.configuredTargetRoas,
      },
    };
  }

  private static buildMetricBaseline(values: number[]): MetricBaselineValue | undefined {
    if (values.length < 3) return undefined;

    const mean = calculateMean(values);
    const median = calculateMedian(values);
    const std = calculateStandardDeviation(values, mean);
    const n = values.length;

    // 95% Confidence Interval for the mean: mean +/- 1.96 * (std / sqrt(n))
    const se = n > 0 ? std / Math.sqrt(n) : 0;
    const margin = 1.96 * se;

    return {
      mean,
      median,
      standardDeviation: std,
      sampleSize: n,
      periodDays: n,
      confidenceInterval95: [Math.max(0, mean - margin), mean + margin],
    };
  }
}
