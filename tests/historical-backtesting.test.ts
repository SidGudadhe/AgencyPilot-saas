import { HistoricalEvaluationEngine } from "../src/lib/analytics/engines/historical-evaluation-engine";
import { LabeledTestCase } from "../src/lib/analytics/types/intelligence";

export const BENCHMARK_TEST_SUITE: LabeledTestCase[] = [
  // 1. False Alarm Trap: Brand new ad, day 1, zero conversions
  {
    id: "CASE-01-NEW-AD-CALIBRATION",
    caseName: "Brand New Ad Calibration Trap",
    description: "New ad launched yesterday. Has 12 clicks, 0 conversions, ₹240 spend. Must NOT trigger false alarm.",
    adData: {
      adId: "ad-bench-01",
      provider: "META",
      objective: "PURCHASES",
      activeDays: 1,
      spend: 240,
      impressions: 450,
      clicks: 12,
      conversions: 0,
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 400, sampleSize: 10 },
    groundTruth: {
      hasGenuineIssue: false,
      expectedEvidenceState: "INSUFFICIENT_DATA",
      isFalseAlarmTrap: true,
      hasBrokenTracking: false,
      hasMissingFinancials: true,
    },
  },

  // 2. False Alarm Trap: New ad day 2, 40 clicks, 0 conversions (still learning)
  {
    id: "CASE-02-NEW-AD-LEARNING",
    caseName: "New Ad Learning Phase Trap",
    description: "Ad on day 2 with ₹800 spend and 0 conversions. Still in learning phase.",
    adData: {
      adId: "ad-bench-02",
      provider: "GOOGLE_ADS",
      objective: "LEAD_GENERATION",
      activeDays: 2,
      spend: 800,
      impressions: 1100,
      clicks: 40,
      conversions: 0,
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 300, sampleSize: 14 },
    groundTruth: {
      hasGenuineIssue: false,
      expectedEvidenceState: "COLLECTING_EVIDENCE",
      isFalseAlarmTrap: true,
      hasBrokenTracking: false,
      hasMissingFinancials: true,
    },
  },

  // 3. Verified Technical Issue: Day 1 ad with HTTP 404 broken landing page
  {
    id: "CASE-03-TECH-LP-404",
    caseName: "Broken Landing Page 404",
    description: "Brand new ad whose landing page URL returns 404 Not Found. Must alert immediately!",
    adData: {
      adId: "ad-bench-03",
      provider: "META",
      objective: "PURCHASES",
      activeDays: 1,
      spend: 150,
      impressions: 300,
      clicks: 8,
      conversions: 0,
      revenue: 0,
      currency: "INR",
      status: "ACTIVE",
      landingPageHttpStatus: 404,
    },
    baselineData: { cpa: 400, sampleSize: 7 },
    groundTruth: {
      hasGenuineIssue: true,
      expectedIssueType: "LANDING_PAGE_ERROR_404_OR_TIMEOUT",
      expectedEvidenceState: "VERIFIED_ISSUE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: false,
    },
  },

  // 4. Verified Technical Issue: Editorial Policy Rejection
  {
    id: "CASE-04-POLICY-REJECTED",
    caseName: "Editorial Policy Rejection",
    description: "Ad disapproved by advertising platform due to policy violation.",
    adData: {
      adId: "ad-bench-04",
      provider: "META",
      objective: "TRAFFIC",
      activeDays: 0,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      currency: "INR",
      status: "REJECTED",
      rejectionReason: "Misleading claims in creative copy",
    },
    groundTruth: {
      hasGenuineIssue: true,
      expectedIssueType: "EDITORIAL_POLICY_REJECTION",
      expectedEvidenceState: "VERIFIED_ISSUE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: false,
    },
  },

  // 5. Tracking Disruption: 180 clicks, zero conversions, historical CVR 4%
  {
    id: "CASE-05-TRACKING-DISRUPTION",
    caseName: "Broken Conversion Tag Event Pipeline",
    description: "Mature ad generating 180 clicks with 0 conversions across 3 days. Exact binomial probability < 0.1%.",
    adData: {
      adId: "ad-bench-05",
      provider: "GOOGLE_ADS",
      objective: "PURCHASES",
      activeDays: 5,
      spend: 4500,
      impressions: 5000,
      clicks: 180,
      conversions: 0,
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 350, sampleSize: 15 },
    groundTruth: {
      hasGenuineIssue: true,
      expectedIssueType: "CONVERSION_TRACKING_DISRUPTION",
      expectedEvidenceState: "VERIFIED_ISSUE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: true,
      hasMissingFinancials: true,
    },
  },

  // 6. Evidence-Backed Performance Issue: High Spend, Zero Conversions past maturity
  {
    id: "CASE-06-CAPITAL-WASTE",
    caseName: "Unvalidated Capital Expenditure",
    description: "Mature ad active for 6 days has consumed ₹5,800 with 0 conversions.",
    adData: {
      adId: "ad-bench-06",
      provider: "META",
      objective: "PURCHASES",
      activeDays: 6,
      spend: 5800,
      impressions: 11000,
      clicks: 240,
      conversions: 0,
      revenue: 0,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 450, sampleSize: 12 },
    groundTruth: {
      hasGenuineIssue: true,
      expectedIssueType: "UNVALIDATED_CAPITAL_EXPENDITURE",
      expectedEvidenceState: "SUFFICIENT_EVIDENCE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: false,
    },
  },

  // 7. Evidence-Backed Performance Issue: Severe CPA Target Breach
  {
    id: "CASE-07-CPA-BREACH",
    caseName: "Severe CPA Target Breach",
    description: "Mature ad target CPA is ₹300, actual CPA is ₹950 across 6 conversions.",
    adData: {
      adId: "ad-bench-07",
      provider: "GOOGLE_ADS",
      objective: "LEAD_GENERATION",
      activeDays: 7,
      spend: 5700,
      impressions: 8000,
      clicks: 190,
      conversions: 6, // CPA = 5700 / 6 = 950 (over 3x target)
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 300, sampleSize: 20 },
    groundTruth: {
      hasGenuineIssue: true,
      expectedIssueType: "COST_PER_ACQUISITION_SEVERE_TARGET_BREACH",
      expectedEvidenceState: "SUFFICIENT_EVIDENCE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: true,
    },
  },

  // 8. Healthy Mature Ad: Strong Performance
  {
    id: "CASE-08-HEALTHY-PERFORMANCE",
    caseName: "High Performing Stable Ad",
    description: "Mature ad delivering strong ROAS and steady CPA below target. Must NOT trigger any issues.",
    adData: {
      adId: "ad-bench-08",
      provider: "META",
      objective: "PURCHASES",
      activeDays: 14,
      spend: 8500,
      impressions: 22000,
      clicks: 580,
      conversions: 24, // CPA = 354
      revenue: 34000, // ROAS = 4.0
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 400, ctr: 2.5, roas: 3.2, sampleSize: 25 },
    groundTruth: {
      hasGenuineIssue: false,
      expectedEvidenceState: "SUFFICIENT_EVIDENCE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: false,
    },
  },

  // 9. Healthy Awareness Campaign: High Reach, Zero Conversions (Normal by design)
  {
    id: "CASE-09-AWARENESS-CAMPAIGN",
    caseName: "Awareness Campaign Normal Zero Conversions",
    description: "Awareness objective ad. 0 conversions is expected. Should not be flagged as an issue.",
    adData: {
      adId: "ad-bench-09",
      provider: "META",
      objective: "AWARENESS",
      activeDays: 5,
      spend: 1200,
      impressions: 15000,
      clicks: 80,
      conversions: 0,
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { ctr: 0.5, sampleSize: 10 },
    groundTruth: {
      hasGenuineIssue: false,
      expectedEvidenceState: "SUFFICIENT_EVIDENCE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: true,
    },
  },

  // 10. Sparse Conversions: Small sample normal variance
  {
    id: "CASE-10-SPARSE-CONVERSIONS",
    caseName: "Sparse Conversion Normal Variance",
    description: "1 conversion on 25 clicks. Expected rate is 4%. Statistical variance, not an issue.",
    adData: {
      adId: "ad-bench-10",
      provider: "GOOGLE_ADS",
      objective: "LEAD_GENERATION",
      activeDays: 3,
      spend: 600,
      impressions: 900,
      clicks: 25,
      conversions: 1,
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 500, sampleSize: 10 },
    groundTruth: {
      hasGenuineIssue: false,
      expectedEvidenceState: "COLLECTING_EVIDENCE",
      isFalseAlarmTrap: true,
      hasBrokenTracking: false,
      hasMissingFinancials: true,
    },
  },

  // 11. Normal Mature Ad within Standard Deviation
  {
    id: "CASE-11-NORMAL-DEVIATION",
    caseName: "Normal Variance Within 1 Standard Deviation",
    description: "CPA is ₹420 vs baseline ₹400 (+5%). Completely normal fluctuation.",
    adData: {
      adId: "ad-bench-11",
      provider: "META",
      objective: "PURCHASES",
      activeDays: 10,
      spend: 4200,
      impressions: 10000,
      clicks: 260,
      conversions: 10,
      revenue: 12600,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { cpa: 400, sampleSize: 15 },
    groundTruth: {
      hasGenuineIssue: false,
      expectedEvidenceState: "SUFFICIENT_EVIDENCE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: false,
    },
  },

  // 12. Significant CTR Collapse (4% down to 1.2% with high sample)
  {
    id: "CASE-12-CTR-COLLAPSE",
    caseName: "Severe CTR Collapse Anomaly",
    description: "Mature ad CTR collapsed from 4.0% to 1.2% across 3,000 impressions with p < 0.001.",
    adData: {
      adId: "ad-bench-12",
      provider: "META",
      objective: "TRAFFIC",
      activeDays: 8,
      spend: 3200,
      impressions: 3000,
      clicks: 36, // 1.2% CTR vs 4.0% baseline
      conversions: 2,
      revenue: null,
      currency: "INR",
      status: "ACTIVE",
    },
    baselineData: { ctr: 4.0, sampleSize: 20 },
    groundTruth: {
      hasGenuineIssue: true,
      expectedIssueType: "CLICK_THROUGH_SIGNIFICANT_COLLAPSE",
      expectedEvidenceState: "SUFFICIENT_EVIDENCE",
      isFalseAlarmTrap: false,
      hasBrokenTracking: false,
      hasMissingFinancials: true,
    },
  },
];

describe("Engine 10: Historical Evaluation & Backtesting Benchmark", () => {
  test("passes all historical benchmark criteria with zero false alarms on new ads", () => {
    const report = HistoricalEvaluationEngine.evaluateBenchmarkSuite(BENCHMARK_TEST_SUITE);

    console.log("=== HISTORICAL BACKTESTING BENCHMARK REPORT ===");
    console.log(`Total Cases: ${report.totalEvaluatedCases}`);
    console.log(`Precision: ${(report.precision * 100).toFixed(1)}%`);
    console.log(`Recall: ${(report.recall * 100).toFixed(1)}%`);
    console.log(`False Positive Rate: ${(report.falsePositiveRate * 100).toFixed(1)}%`);
    console.log(`False Negative Rate: ${(report.falseNegativeRate * 100).toFixed(1)}%`);
    console.log(`F1 Score: ${(report.f1Score * 100).toFixed(1)}%`);
    console.log(`New Ad False Alarm Rate: ${(report.newAdFalseAlarmRate * 100).toFixed(2)}%`);
    console.log(`Financial Math Error Rate: ${(report.financialCalculationErrorRate * 100).toFixed(2)}%`);
    console.log(`Brier Calibration Score: ${report.brierCalibrationScore.toFixed(4)}`);
    console.log(`Passed Acceptance Criteria: ${report.passedAcceptanceCriteria}`);

    // Verify key guarantees
    expect(report.newAdFalseAlarmRate).toBe(0.0);
    expect(report.financialCalculationErrorRate).toBe(0.0);
    expect(report.precision).toBeGreaterThanOrEqual(0.85);
    expect(report.recall).toBeGreaterThanOrEqual(0.80);
    expect(report.falsePositiveRate).toBeLessThanOrEqual(0.10);
    expect(report.passedAcceptanceCriteria).toBe(true);
  });
});
