/**
 * Engine 2: Canonical Advertising Metrics Engine
 * 
 * Standardizes raw inputs into canonical advertising metrics across multi-platform networks.
 * Distinguishes provider-reported metrics from internally calculated metrics.
 * Uses FinancialCalculator to guarantee zero-denominator safety and prevent bogus math.
 */

import { FinancialCalculator, MetricCalculationResult } from "../math/financial-calculator";
import { CampaignObjective, DataQualityReport } from "../types/intelligence";

export interface CanonicalMetricsInput {
  adId: string;
  objective: CampaignObjective;
  currency: string;
  impressions: number | null | undefined;
  clicks: number | null | undefined;
  spend: number | null | undefined;
  conversions: number | null | undefined;
  revenue: number | null | undefined;
  reach?: number | null | undefined;
  videoViews?: number | null | undefined;
  landingPageViews?: number | null | undefined;
  // Optional provider-reported values for comparison
  providerReportedCtr?: number | null;
  providerReportedCpc?: number | null;
  providerReportedRoas?: number | null;
  dataQuality: DataQualityReport;
}

export interface CanonicalMetricValue {
  value: number | null;
  isCalculated: boolean;
  status: "VALID" | "ZERO_DENOMINATOR" | "MISSING_INPUT" | "CURRENCY_MISMATCH" | "INVALID_INPUT";
  formula?: string;
  providerReportedValue?: number | null;
}

export interface CanonicalMetricsOutput {
  adId: string;
  objective: CampaignObjective;
  currency: string;
  core: {
    impressions: number;
    clicks: number;
    spend: number;
    reach: number | null;
    videoViews: number | null;
    conversions: number | null;
    revenue: number | null;
  };
  derived: {
    ctr: CanonicalMetricValue;
    cpc: CanonicalMetricValue;
    cpm: CanonicalMetricValue;
    cvr: CanonicalMetricValue;
    cpa: CanonicalMetricValue;
    roas: CanonicalMetricValue;
    objectiveRate: CanonicalMetricValue; // Objective-specific primary efficiency metric
  };
}

export class CanonicalMetricsEngine {
  /**
   * Transforms raw validated inputs into canonical metrics.
   */
  public static calculate(input: CanonicalMetricsInput): CanonicalMetricsOutput {
    const impressions = input.impressions ?? 0;
    const clicks = input.clicks ?? 0;
    const spend = input.spend ?? 0;

    // Derived CTR
    const ctrRes = FinancialCalculator.calculateCTR(input.clicks, input.impressions);
    // Derived CPC
    const cpcRes = FinancialCalculator.calculateCPC(input.spend, input.clicks);
    // Derived CPM
    const cpmRes = FinancialCalculator.calculateCPM(input.spend, input.impressions);
    // Derived CVR
    const cvrRes = FinancialCalculator.calculateCVR(input.conversions, input.clicks);
    // Derived CPA
    const cpaRes = FinancialCalculator.calculateCPA(input.spend, input.conversions);
    // Derived ROAS
    const roasRes = FinancialCalculator.calculateROAS(
      input.revenue,
      input.spend,
      input.currency,
      input.currency
    );

    // Objective-specific primary efficiency rate
    const objectiveRate = this.calculateObjectiveRate(input);

    return {
      adId: input.adId,
      objective: input.objective,
      currency: input.currency,
      core: {
        impressions,
        clicks,
        spend,
        reach: input.reach ?? null,
        videoViews: input.videoViews ?? null,
        conversions: input.conversions ?? null,
        revenue: input.revenue ?? null,
      },
      derived: {
        ctr: {
          value: ctrRes.value,
          isCalculated: true,
          status: ctrRes.status,
          formula: ctrRes.formula,
          providerReportedValue: input.providerReportedCtr,
        },
        cpc: {
          value: cpcRes.value,
          isCalculated: true,
          status: cpcRes.status,
          formula: cpcRes.formula,
          providerReportedValue: input.providerReportedCpc,
        },
        cpm: {
          value: cpmRes.value,
          isCalculated: true,
          status: cpmRes.status,
          formula: cpmRes.formula,
        },
        cvr: {
          value: cvrRes.value,
          isCalculated: true,
          status: cvrRes.status,
          formula: cvrRes.formula,
        },
        cpa: {
          value: cpaRes.value,
          isCalculated: true,
          status: cpaRes.status,
          formula: cpaRes.formula,
        },
        roas: {
          value: roasRes.value,
          isCalculated: true,
          status: roasRes.status,
          formula: roasRes.formula,
          providerReportedValue: input.providerReportedRoas,
        },
        objectiveRate,
      },
    };
  }

  private static calculateObjectiveRate(input: CanonicalMetricsInput): CanonicalMetricValue {
    switch (input.objective) {
      case "VIDEO_VIEWS": {
        if (!input.videoViews || !input.impressions || input.impressions <= 0) {
          return {
            value: null,
            isCalculated: true,
            status: "MISSING_INPUT",
            formula: "(videoViews / impressions) * 100",
          };
        }
        return {
          value: (input.videoViews / input.impressions) * 100,
          isCalculated: true,
          status: "VALID",
          formula: "(videoViews / impressions) * 100",
        };
      }
      case "AWARENESS":
      case "REACH": {
        if (!input.reach || !input.impressions || input.impressions <= 0) {
          return {
            value: null,
            isCalculated: true,
            status: "MISSING_INPUT",
            formula: "impressions / reach (frequency)",
          };
        }
        return {
          value: input.impressions / input.reach,
          isCalculated: true,
          status: "VALID",
          formula: "impressions / reach",
        };
      }
      case "LEAD_GENERATION":
      case "PURCHASES":
      case "APP_CONVERSIONS":
      case "CALLS": {
        const cvr = FinancialCalculator.calculateCVR(input.conversions, input.clicks);
        return {
          value: cvr.value,
          isCalculated: true,
          status: cvr.status,
          formula: cvr.formula,
        };
      }
      case "TRAFFIC":
      default: {
        const ctr = FinancialCalculator.calculateCTR(input.clicks, input.impressions);
        return {
          value: ctr.value,
          isCalculated: true,
          status: ctr.status,
          formula: ctr.formula,
        };
      }
    }
  }
}
