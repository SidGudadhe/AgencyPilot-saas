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
  DiagnosisEvidenceRecord,
  EvidenceStatus,
  IntelligenceRecommendation,
  PerformanceStatus,
  ProbableCauseAnalysis,
  StandardizedDiagnosisStatus,
  StatisticalAnomalyReport,
  TechnicalStatus,
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
  triDimensionalStatus: StandardizedDiagnosisStatus;
  evidenceRecords: DiagnosisEvidenceRecord[];
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
    // Engine 1: Provider Data Validation Engine (Layer A)
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
    // Engine 2: Canonical Advertising Metrics Engine (Layer C)
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
    // Engine 3: Ad Maturity and Evidence Assessment Engine (Layer B)
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
    // Engine 4: Objective-Specific Performance Baseline Engine (Layer D)
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
    // Engine 5: Statistical Anomaly Detection Engine (Layer E)
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
    // Engine 6: Verified Issue Detection Engine (Layer F & G)
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
    // Engine 7: Probable Cause Analysis Engine (Layer H)
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
    // Engine 8: Recommendation Engine (Master Prompt Section 10)
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
    // Engine 9: Confidence and Uncertainty Engine (Master Prompt Section 7)
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

    // ------------------------------------------------------------------------
    // Orthogonal 3-Dimensional Status System (Master Prompt Section 5)
    // ------------------------------------------------------------------------
    const evidenceStatus: EvidenceStatus = !dataQuality.isValid
      ? "DATA_QUALITY_ISSUE"
      : maturity.evidenceState === "INSUFFICIENT_DATA"
      ? "INSUFFICIENT_EVIDENCE"
      : maturity.evidenceState === "COLLECTING_EVIDENCE"
      ? "COLLECTING_EVIDENCE"
      : "SUFFICIENT_EVIDENCE";

    const hasVerifiedTech = issues.some((i) => i.evidence_state === "VERIFIED_TECHNICAL_ISSUE");
    const technicalStatus: TechnicalStatus = hasVerifiedTech
      ? "VERIFIED_TECHNICAL_ISSUE"
      : technicalSignals
      ? "NO_VERIFIED_TECHNICAL_ISSUE"
      : "UNKNOWN";

    let performanceStatus: PerformanceStatus = "HEALTHY_IN_EVALUATED_PERIOD";
    if (evidenceStatus === "DATA_QUALITY_ISSUE" || evidenceStatus === "INSUFFICIENT_EVIDENCE") {
      performanceStatus = "INSUFFICIENT_EVIDENCE";
    } else if (evidenceStatus === "COLLECTING_EVIDENCE") {
      performanceStatus = "MONITOR";
    } else {
      const hasSevereBreach = issues.some(
        (i) => i.evidence_state === "EVIDENCE_BACKED_PERFORMANCE_ISSUE" && (i.severity === "CRITICAL" || i.severity === "HIGH")
      );
      const hasModerateConcern = issues.some(
        (i) => i.evidence_state === "EVIDENCE_BACKED_PERFORMANCE_ISSUE" && (i.severity === "MEDIUM" || i.severity === "LOW")
      );

      if (hasSevereBreach) {
        performanceStatus = "VERIFIED_UNDERPERFORMING";
      } else if (hasModerateConcern) {
        performanceStatus = "PERFORMANCE_CONCERN";
      } else {
        performanceStatus = "HEALTHY_IN_EVALUATED_PERIOD";
      }
    }

    const statusRationale = `Evidence: ${evidenceStatus} • Technical: ${technicalStatus} • Performance: ${performanceStatus}`;

    const triDimensionalStatus: StandardizedDiagnosisStatus = {
      evidenceStatus,
      technicalStatus,
      performanceStatus,
      statusRationale,
    };

    // ------------------------------------------------------------------------
    // Structured Evidence Records for Every Diagnosis (Master Prompt Section 6)
    // ------------------------------------------------------------------------
    const durationDays = Math.max(1, activeDeliveryDays);
    const evidenceRecords: DiagnosisEvidenceRecord[] = issues.map((iss) => {
      const isTech = iss.evidence_state === "VERIFIED_TECHNICAL_ISSUE";
      const hasSavings = recommendation?.defensible_impact_range.hasDefensibleRange ?? false;

      return {
        issueId: iss.issue_id,
        issueType: iss.issue_type,
        adId: ad.id,
        campaignId: campaign.id,
        providerId: ad.provider,
        workspaceId,
        evaluationWindow: {
          startDate: reportingDateRange.startDate,
          endDate: reportingDateRange.endDate,
          durationDays,
        },
        dataFreshnessHours: dataQuality.syncStalenessHours,
        observedMetrics: iss.observed_metrics,
        applicableBaseline: iss.baseline_metrics,
        absoluteChange: typeof iss.observed_metrics.relativeDeclinePercent === "number" ? iss.observed_metrics.relativeDeclinePercent : null,
        relativeChangeRatio: typeof iss.observed_metrics.relativeDeclinePercent === "number" ? Number(iss.observed_metrics.relativeDeclinePercent) / 100 : null,
        minimumEvidenceRequirements: [
          {
            requirement: "Data Integrity & Non-staleness",
            met: !dataQuality.isStale,
            observedValue: `${dataQuality.syncStalenessHours.toFixed(1)}h staleness`,
            requiredThreshold: "< 24h staleness",
          },
          {
            requirement: isTech ? "Direct Technical Confirmation" : "Statistical Sample Adequacy",
            met: isTech ? true : maturity.maturityScore >= 0.8,
            observedValue: isTech ? iss.verification_method : `${(maturity.maturityScore * 100).toFixed(0)}% score`,
            requiredThreshold: isTech ? "Observed HTTP or API failure" : ">= 80% adequacy",
          },
        ],
        statisticalUncertainty: anomalies.ctrAnomaly
          ? {
              pValue: anomalies.ctrAnomaly.pValue,
              confidenceIntervalWilson95: anomalies.ctrAnomaly.confidenceIntervalWilson95,
              sampleSize: canonicalMetrics.core.impressions,
              method: "Wilson score 95% binomial interval",
            }
          : undefined,
        businessImpactEstimate: hasSavings
          ? {
              status: "ESTIMATED",
              minEstimatedSaving: recommendation?.defensible_impact_range.minEstimatedSaving,
              maxEstimatedSaving: recommendation?.defensible_impact_range.maxEstimatedSaving,
              currency: account.currency,
              assumptions: recommendation?.confidence_and_assumptions.keyAssumptions || [],
            }
          : {
              status: "NOT_ESTIMABLE",
              assumptions: [],
              reasonIfUnestimable: "Ad is either in calibration or lacks historical conversion baseline.",
            },
        confirmedFacts: [
          `Ad Status: ${ad.status}`,
          `Spend: ${canonicalMetrics.core.spend}`,
          `Impressions: ${canonicalMetrics.core.impressions}`,
          `Clicks: ${canonicalMetrics.core.clicks}`,
          `Verification: ${iss.verification_method}`,
        ],
        suspectedCauses: causeAnalysis
          ? [
              {
                hypothesis: causeAnalysis.primaryHypothesis.cause,
                probability: causeAnalysis.primaryHypothesis.probability,
                supportingEvidence: causeAnalysis.primaryHypothesis.corroboratingSignals,
                counterEvidence: [],
                additionalDataNeeded: causeAnalysis.confoundingFactors,
                recommendedTest: causeAnalysis.diagnosticNextSteps[0] || "Audit telemetry",
              },
              ...causeAnalysis.competingHypotheses.map((ch) => ({
                hypothesis: ch.cause,
                probability: ch.probability,
                supportingEvidence: [],
                counterEvidence: ch.counterEvidence,
                additionalDataNeeded: ["Extended multi-day attribution verification"],
                recommendedTest: causeAnalysis?.diagnosticNextSteps[1] || "A/B test replacement variant",
              })),
            ]
          : [],
        missingInformationAndLimitations: [iss.limitations, ...dataQuality.unsupportedConclusions],
        recommendedNextAction: iss.recommended_action,
        resolutionConditions: {
          confirmationConditions: ["Issue persists across next 48h scheduled synchronization."],
          weakeningConditions: ["Observed conversion rate rebounds into 95% baseline interval."],
          resolvingConditions: [
            isTech
              ? "Destination endpoint returns HTTP 200 OK."
              : "Blended CPA stabilizes within target limit.",
          ],
        },
        calibratedConfidence: {
          score: iss.confidence_level,
          tier: iss.confidence_tier,
          isCalibrated: true,
        },
      };
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
      triDimensionalStatus,
      evidenceRecords,
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
