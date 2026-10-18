/**
 * Engine 6: Verified Issue Detection Engine
 * 
 * Accurately classifies anomalies and signals into strict issue typologies:
 * 1. VERIFIED_TECHNICAL_ISSUE (direct technical proof: landing page 404/timeout, tracking loss, policy rejection)
 * 2. EVIDENCE_BACKED_PERFORMANCE_ISSUE (sufficient maturity + statistically verified failure)
 * 3. PROBABLE_CAUSE / HYPOTHESIS (investigative leads)
 * 4. INSUFFICIENT_EVIDENCE (new ads, small sample sizes)
 * 
 * Never converts a hypothesis into a verified cause.
 */

import {
  AdMaturityAssessment,
  AdPerformanceBaseline,
  DataQualityReport,
  IssueClassification,
  IssueSeverity,
  StatisticalAnomalyReport,
  VerifiedIssue,
  VerifiedIssueType,
} from "../types/intelligence";

export interface IssueDetectionContext {
  workspaceId: string;
  providerId: any;
  accountId: string;
  adId: string;
  adName: string;
  dataQuality: DataQualityReport;
  maturity: AdMaturityAssessment;
  baseline: AdPerformanceBaseline;
  anomalies: StatisticalAnomalyReport;
  technicalSignals?: {
    landingPageHttpStatus?: number;
    landingPageResponseMs?: number;
    editorialRejectionReason?: string;
    trackingPixelsActive?: boolean;
  };
  observedMetrics: Record<string, any>;
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
}

export class IssueDetectionEngine {
  /**
   * Evaluates all data, maturity, technical signals, and statistical anomalies to detect verified issues.
   */
  public static detectIssues(context: IssueDetectionContext): VerifiedIssue[] {
    const issues: VerifiedIssue[] = [];
    const now = new Date().toISOString();
    const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const {
      workspaceId,
      providerId,
      accountId,
      adId,
      dataQuality,
      maturity,
      baseline,
      anomalies,
      technicalSignals,
      observedMetrics,
      reportingPeriod,
    } = context;

    // =========================================================================
    // 1. VERIFIED TECHNICAL ISSUES (Immediate evidence, overrides sample size)
    // =========================================================================

    // A. Landing Page Error (404, 500, or extreme timeout)
    if (technicalSignals?.landingPageHttpStatus && technicalSignals.landingPageHttpStatus >= 400) {
      issues.push({
        issue_id: `ISSUE-${adId}-LP-ERR`,
        workspace_id: workspaceId,
        provider_id: providerId,
        account_id: accountId,
        ad_id: adId,
        issue_type: "LANDING_PAGE_ERROR_404_OR_TIMEOUT",
        severity: "CRITICAL",
        evidence_state: "VERIFIED_TECHNICAL_ISSUE",
        observed_metrics: {
          httpStatus: technicalSignals.landingPageHttpStatus,
          responseMs: technicalSignals.landingPageResponseMs,
          wastedSpend: observedMetrics.spend ?? 0,
        },
        baseline_metrics: { expectedHttpStatus: 200 },
        reporting_period: reportingPeriod,
        detection_timestamp: now,
        confidence_level: 0.99,
        confidence_tier: "HIGH",
        verification_method: `Direct HTTP probe returned status code ${technicalSignals.landingPageHttpStatus}.`,
        alternative_explanations: [
          "Temporary hosting maintenance or DNS propagation delay.",
          "Aggressive bot protection or geo-blocking by the destination server.",
        ],
        recommended_action: "Pause ad immediately or update the destination URL to a verified live endpoint.",
        limitations: "Direct endpoint probe was executed from backend scanner; user geographic conditions may vary.",
        next_review_timestamp: nextReview,
      });
    }

    // B. Editorial Policy Rejection
    if (technicalSignals?.editorialRejectionReason) {
      issues.push({
        issue_id: `ISSUE-${adId}-POLICY-REJ`,
        workspace_id: workspaceId,
        provider_id: providerId,
        account_id: accountId,
        ad_id: adId,
        issue_type: "EDITORIAL_POLICY_REJECTION",
        severity: "CRITICAL",
        evidence_state: "VERIFIED_TECHNICAL_ISSUE",
        observed_metrics: {
          rejectionReason: technicalSignals.editorialRejectionReason,
        },
        baseline_metrics: { expectedStatus: "ACTIVE" },
        reporting_period: reportingPeriod,
        detection_timestamp: now,
        confidence_level: 1.0,
        confidence_tier: "HIGH",
        verification_method: "Direct provider API status flag: Ad rejected by compliance team.",
        alternative_explanations: [
          "Automated provider OCR/content classifier flagged text or image incorrectly.",
        ],
        recommended_action: "Review creative against platform editorial policies and request manual appeal or submit revised copy.",
        limitations: "Policy decisions are administered solely by the advertising network.",
        next_review_timestamp: nextReview,
      });
    }

    // C. Conversion Tracking Disruption
    if (anomalies.trackingDropAnomaly?.isTrackingDrop) {
      issues.push({
        issue_id: `ISSUE-${adId}-TRACKING-DROP`,
        workspace_id: workspaceId,
        provider_id: providerId,
        account_id: accountId,
        ad_id: adId,
        issue_type: "CONVERSION_TRACKING_DISRUPTION",
        severity: "HIGH",
        evidence_state: "VERIFIED_TECHNICAL_ISSUE",
        observed_metrics: {
          consecutiveDaysWithZeroConversions: anomalies.trackingDropAnomaly.consecutiveDaysWithZeroConversions,
          conversions: 0,
          clicks: observedMetrics.clicks ?? 0,
          binomialZeroProbability: anomalies.trackingDropAnomaly.binomialZeroProbability,
        },
        baseline_metrics: {
          expectedConversions: anomalies.trackingDropAnomaly.expectedConversionsGivenClicks,
          historicalCvr: baseline.metrics.cvr?.mean,
        },
        reporting_period: reportingPeriod,
        detection_timestamp: now,
        confidence_level: 0.95,
        confidence_tier: "HIGH",
        verification_method: `Binomial probability of 0 conversions across ${observedMetrics.clicks} clicks is < 1% (p = ${anomalies.trackingDropAnomaly.binomialZeroProbability.toFixed(5)}).`,
        alternative_explanations: [
          "Tracking pixel tag removed or broken during recent website deployment.",
          "Server-side conversion API access token expired.",
          "Payment gateway checkout outage preventing completions.",
        ],
        recommended_action: "Inspect pixel tag firing and Conversion API logs in network events before modifying ad creatives.",
        limitations: "Cannot inspect client-side JavaScript execution without browser instrumentation.",
        next_review_timestamp: nextReview,
      });
    }

    // =========================================================================
    // 2. EVIDENCE-BACKED PERFORMANCE ISSUES (Requires SUFFICIENT_EVIDENCE)
    // =========================================================================

    // Protection rule: If ad has INSUFFICIENT_DATA or COLLECTING_EVIDENCE, DO NOT create performance issues!
    if (maturity.evidenceState === "INSUFFICIENT_DATA" || maturity.evidenceState === "COLLECTING_EVIDENCE") {
      return issues;
    }

    // A. Unvalidated Capital Expenditure (High spend, 0 conversions past maturity)
    const spend = Number(observedMetrics.spend ?? 0);
    const conversions = observedMetrics.conversions !== null ? Number(observedMetrics.conversions) : null;

    if (conversions === 0 && spend >= 3000 && maturity.activeDeliveryDays >= 4) {
      issues.push({
        issue_id: `ISSUE-${adId}-ZERO-CONV-SPEND`,
        workspace_id: workspaceId,
        provider_id: providerId,
        account_id: accountId,
        ad_id: adId,
        issue_type: "UNVALIDATED_CAPITAL_EXPENDITURE",
        severity: "HIGH",
        evidence_state: "EVIDENCE_BACKED_PERFORMANCE_ISSUE",
        observed_metrics: {
          spend,
          conversions: 0,
          activeDeliveryDays: maturity.activeDeliveryDays,
          clicks: observedMetrics.clicks ?? 0,
        },
        baseline_metrics: {
          targetCpa: baseline.metrics.targetCpa ?? baseline.metrics.cpa?.mean,
        },
        reporting_period: reportingPeriod,
        detection_timestamp: now,
        confidence_level: 0.90,
        confidence_tier: "HIGH",
        verification_method: `Ad consumed ₹${spend.toFixed(0)} over ${maturity.activeDeliveryDays} active delivery days with zero recorded conversions past full maturity window.`,
        alternative_explanations: [
          "Offer price elasticity or checkout funnel friction.",
          "Attribution lag if sales cycle exceeds 48 hours.",
        ],
        recommended_action: "Pause ad variant to protect budget and evaluate audience targeting fit or landing page value proposition.",
        limitations: "Assumes conversion tracking pixel is verified and functional.",
        next_review_timestamp: nextReview,
      });
    }

    // B. Target CPA Severe Breach
    const targetCpa = baseline.metrics.targetCpa ?? (baseline.metrics.cpa?.mean ? baseline.metrics.cpa.mean * 1.2 : null);
    const observedCpa = observedMetrics.cpa !== null && observedMetrics.cpa !== undefined ? Number(observedMetrics.cpa) : null;

    if (observedCpa && targetCpa && targetCpa > 0 && observedCpa > targetCpa * 2.0 && conversions !== null && conversions >= 3) {
      issues.push({
        issue_id: `ISSUE-${adId}-CPA-BREACH`,
        workspace_id: workspaceId,
        provider_id: providerId,
        account_id: accountId,
        ad_id: adId,
        issue_type: "COST_PER_ACQUISITION_SEVERE_TARGET_BREACH",
        severity: "HIGH",
        evidence_state: "EVIDENCE_BACKED_PERFORMANCE_ISSUE",
        observed_metrics: {
          cpa: observedCpa,
          conversions,
          spend,
        },
        baseline_metrics: {
          targetCpa,
          baselineCpaMean: baseline.metrics.cpa?.mean,
        },
        reporting_period: reportingPeriod,
        detection_timestamp: now,
        confidence_level: 0.88,
        confidence_tier: "HIGH",
        verification_method: `Observed CPA (₹${observedCpa.toFixed(0)}) exceeds configured target CPA (₹${targetCpa.toFixed(0)}) by ${((observedCpa / targetCpa - 1) * 100).toFixed(0)}% across ${conversions} conversions.`,
        alternative_explanations: [
          "Higher auction CPM due to seasonal market competition.",
          "Decreased post-click conversion rate on landing page.",
        ],
        recommended_action: "Lower target bidding cap or adjust audience exclusions to tighten intent.",
        limitations: "Delayed multi-touch conversions could improve final CPA over 7-day window.",
        next_review_timestamp: nextReview,
      });
    }

    // C. Click-Through Significant Collapse (Binomial CTR Anomaly)
    if (anomalies.ctrAnomaly?.isSignificant && anomalies.ctrAnomaly.relativeChangeRatio <= -0.40) {
      issues.push({
        issue_id: `ISSUE-${adId}-CTR-COLLAPSE`,
        workspace_id: workspaceId,
        provider_id: providerId,
        account_id: accountId,
        ad_id: adId,
        issue_type: "CLICK_THROUGH_SIGNIFICANT_COLLAPSE",
        severity: "MEDIUM",
        evidence_state: "EVIDENCE_BACKED_PERFORMANCE_ISSUE",
        observed_metrics: {
          observedCtr: anomalies.ctrAnomaly.observedRate,
          relativeDeclinePercent: anomalies.ctrAnomaly.relativeChangeRatio * 100,
          clicks: observedMetrics.clicks,
          impressions: observedMetrics.impressions,
        },
        baseline_metrics: {
          baselineCtr: anomalies.ctrAnomaly.baselineRate,
        },
        reporting_period: reportingPeriod,
        detection_timestamp: now,
        confidence_level: 0.85,
        confidence_tier: "HIGH",
        verification_method: `Observed CTR (${anomalies.ctrAnomaly.observedRate.toFixed(2)}%) dropped ${Math.abs(anomalies.ctrAnomaly.relativeChangeRatio * 100).toFixed(0)}% below baseline (${anomalies.ctrAnomaly.baselineRate.toFixed(2)}%) with p-value ${anomalies.ctrAnomaly.pValue.toFixed(4)}.`,
        alternative_explanations: [
          "Creative fatigue if frequency is elevated.",
          "Audience saturation in current demographic segment.",
        ],
        recommended_action: "Refresh ad creative imagery or headline to restore user engagement.",
        limitations: "Sudden inventory placement shift by advertising network could also reduce CTR.",
        next_review_timestamp: nextReview,
      });
    }

    return issues;
  }
}
