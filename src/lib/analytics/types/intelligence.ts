/**
 * Comprehensive Domain Types for AgencyPilot Ad Intelligence Engine
 * 
 * Defines the core schemas for all 10 modular engines:
 * 1. Data Validation Engine
 * 2. Canonical Metrics Engine
 * 3. Ad Maturity & Evidence Engine
 * 4. Performance Baseline Engine
 * 5. Statistical Anomaly Detection Engine
 * 6. Verified Issue Detection Engine
 * 7. Probable Cause Analysis Engine
 * 8. Recommendation Engine
 * 9. Confidence & Uncertainty Engine
 * 10. Historical Evaluation & Feedback Engine
 */

import { AdProvider, AdStatus } from "@/types/analytics";

export { AdProvider, AdStatus };

// ============================================================================
// 1. DATA VALIDATION & METRIC AVAILABILITY STATES
// ============================================================================

/**
 * Explicit metric availability state to prevent converting missing/delayed values to zero.
 */
export type MetricState = "VALID" | "ZERO" | "UNAVAILABLE" | "DELAYED" | "INVALID";

export interface DataQualityReport {
  isValid: boolean;
  providerId: AdProvider;
  accountId: string;
  adId: string;
  reportingDateRange: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  currency: string;
  lastSyncTimestamp: string;
  syncStalenessHours: number;
  isStale: boolean; // Sync older than 24h
  completenessScore: number; // 0.0 - 1.0
  consistencyChecks: {
    passed: boolean;
    clicksExceedImpressions: boolean;
    conversionsExceedClicks: boolean;
    spendWithoutImpressions: boolean;
    duplicateConversionEvents: boolean;
    currencyMismatch: boolean;
    timezoneMismatch: boolean;
  };
  metricStates: {
    impressions: MetricState;
    clicks: MetricState;
    spend: MetricState;
    conversions: MetricState;
    revenue: MetricState;
    reach: MetricState;
    videoViews: MetricState;
  };
  attributionSettings: {
    windowDays: number;
    model: "LAST_CLICK" | "FIRST_CLICK" | "DATA_DRIVEN" | "VIEW_THROUGH";
    estimatedConversionLagHours: number;
  };
  unsupportedConclusions: string[];
}

// ============================================================================
// 2. CAMPAIGN OBJECTIVES & DENOMINATORS
// ============================================================================

export type CampaignObjective =
  | "AWARENESS"
  | "REACH"
  | "VIDEO_VIEWS"
  | "TRAFFIC"
  | "LEAD_GENERATION"
  | "PURCHASES"
  | "APP_CONVERSIONS"
  | "CALLS";

export interface ObjectiveMetricSpec {
  objective: CampaignObjective;
  primaryMetric: string;
  primaryDenominator: string;
  secondaryMetrics: string[];
  minimumSampleForMaturity: {
    minActiveDays: number;
    minSpendINR: number;
    minImpressions?: number;
    minClicks?: number;
    minConversions?: number;
  };
}

// ============================================================================
// 3. AD MATURITY & EVIDENCE STATES
// ============================================================================

export type EvidenceState =
  | "INSUFFICIENT_DATA"
  | "COLLECTING_EVIDENCE"
  | "SUFFICIENT_EVIDENCE"
  | "VERIFIED_ISSUE";

export interface AdMaturityAssessment {
  adId: string;
  objective: CampaignObjective;
  evidenceState: EvidenceState;
  activeDeliveryDays: number;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number | null;
  maturityScore: number; // 0.0 - 1.0
  sampleAdequacy: {
    impressionsAdequate: boolean;
    clicksAdequate: boolean;
    spendAdequate: boolean;
    conversionsAdequate: boolean;
  };
  hasTechnicalException: boolean; // E.g. broken landing page or policy rejection
  technicalExceptionReason?: string;
  conversionLagWindowActive: boolean;
  reasoning: string;
}

// ============================================================================
// 4. PERFORMANCE BASELINES
// ============================================================================

export interface MetricBaselineValue {
  mean: number;
  median: number;
  standardDeviation: number;
  sampleSize: number;
  periodDays: number;
  confidenceInterval95: [number, number];
}

export interface AdPerformanceBaseline {
  id: string;
  workspaceId: string;
  scope: "AD" | "AD_GROUP" | "CAMPAIGN" | "ACCOUNT" | "BUSINESS_TARGET";
  objective: CampaignObjective;
  currency: string;
  metrics: {
    ctr?: MetricBaselineValue;
    cpc?: MetricBaselineValue;
    cpm?: MetricBaselineValue;
    cvr?: MetricBaselineValue;
    cpa?: MetricBaselineValue;
    roas?: MetricBaselineValue;
    targetCpa?: number;
    targetRoas?: number;
  };
  isReliable: boolean; // Reliable only if sampleSize >= minimum threshold
  dataPointsCount: number;
  startDate: string;
  endDate: string;
}

// ============================================================================
// 5. STATISTICAL ANOMALY & CHANGE-POINT DETECTION
// ============================================================================

export interface BinomialTestResult {
  observedRate: number;
  baselineRate: number;
  confidenceIntervalWilson95: [number, number];
  pValue: number;
  fdrAdjustedPValue?: number;
  isSignificant: boolean;
  effectSizeDifference: number; // observed - baseline
  relativeChangeRatio: number; // (observed - baseline) / baseline
}

export interface ContinuousAnomalyResult {
  observedValue: number;
  baselineMean: number;
  baselineStdDev: number;
  zScore: number;
  modifiedZScoreMAD: number; // Robust against outliers
  isAnomaly: boolean;
  direction: "INCREASE" | "DECREASE";
}

export interface ChangePointDetectionResult {
  detected: boolean;
  changePointDate?: string;
  cusumMetric: string;
  preChangeMean: number;
  postChangeMean: number;
  magnitude: number;
  confidence: number;
}

export interface StatisticalAnomalyReport {
  adId: string;
  testDate: string;
  ctrAnomaly?: BinomialTestResult;
  cvrAnomaly?: BinomialTestResult;
  cpcAnomaly?: ContinuousAnomalyResult;
  cpmAnomaly?: ContinuousAnomalyResult;
  spendChangePoint?: ChangePointDetectionResult;
  trackingDropAnomaly?: {
    isTrackingDrop: boolean;
    consecutiveDaysWithZeroConversions: number;
    expectedConversionsGivenClicks: number;
    binomialZeroProbability: number;
  };
}

// ============================================================================
// 6. VERIFIED ISSUES & HYPOTHESIS TYPOLOGY
// ============================================================================

export type IssueClassification =
  | "VERIFIED_TECHNICAL_ISSUE"
  | "EVIDENCE_BACKED_PERFORMANCE_ISSUE"
  | "PROBABLE_CAUSE"
  | "HYPOTHESIS"
  | "INSUFFICIENT_EVIDENCE";

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type VerifiedIssueType =
  | "LANDING_PAGE_ERROR_404_OR_TIMEOUT"
  | "CONVERSION_TRACKING_DISRUPTION"
  | "EDITORIAL_POLICY_REJECTION"
  | "UNVALIDATED_CAPITAL_EXPENDITURE" // High spend, 0 conversions past maturity
  | "COST_PER_ACQUISITION_SEVERE_TARGET_BREACH"
  | "CREATIVE_FATIGUE_WITH_FREQUENCY_SPIKE"
  | "AUDIENCE_SATURATION"
  | "BID_THROTTLING_OR_UNDER_DELIVERY"
  | "CLICK_THROUGH_SIGNIFICANT_COLLAPSE"
  | "TRACKING_DISCREPANCY_CLICKS_VS_LANDING_VIEWS"
  | "STALE_PROVIDER_DATA";

export interface VerifiedIssue {
  issue_id: string;
  workspace_id: string;
  provider_id: AdProvider;
  account_id: string;
  ad_id: string;
  issue_type: VerifiedIssueType;
  severity: IssueSeverity;
  evidence_state: IssueClassification;
  observed_metrics: Record<string, number | string | null | undefined>;
  baseline_metrics: Record<string, number | string | null | undefined>;
  reporting_period: {
    startDate: string;
    endDate: string;
  };
  detection_timestamp: string;
  confidence_level: number; // Calibrated 0.0 - 1.0
  confidence_tier: "HIGH" | "MEDIUM" | "LOW";
  verification_method: string;
  alternative_explanations: string[];
  recommended_action: string;
  limitations: string;
  next_review_timestamp: string;
}

// ============================================================================
// 7. PROBABLE CAUSE ANALYSIS
// ============================================================================

export interface ProbableCauseAnalysis {
  issueId: string;
  primaryHypothesis: {
    cause: string;
    probability: number; // 0.0 - 1.0
    corroboratingSignals: string[];
  };
  competingHypotheses: Array<{
    cause: string;
    probability: number;
    counterEvidence: string[];
  }>;
  confoundingFactors: string[]; // E.g. holiday weekend, attribution lag window
  diagnosticNextSteps: string[];
}

// ============================================================================
// 8. RECOMMENDATION ENGINE
// ============================================================================

export type RecommendationDirection =
  | "REDUCE_WASTED_SPEND"
  | "IMPROVE_CONVERSION_EFFICIENCY"
  | "RESTORE_DELIVERY"
  | "FIX_TRACKING_PIPELINE"
  | "PREVENT_LEARNING_RESET"
  | "EXPAND_HIGH_PERFORMING_CREATIVE";

export interface IntelligenceRecommendation {
  recommendation_id: string;
  ad_id: string;
  workspace_id: string;
  issue_id?: string;
  title: string;
  what_was_observed: string;
  why_it_matters: string;
  supporting_data_points: Record<string, string | number>;
  what_user_can_investigate_or_change: string[];
  additional_evidence_needed: string[];
  expected_direction_of_impact: RecommendationDirection;
  defensible_impact_range: {
    hasDefensibleRange: boolean;
    currency?: string;
    minEstimatedSaving?: number;
    maxEstimatedSaving?: number;
    explanation: string;
  };
  confidence_and_assumptions: {
    confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
    confidenceScore: number;
    keyAssumptions: string[];
  };
  potential_risks: string[];
  evaluation_plan: {
    evaluationTimeframe: string;
    metricsToMonitor: string[];
    revertTrigger: string;
  };
  status: "NEW" | "REVIEWING" | "APPLIED" | "DISMISSED" | "RESOLVED";
  created_at: string;
}

// ============================================================================
// 9. CONFIDENCE & UNCERTAINTY FRAMEWORK
// ============================================================================

export interface ConfidenceEvaluation {
  aggregateConfidence: number; // 0.0 - 1.0
  tier: "HIGH" | "MEDIUM" | "LOW";
  dimensions: {
    dataQualityScore: number;      // 0.0 - 1.0
    sampleSizeAdequacy: number;    // 0.0 - 1.0
    statisticalCertainty: number;  // 0.0 - 1.0
    baselineReliability: number;   // 0.0 - 1.0
    signalPersistence: number;     // 0.0 - 1.0
    corroborationScore: number;    // 0.0 - 1.0
  };
  uncertaintyFactors: string[];
}

// ============================================================================
// 10. HISTORICAL EVALUATION & BACKTESTING HARNESS
// ============================================================================

export interface LabeledTestCase {
  id: string;
  caseName: string;
  description: string;
  adData: {
    adId: string;
    provider: AdProvider;
    objective: CampaignObjective;
    activeDays: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number | null;
    revenue: number | null;
    currency: string;
    status: AdStatus;
    landingPageHttpStatus?: number;
    rejectionReason?: string;
    attributionLagDays?: number;
  };
  baselineData?: {
    cpa?: number;
    ctr?: number;
    roas?: number;
    sampleSize: number;
  };
  groundTruth: {
    hasGenuineIssue: boolean;
    expectedIssueType?: VerifiedIssueType;
    expectedEvidenceState: EvidenceState;
    isFalseAlarmTrap: boolean; // E.g. brand new ad with 0 conversions
    hasBrokenTracking: boolean;
    hasMissingFinancials: boolean;
  };
}

export interface BacktestEvaluationMetrics {
  totalEvaluatedCases: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;            // TP / (TP + FP)
  recall: number;               // TP / (TP + FN)
  falsePositiveRate: number;    // FP / (FP + TN)
  falseNegativeRate: number;    // FN / (TP + FN)
  f1Score: number;              // 2 * (P * R) / (P + R)
  newAdFalseAlarmRate: number;  // FP on ads < 7 days old
  financialCalculationErrorRate: number; // NaN or invalid math rate
  brierCalibrationScore: number; // Calibration of predicted confidence
  passedAcceptanceCriteria: boolean;
}

// ============================================================================
// 11. STANDARDIZED RESULT LABELS (3 Orthogonal Dimensions)
// ============================================================================

export type EvidenceStatus =
  | "DATA_QUALITY_ISSUE"
  | "INSUFFICIENT_EVIDENCE"
  | "COLLECTING_EVIDENCE"
  | "SUFFICIENT_EVIDENCE";

export type TechnicalStatus =
  | "VERIFIED_TECHNICAL_ISSUE"
  | "NO_VERIFIED_TECHNICAL_ISSUE"
  | "UNKNOWN";

export type PerformanceStatus =
  | "VERIFIED_UNDERPERFORMING"
  | "PERFORMANCE_CONCERN"
  | "HEALTHY_IN_EVALUATED_PERIOD"
  | "MONITOR"
  | "INSUFFICIENT_EVIDENCE";

export interface StandardizedDiagnosisStatus {
  evidenceStatus: EvidenceStatus;
  technicalStatus: TechnicalStatus;
  performanceStatus: PerformanceStatus;
  statusRationale: string;
}

// ============================================================================
// 12. STRUCTURED EVIDENCE RECORD FOR EVERY DIAGNOSIS (Section 6)
// ============================================================================

export interface DiagnosisEvidenceRecord {
  issueId: string;
  issueType: VerifiedIssueType | "NO_ISSUE" | "DATA_QUALITY_ANOMALY";
  adId: string;
  campaignId: string;
  providerId: AdProvider;
  workspaceId: string;
  evaluationWindow: {
    startDate: string;
    endDate: string;
    durationDays: number;
  };
  dataFreshnessHours: number;
  observedMetrics: Record<string, number | string | null | undefined>;
  applicableBaseline?: Record<string, number | string | null | undefined>;
  absoluteChange?: number | null;
  relativeChangeRatio?: number | null;
  minimumEvidenceRequirements: {
    requirement: string;
    met: boolean;
    observedValue: number | string;
    requiredThreshold: number | string;
  }[];
  statisticalUncertainty?: {
    pValue?: number;
    confidenceIntervalWilson95?: [number, number];
    sampleSize: number;
    method: string;
  };
  businessImpactEstimate: {
    status: "ESTIMATED" | "NOT_ESTIMABLE";
    minEstimatedSaving?: number;
    maxEstimatedSaving?: number;
    currency?: string;
    assumptions: string[];
    reasonIfUnestimable?: string;
  };
  confirmedFacts: string[];
  suspectedCauses: {
    hypothesis: string;
    probability: number;
    supportingEvidence: string[];
    counterEvidence: string[];
    additionalDataNeeded: string[];
    recommendedTest: string;
  }[];
  missingInformationAndLimitations: string[];
  recommendedNextAction: string;
  resolutionConditions: {
    confirmationConditions: string[];
    weakeningConditions: string[];
    resolvingConditions: string[];
  };
  calibratedConfidence: {
    score: number;
    tier: "HIGH" | "MEDIUM" | "LOW";
    isCalibrated: boolean;
  };
}

