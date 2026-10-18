import {
  DataValidationEngine,
  CanonicalMetricsEngine,
  AdMaturityEngine,
  PerformanceBaselineEngine,
  StatisticalAnomalyEngine,
  IssueDetectionEngine,
  CauseAnalysisEngine,
  RecommendationEngine,
  ConfidenceUncertaintyEngine,
  AdIntelligenceOrchestrator,
} from "../src/lib/analytics";

describe("Ad Intelligence Engines Integration Tests", () => {
  describe("Engine 1: Data Validation Engine", () => {
    test("accurately flags stale data (>24h since sync)", () => {
      const staleTimestamp = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
      const report = DataValidationEngine.validate({
        adId: "ad-101",
        provider: "META",
        accountId: "acc-101",
        adStatus: "ACTIVE",
        currency: "INR",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        lastSyncTimestamp: staleTimestamp,
        impressions: 5000,
        clicks: 100,
        spend: 1500,
      });

      expect(report.isStale).toBe(true);
      expect(report.syncStalenessHours).toBeGreaterThan(30);
      expect(report.unsupportedConclusions.length).toBeGreaterThan(0);
      expect(report.unsupportedConclusions[0]).toContain("stale");
    });

    test("flags data inconsistency when clicks exceed impressions", () => {
      const report = DataValidationEngine.validate({
        adId: "ad-102",
        provider: "GOOGLE_ADS",
        accountId: "acc-102",
        adStatus: "ACTIVE",
        currency: "INR",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        lastSyncTimestamp: new Date().toISOString(),
        impressions: 50,
        clicks: 200, // Inconsistent
        spend: 1000,
      });

      expect(report.consistencyChecks.clicksExceedImpressions).toBe(true);
      expect(report.consistencyChecks.passed).toBe(false);
      expect(report.isValid).toBe(false);
    });

    test("distinguishes UNAVAILABLE vs ZERO vs DELAYED states", () => {
      const report = DataValidationEngine.validate({
        adId: "ad-103",
        provider: "META",
        accountId: "acc-103",
        adStatus: "ACTIVE",
        currency: "INR",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        lastSyncTimestamp: new Date().toISOString(),
        impressions: 1000,
        clicks: 0, // Explicit zero
        spend: 50,
        conversions: null, // Unavailable
        conversionReportingDelayHours: 48,
      });

      expect(report.metricStates.clicks).toBe("ZERO");
      expect(report.metricStates.conversions).toBe("DELAYED");
      expect(report.metricStates.revenue).toBe("DELAYED");
    });
  });

  describe("Engine 3: Ad Maturity & Evidence Engine", () => {
    test("classifies newly launched ad (< 2 days, low spend) as INSUFFICIENT_DATA", () => {
      const maturity = AdMaturityEngine.evaluate({
        adId: "new-ad-1",
        objective: "PURCHASES",
        activeDeliveryDays: 1,
        totalImpressions: 400,
        totalClicks: 12,
        totalSpend: 350,
        totalConversions: 0,
      });

      expect(maturity.evidenceState).toBe("INSUFFICIENT_DATA");
      expect(maturity.maturityScore).toBeLessThan(0.5);
    });

    test("promotes mature ad with adequate sample to SUFFICIENT_EVIDENCE", () => {
      const maturity = AdMaturityEngine.evaluate({
        adId: "mature-ad-1",
        objective: "PURCHASES",
        activeDeliveryDays: 7,
        totalImpressions: 12000,
        totalClicks: 350,
        totalSpend: 7500,
        totalConversions: 18,
      });

      expect(maturity.evidenceState).toBe("SUFFICIENT_EVIDENCE");
      expect(maturity.maturityScore).toBeGreaterThanOrEqual(0.85);
      expect(maturity.sampleAdequacy.clicksAdequate).toBe(true);
    });

    test("direct technical issue immediately forces VERIFIED_ISSUE regardless of sample size", () => {
      const maturity = AdMaturityEngine.evaluate({
        adId: "broken-new-ad",
        objective: "PURCHASES",
        activeDeliveryDays: 0,
        totalImpressions: 50,
        totalClicks: 3,
        totalSpend: 40,
        totalConversions: 0,
        hasTechnicalException: true,
        technicalExceptionReason: "HTTP 404 Endpoint Not Found",
      });

      expect(maturity.evidenceState).toBe("VERIFIED_ISSUE");
      expect(maturity.hasTechnicalException).toBe(true);
    });
  });

  describe("Engine 6: Verified Issue Detection Engine", () => {
    test("does NOT trigger performance issues on immature ads with zero conversions", () => {
      const dataQuality = DataValidationEngine.validate({
        adId: "ad-new",
        provider: "META",
        accountId: "acc-1",
        adStatus: "ACTIVE",
        currency: "INR",
        startDate: "2026-10-06",
        endDate: "2026-10-07",
        lastSyncTimestamp: new Date().toISOString(),
        impressions: 600,
        clicks: 18,
        spend: 400,
        conversions: 0,
      });

      const maturity = AdMaturityEngine.evaluate({
        adId: "ad-new",
        objective: "PURCHASES",
        activeDeliveryDays: 1,
        totalImpressions: 600,
        totalClicks: 18,
        totalSpend: 400,
        totalConversions: 0,
      });

      const baseline = PerformanceBaselineEngine.generateBaseline({
        id: "base-1",
        workspaceId: "ws-1",
        scope: "AD",
        objective: "PURCHASES",
        currency: "INR",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        history: [],
        configuredTargetCpa: 250,
      });

      const anomalies = StatisticalAnomalyEngine.analyze({
        adId: "ad-new",
        testDate: "2026-10-07",
        observed: {
          impressions: 600,
          clicks: 18,
          spend: 400,
          conversions: 0,
          revenue: 0,
        },
        baseline,
      });

      const issues = IssueDetectionEngine.detectIssues({
        workspaceId: "ws-1",
        providerId: "META",
        accountId: "acc-1",
        adId: "ad-new",
        adName: "Summer Sale New Ad",
        dataQuality,
        maturity,
        baseline,
        anomalies,
        observedMetrics: { impressions: 600, clicks: 18, spend: 400, conversions: 0 },
        reportingPeriod: { startDate: "2026-10-06", endDate: "2026-10-07" },
      });

      // Crucial: 0 false alarms on new ads!
      expect(issues.length).toBe(0);
    });

    test("flags confirmed landing page 404 as VERIFIED_TECHNICAL_ISSUE with CRITICAL severity", () => {
      const dataQuality = DataValidationEngine.validate({
        adId: "ad-lp-fail",
        provider: "GOOGLE_ADS",
        accountId: "acc-1",
        adStatus: "ACTIVE",
        currency: "INR",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        lastSyncTimestamp: new Date().toISOString(),
        impressions: 2000,
        clicks: 80,
        spend: 2500,
      });

      const maturity = AdMaturityEngine.evaluate({
        adId: "ad-lp-fail",
        objective: "TRAFFIC",
        activeDeliveryDays: 2,
        totalImpressions: 2000,
        totalClicks: 80,
        totalSpend: 2500,
        totalConversions: null,
        hasTechnicalException: true,
      });

      const baseline = PerformanceBaselineEngine.generateBaseline({
        id: "base-1",
        workspaceId: "ws-1",
        scope: "AD",
        objective: "TRAFFIC",
        currency: "INR",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        history: [],
      });

      const issues = IssueDetectionEngine.detectIssues({
        workspaceId: "ws-1",
        providerId: "GOOGLE_ADS",
        accountId: "acc-1",
        adId: "ad-lp-fail",
        adName: "Search Brand Lead",
        dataQuality,
        maturity,
        baseline,
        anomalies: { adId: "ad-lp-fail", testDate: "2026-10-07" },
        technicalSignals: { landingPageHttpStatus: 404, landingPageResponseMs: 120 },
        observedMetrics: { spend: 2500, clicks: 80 },
        reportingPeriod: { startDate: "2026-10-01", endDate: "2026-10-07" },
      });

      expect(issues.length).toBe(1);
      expect(issues[0].evidence_state).toBe("VERIFIED_TECHNICAL_ISSUE");
      expect(issues[0].severity).toBe("CRITICAL");
      expect(issues[0].issue_type).toBe("LANDING_PAGE_ERROR_404_OR_TIMEOUT");
      expect(issues[0].confidence_level).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe("End-to-End AdIntelligenceOrchestrator Pipeline", () => {
    test("runs all 10 engines cohesively for a mature ad experiencing severe CPA breach", () => {
      const result = AdIntelligenceOrchestrator.processAd({
        ad: {
          id: "ad-e2e-breach",
          name: "Retargeting Cart Abandoners",
          externalId: "ext-123",
          provider: "META",
          status: "ACTIVE",
        },
        campaign: {
          id: "camp-1",
          name: "Direct Response Retargeting",
          objective: "PURCHASES",
        },
        account: {
          id: "acc-1",
          externalId: "act-999",
          currency: "INR",
        },
        workspaceId: "ws-test",
        currentMetrics: {
          impressions: 8000,
          clicks: 220,
          spend: 6600,
          conversions: 3,
          revenue: 7200,
        },
        activeDeliveryDays: 6,
        lastSyncTimestamp: new Date().toISOString(),
        reportingDateRange: {
          startDate: "2026-10-01",
          endDate: "2026-10-07",
        },
        historicalPoints: [
          { date: "2026-09-20", cpa: 450, ctr: 3.5, roas: 3.2 },
          { date: "2026-09-21", cpa: 480, ctr: 3.4, roas: 3.0 },
          { date: "2026-09-22", cpa: 460, ctr: 3.6, roas: 3.1 },
          { date: "2026-09-23", cpa: 490, ctr: 3.3, roas: 2.9 },
          { date: "2026-09-24", cpa: 470, ctr: 3.5, roas: 3.0 },
          { date: "2026-09-25", cpa: 465, ctr: 3.5, roas: 3.1 },
        ],
        configuredTargets: {
          targetCpa: 500, // Target is ₹500, actual CPA is ₹6600 / 3 = ₹2200 (over 4x higher!)
        },
      });

      expect(result.dataQuality.isValid).toBe(true);
      expect(result.canonicalMetrics.derived.cpa.value).toBe(2200);
      expect(result.maturity.evidenceState).toBe("SUFFICIENT_EVIDENCE");
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].issue_type).toBe("COST_PER_ACQUISITION_SEVERE_TARGET_BREACH");
      expect(result.causeAnalysis).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation?.expected_direction_of_impact).toBe("REDUCE_WASTED_SPEND");
      expect(result.recommendation?.defensible_impact_range.hasDefensibleRange).toBe(true);
      expect(result.confidence.aggregateConfidence).toBeGreaterThan(0.75);
    });
  });
});
