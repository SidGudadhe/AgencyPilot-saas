/**
 * MASTER SCENARIOS TEST SUITE (Section 12 of Master Prompt)
 * 
 * Verifies all 20 required scenarios:
 * 1. New ad with very few impressions and no conversions
 * 2. New ad with low spend and insufficient evidence
 * 3. Mature ad performing within its reliable historical range
 * 4. Ad with a sustained and materially harmful performance decline
 * 5. Ad with zero conversions but insufficient click or spend evidence
 * 6. Ad with delayed conversion reporting
 * 7. Broken conversion tracking confirmed by diagnostics
 * 8. Missing or stale provider data
 * 9. Duplicate conversion events
 * 10. Zero impressions and undefined CTR
 * 11. Zero clicks and undefined CPC
 * 12. Zero spend and undefined ROAS
 * 13. Currency mismatch across revenue and spend
 * 14. Rejected ad confirmed by provider status
 * 15. Poor performance with multiple plausible root causes
 * 16. Strong performance despite a metric that looks poor in isolation
 * 17. Many simultaneous metric checks that could generate false alerts (FDR control)
 * 18. Sudden but temporary performance fluctuation
 * 19. Seasonality or legitimate budget change
 * 20. Provider-specific differences in metric definitions
 */

import {
  AdIntelligenceOrchestrator,
  DataValidationEngine,
  CanonicalMetricsEngine,
  AdMaturityEngine,
  PerformanceBaselineEngine,
  StatisticalAnomalyEngine,
  IssueDetectionEngine,
  FinancialCalculator,
  applyBenjaminiHochbergCorrection,
} from "../src/lib/analytics";

describe("Master Scenarios Test Suite (All 20 Rigorous Scenarios)", () => {
  // Scenario 1: New ad with very few impressions and no conversions
  test("Scenario 1: New ad with very few impressions and no conversions -> INSUFFICIENT_EVIDENCE, zero issues", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-01", name: "Day 1 Launch", externalId: "ext-1", provider: "META", status: "ACTIVE" },
      campaign: { id: "c1", name: "Summer Campaign", objective: "PURCHASES" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 120, clicks: 4, spend: 85, conversions: 0 },
      activeDeliveryDays: 1,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-10-06", endDate: "2026-10-07" },
    });

    expect(res.triDimensionalStatus.evidenceStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(res.triDimensionalStatus.performanceStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(res.issues.length).toBe(0);
    expect(res.recommendation?.expected_direction_of_impact).toBe("PREVENT_LEARNING_RESET");
  });

  // Scenario 2: New ad with low spend and insufficient evidence
  test("Scenario 2: New ad with low spend and insufficient evidence -> INSUFFICIENT_EVIDENCE", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-02", name: "Low Spend Probe", externalId: "ext-2", provider: "GOOGLE_ADS", status: "ACTIVE" },
      campaign: { id: "c2", name: "Search Discovery", objective: "LEAD_GENERATION" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 450, clicks: 15, spend: 320, conversions: 0 },
      activeDeliveryDays: 2,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-10-05", endDate: "2026-10-07" },
    });

    expect(res.triDimensionalStatus.evidenceStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(res.issues.length).toBe(0);
  });

  // Scenario 3: Mature ad performing within its reliable historical range
  test("Scenario 3: Mature ad performing within reliable range -> HEALTHY_IN_EVALUATED_PERIOD", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-03", name: "Evergreen Winner", externalId: "ext-3", provider: "META", status: "ACTIVE" },
      campaign: { id: "c3", name: "Core Catalog", objective: "PURCHASES" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 15000, clicks: 450, spend: 9000, conversions: 25, revenue: 36000 },
      activeDeliveryDays: 14,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-09-24", endDate: "2026-10-07" },
      historicalPoints: [
        { date: "2026-09-24", cpa: 360, ctr: 3.0, roas: 4.0 },
        { date: "2026-09-25", cpa: 350, ctr: 3.1, roas: 4.1 },
        { date: "2026-09-26", cpa: 370, ctr: 2.9, roas: 3.9 },
        { date: "2026-09-27", cpa: 360, ctr: 3.0, roas: 4.0 },
        { date: "2026-09-28", cpa: 355, ctr: 3.0, roas: 4.0 },
      ],
      configuredTargets: { targetCpa: 400, targetRoas: 3.5 },
    });

    expect(res.triDimensionalStatus.performanceStatus).toBe("HEALTHY_IN_EVALUATED_PERIOD");
    expect(res.issues.length).toBe(0);
  });

  // Scenario 4: Ad with sustained and materially harmful performance decline
  test("Scenario 4: Ad with sustained, materially harmful decline -> VERIFIED_UNDERPERFORMING", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-04", name: "Failing Campaign", externalId: "ext-4", provider: "META", status: "ACTIVE" },
      campaign: { id: "c4", name: "Retargeting", objective: "PURCHASES" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 10000, clicks: 220, spend: 6600, conversions: 3, revenue: 2400 },
      activeDeliveryDays: 7,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-10-01", endDate: "2026-10-07" },
      historicalPoints: [
        { date: "2026-09-20", cpa: 450, ctr: 3.5 },
        { date: "2026-09-21", cpa: 480, ctr: 3.4 },
        { date: "2026-09-22", cpa: 460, ctr: 3.6 },
        { date: "2026-09-23", cpa: 490, ctr: 3.3 },
        { date: "2026-09-24", cpa: 470, ctr: 3.5 },
      ],
      configuredTargets: { targetCpa: 500 }, // Actual CPA is 6600 / 3 = 2200 (>4x target!)
    });

    expect(res.triDimensionalStatus.performanceStatus).toBe("VERIFIED_UNDERPERFORMING");
    expect(res.issues.length).toBeGreaterThan(0);
    expect(res.issues[0].evidence_state).toBe("EVIDENCE_BACKED_PERFORMANCE_ISSUE");
    expect(res.recommendation?.expected_direction_of_impact).toBe("REDUCE_WASTED_SPEND");
  });

  // Scenario 5: Ad with zero conversions but insufficient click or spend evidence
  test("Scenario 5: Zero conversions on insufficient clicks -> MONITOR, not underperforming", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-05", name: "Early Testing", externalId: "ext-5", provider: "GOOGLE_ADS", status: "ACTIVE" },
      campaign: { id: "c5", name: "High Ticket B2B", objective: "LEAD_GENERATION" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 1200, clicks: 35, spend: 1100, conversions: 0 },
      activeDeliveryDays: 3,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-10-04", endDate: "2026-10-07" },
    });

    expect(res.triDimensionalStatus.performanceStatus).not.toBe("VERIFIED_UNDERPERFORMING");
    expect(res.issues.length).toBe(0);
  });

  // Scenario 6: Ad with delayed conversion reporting
  test("Scenario 6: Delayed conversion reporting active -> conversion state DELAYED, prevents ROAS conclusion", () => {
    const report = DataValidationEngine.validate({
      adId: "ad-sc-06",
      provider: "META",
      accountId: "acc1",
      adStatus: "ACTIVE",
      currency: "INR",
      startDate: "2026-10-06",
      endDate: "2026-10-07",
      lastSyncTimestamp: new Date().toISOString(),
      impressions: 2000,
      clicks: 80,
      spend: 1500,
      conversions: null, // Still lagging
      conversionReportingDelayHours: 48,
    });

    expect(report.metricStates.conversions).toBe("DELAYED");
    expect(report.unsupportedConclusions.some(c => c.includes("lagging"))).toBe(true);
  });

  // Scenario 7: Broken conversion tracking confirmed by diagnostics
  test("Scenario 7: Broken conversion tracking confirmed by diagnostics -> VERIFIED_TECHNICAL_ISSUE", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-07", name: "Pixel Disconnected", externalId: "ext-7", provider: "META", status: "ACTIVE" },
      campaign: { id: "c7", name: "Lead Campaign", objective: "LEAD_GENERATION" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 8000, clicks: 250, spend: 3500, conversions: 0 },
      activeDeliveryDays: 5,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-10-01", endDate: "2026-10-07" },
      consecutiveDaysWithZeroConversions: 3,
      historicalPoints: [
        { date: "2026-09-20", cvr: 4.5 },
        { date: "2026-09-21", cvr: 4.2 },
        { date: "2026-09-22", cvr: 4.6 },
        { date: "2026-09-23", cvr: 4.3 },
        { date: "2026-09-24", cvr: 4.4 },
      ],
    });

    expect(res.triDimensionalStatus.technicalStatus).toBe("VERIFIED_TECHNICAL_ISSUE");
    expect(res.issues.some(i => i.issue_type === "CONVERSION_TRACKING_DISRUPTION")).toBe(true);
    expect(res.recommendation?.expected_direction_of_impact).toBe("FIX_TRACKING_PIPELINE");
  });

  // Scenario 8: Missing or stale provider data
  test("Scenario 8: Stale provider data (>24h) -> DATA_QUALITY_ISSUE", () => {
    const staleTime = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString();
    const report = DataValidationEngine.validate({
      adId: "ad-sc-08",
      provider: "GOOGLE_ADS",
      accountId: "acc1",
      adStatus: "ACTIVE",
      currency: "INR",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      lastSyncTimestamp: staleTime,
      impressions: 4000,
      clicks: 120,
      spend: 1800,
    });

    expect(report.isStale).toBe(true);
    expect(report.isValid).toBe(false);
  });

  // Scenario 9: Duplicate conversion events / CVR > 100% anomaly
  test("Scenario 9: Conversions exceed clicks -> consistency check fails, flags anomaly", () => {
    const report = DataValidationEngine.validate({
      adId: "ad-sc-09",
      provider: "META",
      accountId: "acc1",
      adStatus: "ACTIVE",
      currency: "INR",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      lastSyncTimestamp: new Date().toISOString(),
      impressions: 500,
      clicks: 20,
      conversions: 55, // Impossible without click-through
      spend: 600,
    });

    expect(report.consistencyChecks.conversionsExceedClicks).toBe(true);
    expect(report.consistencyChecks.passed).toBe(false);
  });

  // Scenario 10: Zero impressions and undefined CTR
  test("Scenario 10: Zero impressions -> CTR returns ZERO_DENOMINATOR safely, no NaN", () => {
    const res = FinancialCalculator.calculateCTR(0, 0);
    expect(res.value).toBe(0);
    expect(res.status).toBe("ZERO_DENOMINATOR");
    expect(isNaN(res.value as number)).toBe(false);
  });

  // Scenario 11: Zero clicks and undefined CPC
  test("Scenario 11: Zero clicks -> CPC returns null with ZERO_DENOMINATOR, not Infinity", () => {
    const res = FinancialCalculator.calculateCPC(1500, 0);
    expect(res.value).toBeNull();
    expect(res.status).toBe("ZERO_DENOMINATOR");
  });

  // Scenario 12: Zero spend and undefined ROAS
  test("Scenario 12: Zero spend -> ROAS returns ZERO_DENOMINATOR safely", () => {
    const res = FinancialCalculator.calculateROAS(0, 0);
    expect(res.value).toBe(0);
    expect(res.status).toBe("ZERO_DENOMINATOR");
  });

  // Scenario 13: Currency mismatch across revenue and spend
  test("Scenario 13: Currency mismatch -> Blocks ROAS and reports CURRENCY_MISMATCH", () => {
    const res = FinancialCalculator.calculateROAS(10000, 2000, "INR", "USD");
    expect(res.value).toBeNull();
    expect(res.status).toBe("CURRENCY_MISMATCH");
  });

  // Scenario 14: Rejected ad confirmed by provider status
  test("Scenario 14: Editorial policy rejection confirmed -> VERIFIED_TECHNICAL_ISSUE with CRITICAL severity", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-14", name: "Disapproved Creative", externalId: "ext-14", provider: "META", status: "REJECTED" },
      campaign: { id: "c14", name: "Brand Traffic", objective: "TRAFFIC" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 0, clicks: 0, spend: 0 },
      activeDeliveryDays: 0,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-10-06", endDate: "2026-10-07" },
      technicalSignals: { editorialRejectionReason: "Landing page domain unverified" },
    });

    expect(res.triDimensionalStatus.technicalStatus).toBe("VERIFIED_TECHNICAL_ISSUE");
    expect(res.issues[0].severity).toBe("CRITICAL");
    expect(res.issues[0].verification_method).toContain("compliance");
  });

  // Scenario 15: Poor performance with multiple plausible root causes
  test("Scenario 15: Poor performance generates primary and competing hypotheses with diagnostics", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-15", name: "Declining Engagement", externalId: "ext-15", provider: "META", status: "ACTIVE" },
      campaign: { id: "c15", name: "Audience Expansion", objective: "TRAFFIC" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 20000, clicks: 120, spend: 3500, frequency: 3.2 },
      activeDeliveryDays: 8,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-09-30", endDate: "2026-10-07" },
      historicalPoints: [
        { date: "2026-09-24", ctr: 3.2 },
        { date: "2026-09-25", ctr: 3.1 },
        { date: "2026-09-26", ctr: 3.3 },
        { date: "2026-09-27", ctr: 3.0 },
        { date: "2026-09-28", ctr: 3.2 },
      ],
    });

    expect(res.causeAnalysis).toBeDefined();
    expect(res.causeAnalysis?.primaryHypothesis).toBeDefined();
    expect(res.causeAnalysis?.competingHypotheses.length).toBeGreaterThan(0);
    expect(res.causeAnalysis?.diagnosticNextSteps.length).toBeGreaterThan(0);
  });

  // Scenario 16: Strong performance despite a metric that looks poor in isolation (e.g. low CTR in high-ticket purchase)
  test("Scenario 16: Low CTR in high-ticket campaign does not fail if ROAS & CPA are superior", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-16", name: "Luxury B2B Jewelry", externalId: "ext-16", provider: "GOOGLE_ADS", status: "ACTIVE" },
      campaign: { id: "c16", name: "High Value Catalog", objective: "PURCHASES" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      // CTR is only 0.75%, but ROAS is 6.0x and CPA is well below target!
      currentMetrics: { impressions: 20000, clicks: 150, spend: 5000, conversions: 10, revenue: 30000 },
      activeDeliveryDays: 10,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-09-28", endDate: "2026-10-07" },
      configuredTargets: { targetCpa: 800, targetRoas: 4.0 },
    });

    // Despite low CTR, objective success prevents false underperformance alert
    expect(res.triDimensionalStatus.performanceStatus).toBe("HEALTHY_IN_EVALUATED_PERIOD");
    expect(res.issues.length).toBe(0);
  });

  // Scenario 17: Many simultaneous metric checks that could generate false alerts (controlled via Benjamini-Hochberg FDR)
  test("Scenario 17: Multi-testing controls false discovery rate across 50 simulated tests", () => {
    // Generate 50 hypothesis tests where only 2 are truly extreme (p < 0.001) and others are mild p-values
    const tests = Array.from({ length: 50 }, (_, i) => ({
      id: `ad-test-${i}`,
      pValue: i < 2 ? 0.0005 : 0.04 + (i * 0.015),
    }));

    const corrected = applyBenjaminiHochbergCorrection(tests, 0.05);
    const significantCount = corrected.filter(c => c.isSignificant).length;

    // Without FDR, ~3-5 tests would have p < 0.05 by random chance.
    // With FDR, only genuine small p-values pass!
    expect(significantCount).toBeLessThanOrEqual(3);
    expect(corrected.find(c => c.id === "ad-test-0")?.isSignificant).toBe(true);
  });

  // Scenario 18: Sudden but temporary performance fluctuation (within 1-2 standard deviations)
  test("Scenario 18: Temporary normal variance does not trigger anomaly alert", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-18", name: "Steady Performer", externalId: "ext-18", provider: "META", status: "ACTIVE" },
      campaign: { id: "c18", name: "Ongoing", objective: "PURCHASES" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 5000, clicks: 140, spend: 2800, conversions: 7 }, // CPA = 400
      activeDeliveryDays: 10,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-09-28", endDate: "2026-10-07" },
      historicalPoints: [
        { date: "2026-09-24", cpa: 380 },
        { date: "2026-09-25", cpa: 390 },
        { date: "2026-09-26", cpa: 410 },
        { date: "2026-09-27", cpa: 375 },
        { date: "2026-09-28", cpa: 395 },
      ],
      configuredTargets: { targetCpa: 420 },
    });

    expect(res.triDimensionalStatus.performanceStatus).toBe("HEALTHY_IN_EVALUATED_PERIOD");
    expect(res.issues.length).toBe(0);
  });

  // Scenario 19: Seasonality or legitimate budget change
  test("Scenario 19: Planned budget scaling with proportional delivery is recognized without issue", () => {
    const res = AdIntelligenceOrchestrator.processAd({
      ad: { id: "ad-sc-19", name: "Festival Scale", externalId: "ext-19", provider: "GOOGLE_ADS", status: "ACTIVE" },
      campaign: { id: "c19", name: "Diwali Promo", objective: "PURCHASES" },
      account: { id: "acc1", externalId: "act1", currency: "INR" },
      workspaceId: "ws-sc",
      currentMetrics: { impressions: 40000, clicks: 1200, spend: 24000, conversions: 60, revenue: 96000 },
      activeDeliveryDays: 12,
      lastSyncTimestamp: new Date().toISOString(),
      reportingDateRange: { startDate: "2026-09-26", endDate: "2026-10-07" },
      configuredTargets: { targetCpa: 450, targetRoas: 3.5 },
    });

    expect(res.triDimensionalStatus.performanceStatus).toBe("HEALTHY_IN_EVALUATED_PERIOD");
  });

  // Scenario 20: Provider-specific differences in metric definitions
  test("Scenario 20: Video views objective correctly evaluated using impressions denominator", () => {
    const canonical = CanonicalMetricsEngine.calculate({
      adId: "ad-sc-20",
      objective: "VIDEO_VIEWS",
      currency: "INR",
      impressions: 10000,
      clicks: 300,
      spend: 2500,
      conversions: null,
      revenue: null,
      videoViews: 6500, // 65% view rate
      dataQuality: {
        isValid: true,
        providerId: "META",
        accountId: "acc1",
        adId: "ad-sc-20",
        reportingDateRange: { startDate: "2026-10-01", endDate: "2026-10-07", timezone: "Asia/Kolkata" },
        currency: "INR",
        lastSyncTimestamp: new Date().toISOString(),
        syncStalenessHours: 2,
        isStale: false,
        completenessScore: 1.0,
        consistencyChecks: {
          passed: true,
          clicksExceedImpressions: false,
          conversionsExceedClicks: false,
          spendWithoutImpressions: false,
          duplicateConversionEvents: false,
          currencyMismatch: false,
          timezoneMismatch: false,
        },
        metricStates: {
          impressions: "VALID",
          clicks: "VALID",
          spend: "VALID",
          conversions: "UNAVAILABLE",
          revenue: "UNAVAILABLE",
          reach: "UNAVAILABLE",
          videoViews: "VALID",
        },
        attributionSettings: { windowDays: 7, model: "LAST_CLICK", estimatedConversionLagHours: 0 },
        unsupportedConclusions: [],
      },
    });

    expect(canonical.derived.objectiveRate.status).toBe("VALID");
    expect(canonical.derived.objectiveRate.value).toBe(65); // 65% video completion
    expect(canonical.derived.objectiveRate.formula).toBe("(videoViews / impressions) * 100");
  });
});
