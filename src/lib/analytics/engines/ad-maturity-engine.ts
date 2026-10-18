/**
 * Engine 3: Ad Maturity and Evidence Assessment Engine
 * 
 * Determines whether an ad has accumulated enough statistical evidence to support performance conclusions.
 * 
 * Evidence States:
 * - INSUFFICIENT_DATA: Newly launched or minimal spend; no performance judgments allowed.
 * - COLLECTING_EVIDENCE: Early delivery in progress; learning phase active.
 * - SUFFICIENT_EVIDENCE: Robust sample size achieved; performance can be evaluated against baselines.
 * - VERIFIED_ISSUE: Direct technical failure confirmed (e.g. 404, rejection) overriding sample size requirements.
 */

import { AdMaturityAssessment, CampaignObjective, EvidenceState } from "../types/intelligence";

export interface ObjectiveMaturityThreshold {
  minActiveDays: number;
  minSpendINR: number;
  minImpressions: number;
  minClicks: number;
  minConversions?: number;
  lagWindowHours: number;
}

export const OBJECTIVE_MATURITY_THRESHOLDS: Record<CampaignObjective, ObjectiveMaturityThreshold> = {
  AWARENESS: {
    minActiveDays: 2,
    minSpendINR: 500,
    minImpressions: 5000,
    minClicks: 10,
    lagWindowHours: 0,
  },
  REACH: {
    minActiveDays: 2,
    minSpendINR: 500,
    minImpressions: 5000,
    minClicks: 10,
    lagWindowHours: 0,
  },
  VIDEO_VIEWS: {
    minActiveDays: 2,
    minSpendINR: 800,
    minImpressions: 3000,
    minClicks: 20,
    lagWindowHours: 0,
  },
  TRAFFIC: {
    minActiveDays: 3,
    minSpendINR: 1000,
    minImpressions: 2000,
    minClicks: 100,
    lagWindowHours: 12,
  },
  LEAD_GENERATION: {
    minActiveDays: 4,
    minSpendINR: 2000,
    minImpressions: 2500,
    minClicks: 50,
    minConversions: 5,
    lagWindowHours: 24,
  },
  PURCHASES: {
    minActiveDays: 5,
    minSpendINR: 3000,
    minImpressions: 3000,
    minClicks: 80,
    minConversions: 5,
    lagWindowHours: 48,
  },
  APP_CONVERSIONS: {
    minActiveDays: 4,
    minSpendINR: 2500,
    minImpressions: 3000,
    minClicks: 60,
    minConversions: 5,
    lagWindowHours: 24,
  },
  CALLS: {
    minActiveDays: 3,
    minSpendINR: 1200,
    minImpressions: 1500,
    minClicks: 30,
    minConversions: 3,
    lagWindowHours: 6,
  },
};

export interface MaturityAssessmentInput {
  adId: string;
  objective: CampaignObjective;
  activeDeliveryDays: number;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number | null;
  hoursSinceDeliveryStart?: number;
  hasTechnicalException?: boolean;
  technicalExceptionReason?: string;
  customThresholds?: Partial<ObjectiveMaturityThreshold>;
}

export class AdMaturityEngine {
  /**
   * Evaluates ad maturity and evidence sufficiency.
   */
  public static evaluate(input: MaturityAssessmentInput): AdMaturityAssessment {
    // Check for technical exception first (landing page broken, policy rejection, etc.)
    if (input.hasTechnicalException) {
      return {
        adId: input.adId,
        objective: input.objective,
        evidenceState: "VERIFIED_ISSUE",
        activeDeliveryDays: input.activeDeliveryDays,
        totalImpressions: input.totalImpressions,
        totalClicks: input.totalClicks,
        totalSpend: input.totalSpend,
        totalConversions: input.totalConversions,
        maturityScore: 1.0,
        sampleAdequacy: {
          impressionsAdequate: true,
          clicksAdequate: true,
          spendAdequate: true,
          conversionsAdequate: true,
        },
        hasTechnicalException: true,
        technicalExceptionReason: input.technicalExceptionReason || "Direct technical disruption verified.",
        conversionLagWindowActive: false,
        reasoning: `Immediate verified issue overrides performance maturity: ${input.technicalExceptionReason || "Direct technical disruption verified."}`,
      };
    }

    const defaultThresh = OBJECTIVE_MATURITY_THRESHOLDS[input.objective] || OBJECTIVE_MATURITY_THRESHOLDS.TRAFFIC;
    const thresh = { ...defaultThresh, ...input.customThresholds };

    const hoursSinceStart = input.hoursSinceDeliveryStart ?? input.activeDeliveryDays * 24;
    const conversionLagWindowActive = hoursSinceStart < thresh.lagWindowHours;

    const impressionsAdequate = input.totalImpressions >= thresh.minImpressions;
    const clicksAdequate = input.totalClicks >= thresh.minClicks;
    const spendAdequate = input.totalSpend >= thresh.minSpendINR;
    const conversionsAdequate = thresh.minConversions
      ? (input.totalConversions ?? 0) >= thresh.minConversions
      : true;

    // Component score calculation (0 to 1)
    const daysRatio = Math.min(1.0, input.activeDeliveryDays / thresh.minActiveDays);
    const spendRatio = Math.min(1.0, input.totalSpend / thresh.minSpendINR);
    const impressionsRatio = Math.min(1.0, input.totalImpressions / thresh.minImpressions);
    const clicksRatio = Math.min(1.0, input.totalClicks / thresh.minClicks);

    const maturityScore = Math.min(
      1.0,
      daysRatio * 0.25 + spendRatio * 0.35 + clicksRatio * 0.25 + impressionsRatio * 0.15
    );

    let evidenceState: EvidenceState = "INSUFFICIENT_DATA";
    let reasoning = "";

    if (input.activeDeliveryDays < 2 || input.totalSpend < thresh.minSpendINR * 0.3) {
      evidenceState = "INSUFFICIENT_DATA";
      reasoning = `Ad is in early calibration (<2 active days or spend below 30% of threshold). No performance judgments should be formed.`;
    } else if (maturityScore < 0.85 || !clicksAdequate || (thresh.minConversions && !conversionsAdequate && !spendAdequate)) {
      evidenceState = "COLLECTING_EVIDENCE";
      reasoning = `Ad is actively collecting evidence (maturity ${(maturityScore * 100).toFixed(0)}%). Algorithms still exploring optimal audience subsets.`;
    } else {
      evidenceState = "SUFFICIENT_EVIDENCE";
      reasoning = `Ad has accumulated sufficient statistical evidence (${input.totalClicks} clicks, ₹${input.totalSpend.toFixed(0)} spend across ${input.activeDeliveryDays} active days) for reliable baseline comparison.`;
    }

    return {
      adId: input.adId,
      objective: input.objective,
      evidenceState,
      activeDeliveryDays: input.activeDeliveryDays,
      totalImpressions: input.totalImpressions,
      totalClicks: input.totalClicks,
      totalSpend: input.totalSpend,
      totalConversions: input.totalConversions,
      maturityScore,
      sampleAdequacy: {
        impressionsAdequate,
        clicksAdequate,
        spendAdequate,
        conversionsAdequate,
      },
      hasTechnicalException: false,
      conversionLagWindowActive,
      reasoning,
    };
  }
}
