/**
 * Ad Intelligence Pipeline Orchestrator
 * 
 * Sequences the 10 modular analytics engines in order:
 * 1. Data Validation Engine
 * 2. Canonical Metrics Engine
 * 3. Ad Maturity & Evidence Engine
 * 4. Performance Baseline Engine
 * 5. Statistical Anomaly Detection Engine
 * 6. Verified Issue Detection Engine
 * 7. Probable Cause Analysis Engine
 * 8. Recommendation Engine
 * 9. Confidence & Uncertainty Engine
 * 10. Historical Evaluation & Calibration
 */

import {
  AdMaturityAssessment,
  AdPerformanceBaseline,
  ConfidenceEvaluation,
  DataQualityReport,
  IntelligenceRecommendation,
  ProbableCauseAnalysis,
  StatisticalAnomalyReport,
  VerifiedIssue,
} from "./types/intelligence";
import { DataValidationEngine, RawAdDataInput } from "./engines/data-validation-engine";
import { CanonicalMetricsEngine, CanonicalMetricsOutput } from "./engines/canonical-metrics-engine";
import { AdMaturityEngine } from "./engines/ad-maturity-engine";
import { HistoricalDataPoint, PerformanceBaselineEngine } from "./engines/performance-baseline-engine";
import { StatisticalAnomalyEngine } from "./engines/statistical-anomaly-engine";
import { IssueDetectionEngine } from "./engines/issue-detection-engine";
import { CauseAnalysisEngine } from "./engines/cause-analysis-engine";
import { RecommendationEngine } from "./engines/recommendation-engine";
import { ConfidenceUncertaintyEngine } from "./engines/confidence-uncertainty-engine";

export interface AdIntelligenceRequest {
  ad: {
    id: string;
    name: string;
    externalId: string;
    provider: any;
    status: any;
    creativeUrl?: string | null;
    landingPageUrl?: string | null;
  };
  campaign: {
    id: string;
    name: string;
    objective: any;
  };
  account: {
    id: string;
    externalId: string;
    currency: string;
    timezone?: string;
  };
  workspaceId: string;
  currentMetrics: {
    impressions?: number | null;
    clicks?: number | null;
    spend?: number | null;
    conversions?: number | null;
    revenue?: number | null;
    reach?: number | null;
    videoViews?: number | null;
    landingPageViews?: number | null;
    cpc?: number | null;
    cpm?: number | null;
    ctr?: number | null;
    frequency?: number | null;
  };
  historicalPoints?: HistoricalDataPoint[];
  activeDeliveryDays: number;
  lastSyncTimestamp: string;
  reportingDateRange: {
    startDate: string;
    endDate: string;
  };
  technicalSignals?: {
    landingPageHttpStatus?: number;
    landingPageResponseMs?: number;
    editorialRejectionReason?: string;
  };
  configuredTargets?: {
    targetCpa?: number;
    targetRoas?: number;
  };
  consecutiveDaysWithZeroConversions?: number;
}

export interface AdIntelligenceResult {
  adId: string;
  adName: string;
  provider: any;
  dataQuality: DataQualityReport;
  canonicalMetrics: CanonicalMetricsOutput;
  maturity: AdMaturityAssessment;
  baseline: AdPerformanceBaseline;
  anomalies: StatisticalAnomalyReport;
  issues: VerifiedIssue[];
  causeAnalysis?: ProbableCauseAnalysis;
  recommendation: IntelligenceRecommendation | null;
  confidence: ConfidenceEvaluation;
  generatedAt: string;
}

export class AdIntelligenceOrchestrator {
  /**
   * Executes the full 10-engine pipeline for a single advertisement.
   */
  public static processAd(request: AdIntelligenceRequest): AdIntelligenceResult {
    const {
      ad,
      campaign,
      account,
      workspaceId,
      currentMetrics,
      historicalPoints = [],
      activeDeliveryDays,
      lastSyncTimestamp,
      reportingDateRange,
      technicalSignals,
      configuredTargets,
      consecutiveDaysWithZeroConversions = 0,
    } = request;

    // ------------------------------------------------------------------------
    // Engine 1: Provider Data Validation Engine
    // ------------------------------------------------------------------------
    const validationInput: RawAdDataInput = {
      adId: ad.id,
      provider: ad.provider,
      accountId: account.id,
      adStatus: ad.status,
      currency: account.currency,
      accountCurrency: account.currency,
      startDate: reportingDateRange.startDate,
      endDate: reportingDateRange.endDate,
      timezone: account.timezone,
      lastSyncTimestamp,
      impressions: currentMetrics.impressions,
      clicks: currentMetrics.clicks,
      spend: currentMetrics.spend,
      conversions: currentMetrics.conversions,
      revenue: currentMetrics.revenue,
      reach: currentMetrics.reach,
      videoViews: currentMetrics.videoViews,
      landingPageViews: currentMetrics.landingPageViews,
    };
    const dataQuality = DataValidationEngine.validate(validationInput);

    // ------------------------------------------------------------------------
    // Engine 2: Canonical Advertising Metrics Engine
    // ------------------------------------------------------------------------
    const canonicalMetrics = CanonicalMetricsEngine.calculate({
      adId: ad.id,
      objective: campaign.objective,
      currency: account.currency,
      impressions: currentMetrics.impressions,
      clicks: currentMetrics.clicks,
      spend: currentMetrics.spend,
      conversions: currentMetrics.conversions,
      revenue: currentMetrics.revenue,
      reach: currentMetrics.reach,
      videoViews: currentMetrics.videoViews,
      landingPageViews: currentMetrics.landingPageViews,
      dataQuality,
    });

    // ------------------------------------------------------------------------
    // Engine 3: Ad Maturity and Evidence Assessment Engine
    // ------------------------------------------------------------------------
    const hasTechnicalException = Boolean(
      (technicalSignals?.landingPageHttpStatus && technicalSignals.landingPageHttpStatus >= 400) ||
      technicalSignals?.editorialRejectionReason
    );
    const technicalExceptionReason = technicalSignals?.editorialRejectionReason ||
      (technicalSignals?.landingPageHttpStatus ? `HTTP ${technicalSignals.landingPageHttpStatus}` : undefined);

    const maturity = AdMaturityEngine.evaluate({
      adId: ad.id,
      objective: campaign.objective,
      activeDeliveryDays,
      totalImpressions: canonicalMetrics.core.impressions,
      totalClicks: canonicalMetrics.core.clicks,
      totalSpend: canonicalMetrics.core.spend,
      totalConversions: canonicalMetrics.core.conversions,
      hasTechnicalException,
      technicalExceptionReason,
    });

    // ------------------------------------------------------------------------
    // Engine 4: Objective-Specific Performance Baseline Engine
    // ------------------------------------------------------------------------
    const baseline = PerformanceBaselineEngine.generateBaseline({
      id: `BASE-${ad.id}`,
      workspaceId,
      scope: "AD",
      objective: campaign.objective,
      currency: account.currency,
      startDate: reportingDateRange.startDate,
      endDate: reportingDateRange.endDate,
      history: historicalPoints,
      configuredTargetCpa: configuredTargets?.targetCpa,
      configuredTargetRoas: configuredTargets?.targetRoas,
    });

    // ------------------------------------------------------------------------
    // Engine 5: Statistical Anomaly Detection Engine
    // ------------------------------------------------------------------------
    const anomalies = StatisticalAnomalyEngine.analyze({
      adId: ad.id,
      testDate: reportingDateRange.endDate,
      observed: {
        impressions: canonicalMetrics.core.impressions,
        clicks: canonicalMetrics.core.clicks,
        spend: canonicalMetrics.core.spend,
        conversions: canonicalMetrics.core.conversions,
        revenue: canonicalMetrics.core.revenue,
        cpc: canonicalMetrics.derived.cpc.value,
        cpm: canonicalMetrics.derived.cpm.value,
      },
      baseline,
      consecutiveDaysWithZeroConversions,
    });

    // ------------------------------------------------------------------------
    // Engine 6: Verified Issue Detection Engine
    // ------------------------------------------------------------------------
    const issues = IssueDetectionEngine.detectIssues({
      workspaceId,
      providerId: ad.provider,
      accountId: account.id,
      adId: ad.id,
      adName: ad.name,
      dataQuality,
      maturity,
      baseline,
      anomalies,
      technicalSignals,
      observedMetrics: {
        impressions: canonicalMetrics.core.impressions,
        clicks: canonicalMetrics.core.clicks,
        spend: canonicalMetrics.core.spend,
        conversions: canonicalMetrics.core.conversions,
        cpa: canonicalMetrics.derived.cpa.value,
        ctr: canonicalMetrics.derived.ctr.value,
      },
      reportingPeriod: reportingDateRange,
    });

    // ------------------------------------------------------------------------
    // Engine 7: Probable Cause Analysis Engine (for primary issue, if any)
    // ------------------------------------------------------------------------
    let causeAnalysis: ProbableCauseAnalysis | undefined;
    const primaryIssue = issues[0];
    if (primaryIssue) {
      causeAnalysis = CauseAnalysisEngine.analyze({
        issue: primaryIssue,
        frequency: currentMetrics.frequency,
        clicks: canonicalMetrics.core.clicks,
        landingPageViews: currentMetrics.landingPageViews,
      });
    }

    // ------------------------------------------------------------------------
    // Engine 8: Recommendation Engine
    // ------------------------------------------------------------------------
    const dailySpend = activeDeliveryDays > 0 ? canonicalMetrics.core.spend / activeDeliveryDays : canonicalMetrics.core.spend;
    const recommendation = RecommendationEngine.generate({
      workspaceId,
      adId: ad.id,
      adName: ad.name,
      maturity,
      issue: primaryIssue,
      causeAnalysis,
      dailySpend,
    });

    // ------------------------------------------------------------------------
    // Engine 9: Confidence and Uncertainty Engine
    // ------------------------------------------------------------------------
    const confidence = ConfidenceUncertaintyEngine.evaluate({
      dataQuality,
      maturity,
      baseline,
      anomalies,
      issue: primaryIssue,
      signalDaysCount: activeDeliveryDays,
      corroboratingSignalsCount: issues.length,
    });

    return {
      adId: ad.id,
      adName: ad.name,
      provider: ad.provider,
      dataQuality,
      canonicalMetrics,
      maturity,
      baseline,
      anomalies,
      issues,
      causeAnalysis,
      recommendation,
      confidence,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Processes multiple advertisements in batch.
   */
  public static processBatch(requests: AdIntelligenceRequest[]): AdIntelligenceResult[] {
    return requests.map(req => this.processAd(req));
  }
}
