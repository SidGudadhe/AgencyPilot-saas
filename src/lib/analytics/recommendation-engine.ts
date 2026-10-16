/**
 * Evidence-Based Recommendation Engine for AgencyPilot SaaS
 * 
 * Generates actionable, mathematically grounded recommendations.
 * Strictly adheres to truth in metrics: never claims guaranteed growth or fabricated % increases.
 */

export type RecommendationStatus = "NEW" | "REVIEWING" | "APPLIED" | "DISMISSED" | "RESOLVED";

export interface RecommendationItem {
  id: string;
  adId: string;
  adName: string;
  campaignId: string;
  provider: string;
  detectedIssue: string;
  supportingEvidence: string;
  recommendedAction: string;
  reasonForRecommendation: string;
  expectedDirectionOfImpact: "IMPROVE_EFFICIENCY" | "REDUCE_WASTED_SPEND" | "RESTORE_DELIVERY" | "INCREASE_CTR";
  defensibleImpactNote: string;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  assumptions: string;
  potentialRisks: string;
  observationPeriod: string;
  status: RecommendationStatus;
  createdAt: string;
}

export interface AdPerformanceContext {
  id: string;
  name: string;
  campaignId: string;
  provider: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue?: number | null;
  targetCpa?: number | null;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  frequency?: number | null;
}

/**
 * Evaluates an ad's metrics and produces defensible recommendations
 */
export function generateRecommendationsForAd(
  ad: AdPerformanceContext
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];
  const now = new Date().toISOString();

  // 1. High spend without conversions
  if (ad.spend >= 2000 && ad.conversions === 0 && ad.clicks >= 40) {
    recommendations.push({
      id: `rec-zeroconv-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      campaignId: ad.campaignId,
      provider: ad.provider,
      detectedIssue: "Capital expenditure continuing without recorded conversions.",
      supportingEvidence: `Current spend is ₹${ad.spend.toFixed(2)} across ${ad.clicks} clicks with 0 attributed conversion events.`,
      recommendedAction: "Audit conversion tracking pixel on the confirmation page and test mobile checkout friction before allocating more budget.",
      reasonForRecommendation: "Traffic is reaching the site but failing to trigger target conversion events.",
      expectedDirectionOfImpact: "REDUCE_WASTED_SPEND",
      defensibleImpactNote: "Prevents further unvalidated spend; actual conversion increase depends on resolving downstream checkout barriers.",
      confidenceLevel: "HIGH",
      assumptions: "Assumes conversions are meant to fire immediately within a 1-day to 7-day click window.",
      potentialRisks: "Temporarily pausing ad may delay discovery if product has a long consideration cycle.",
      observationPeriod: "3 to 5 business days after tracking validation.",
      status: "NEW",
      createdAt: now,
    });
  }

  // 2. High ROAS Scaling Opportunity
  if (ad.roas && ad.roas >= 3.0 && ad.spend >= 1500 && ad.conversions >= 5) {
    recommendations.push({
      id: `rec-scale-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      campaignId: ad.campaignId,
      provider: ad.provider,
      detectedIssue: "Strong efficiency: ROAS substantially exceeding break-even baseline.",
      supportingEvidence: `Observed ROAS is ${ad.roas.toFixed(2)}x on ₹${ad.spend.toFixed(2)} spend with ${ad.conversions} conversions.`,
      recommendedAction: "Gradually increment daily budget by 10-15% every 3 days while monitoring CPM stability.",
      reasonForRecommendation: "Ad has demonstrated positive unit economics with sufficient statistical sample.",
      expectedDirectionOfImpact: "IMPROVE_EFFICIENCY",
      defensibleImpactNote: "Likely to expand overall conversion volume; efficiency may taper slightly as broader audiences are reached.",
      confidenceLevel: "MEDIUM",
      assumptions: "Assumes audience saturation has not been reached and target margin remains steady.",
      potentialRisks: "Aggressive budget jumps (>20%) can reset learning phase on algorithmic ad networks.",
      observationPeriod: "5 to 7 days after each budget adjustment.",
      status: "NEW",
      createdAt: now,
    });
  }

  // 3. Creative Disengagement (Low CTR with adequate impressions)
  if (ad.impressions >= 2500 && ad.ctr !== null && ad.ctr < 0.4) {
    recommendations.push({
      id: `rec-ctr-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      campaignId: ad.campaignId,
      provider: ad.provider,
      detectedIssue: "Click-through rate is below acceptable engagement baseline.",
      supportingEvidence: `CTR is ${ad.ctr.toFixed(2)}% over ${ad.impressions.toLocaleString()} impressions.`,
      recommendedAction: "Test a new creative thumbnail, stronger contrast headline, and a more prominent call-to-action.",
      reasonForRecommendation: "Users are scrolling past without engaging, causing the ad delivery system to raise your CPM.",
      expectedDirectionOfImpact: "INCREASE_CTR",
      defensibleImpactNote: "Higher creative resonance typically lowers effective cost per click over time.",
      confidenceLevel: "HIGH",
      assumptions: "Assumes the ad format is standard feed/placement and not an unclickable banner.",
      potentialRisks: "New creative variants require fresh approval from the ad network.",
      observationPeriod: "4 to 7 days with equal budget split.",
      status: "NEW",
      createdAt: now,
    });
  }

  return recommendations;
}
