/**
 * Rule-Based Anomaly & Problem Detector for High-Priority Ads ("Needs Attention")
 * 
 * Strict evidence-based detection. Never marks an ad critical without concrete
 * threshold breaches and adequate sample size.
 */

export type AnomalySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "MONITOR";

export interface AnomalyReport {
  id: string;
  adId: string;
  adName: string;
  provider: string;
  campaignName: string;
  severity: AnomalySeverity;
  problemDetected: string;
  supportingMetrics: {
    spend: number;
    conversions: number;
    ctr?: number | null;
    cpc?: number | null;
    cpa?: number | null;
    frequency?: number | null;
    targetCpa?: number | null;
    historicalCtr?: number | null;
  };
  comparisonContext: string;
  whyItMatters: string;
  recommendedAction: string;
  potentialImpact: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dataLimitations: string;
  detectedAt: string;
}

export interface AdDiagnosticData {
  id: string;
  name: string;
  provider: string;
  campaignName: string;
  status: string;
  currentSpend: number;
  currentConversions: number;
  currentClicks: number;
  currentImpressions: number;
  currentReach?: number | null;
  targetCpa?: number | null;
  historicalCtr?: number | null;
  historicalCpa?: number | null;
  historicalFrequency?: number | null;
  trackingDiscrepancy?: boolean;
  rejectionReason?: string | null;
}

/**
 * Detects performance anomalies for a single ad based on concrete mathematical evidence
 */
export function diagnoseAd(ad: AdDiagnosticData): AnomalyReport | null {
  const now = new Date().toISOString();
  const ctr = ad.currentImpressions > 0 ? (ad.currentClicks / ad.currentImpressions) * 100 : 0;
  const cpa = ad.currentConversions > 0 ? ad.currentSpend / ad.currentConversions : null;
  const frequency = ad.currentReach && ad.currentReach > 0 ? ad.currentImpressions / ad.currentReach : null;

  // 1. Rejected or Delivery Failure by Provider (Critical)
  if (ad.status === "REJECTED" || ad.rejectionReason) {
    return {
      id: `anom-rej-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      provider: ad.provider,
      campaignName: ad.campaignName,
      severity: "CRITICAL",
      problemDetected: "Ad Rejected / Delivery Halt by Provider",
      supportingMetrics: {
        spend: ad.currentSpend,
        conversions: ad.currentConversions,
      },
      comparisonContext: "Platform policy verification",
      whyItMatters: "Ad is paused by the ad network and will not generate any business reach or sales.",
      recommendedAction: "Review provider editorial guidelines and submit updated creative copy or appeal rejection.",
      potentialImpact: "Restores ad delivery upon compliance clearance.",
      confidence: "HIGH",
      dataLimitations: "Reason provided directly by ad network API response.",
      detectedAt: now,
    };
  }

  // 2. High Spend with Zero Conversions (Critical)
  // Spend > ₹2,500 with 0 conversions and at least 50 clicks (adequate statistical sample)
  if (ad.currentSpend >= 2500 && ad.currentConversions === 0 && ad.currentClicks >= 50) {
    return {
      id: `anom-zeroconv-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      provider: ad.provider,
      campaignName: ad.campaignName,
      severity: "CRITICAL",
      problemDetected: "Substantial Spend with Zero Attributed Conversions",
      supportingMetrics: {
        spend: ad.currentSpend,
        conversions: 0,
        cpc: ad.currentClicks > 0 ? ad.currentSpend / ad.currentClicks : null,
      },
      comparisonContext: `Sample size: ${ad.currentClicks} clicks evaluated without conversion event.`,
      whyItMatters: "Budget is being drained without fulfilling the campaign objective.",
      recommendedAction: "Inspect landing page tracking pixel, verify checkout flow, and consider testing a tighter audience segment.",
      potentialImpact: "Prevents continued capital loss on non-converting traffic.",
      confidence: "HIGH",
      dataLimitations: "Does not account for delayed multi-day conversion attribution windows if enabled.",
      detectedAt: now,
    };
  }

  // 3. CPA Exceeding Configured Target by > 50% (High Severity)
  if (ad.targetCpa && cpa && cpa > ad.targetCpa * 1.5 && ad.currentConversions >= 3) {
    return {
      id: `anom-cpa-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      provider: ad.provider,
      campaignName: ad.campaignName,
      severity: "HIGH",
      problemDetected: `CPA Exceeding Target by ${(((cpa - ad.targetCpa) / ad.targetCpa) * 100).toFixed(0)}%`,
      supportingMetrics: {
        spend: ad.currentSpend,
        conversions: ad.currentConversions,
        cpa: cpa,
        targetCpa: ad.targetCpa,
      },
      comparisonContext: `Current CPA ₹${cpa.toFixed(2)} vs Target CPA ₹${ad.targetCpa.toFixed(2)}`,
      whyItMatters: "Acquisition cost is unprofitable relative to the configured unit economics target.",
      recommendedAction: "Evaluate creative fatigue or refine bidding strategy from broad targeting to high-intent retargeting.",
      potentialImpact: "Reduces blended cost per acquisition towards target threshold.",
      confidence: "HIGH",
      dataLimitations: "Based on conversions tracked within the selected reporting timeframe.",
      detectedAt: now,
    };
  }

  // 4. Creative Fatigue: High Frequency with Declining CTR (Medium Severity)
  if (frequency && frequency > 3.5 && ad.historicalCtr && ctr < ad.historicalCtr * 0.7 && ad.currentImpressions >= 1000) {
    return {
      id: `anom-fatigue-${ad.id}`,
      adId: ad.id,
      adName: ad.name,
      provider: ad.provider,
      campaignName: ad.campaignName,
      severity: "MEDIUM",
      problemDetected: "Audience Ad Fatigue (High Frequency & Sharp CTR Drop)",
      supportingMetrics: {
        spend: ad.currentSpend,
        conversions: ad.currentConversions,
        ctr: ctr,
        frequency: frequency,
        historicalCtr: ad.historicalCtr,
      },
      comparisonContext: `Frequency reached ${frequency.toFixed(1)} while CTR fell from ${ad.historicalCtr.toFixed(2)}% to ${ctr.toFixed(2)}%`,
      whyItMatters: "Audience has seen the ad multiple times and is disengaging, inflating CPM and CPC.",
      recommendedAction: "Rotate in fresh creative variants, update video hooks, or expand target audience size.",
      potentialImpact: "Expected revival of click-through rate and reduced CPM over 7-14 days.",
      confidence: "MEDIUM",
      dataLimitations: "Frequency estimation depends on provider cookie/device graph fidelity.",
      detectedAt: now,
    };
  }

  // 5. Insufficient Data / Early Stage Monitoring
  if (ad.currentSpend > 0 && (ad.currentClicks < 20 || ad.currentImpressions < 500)) {
    // Insufficient statistical sample: do not invent alarms
    return null;
  }

  return null;
}
