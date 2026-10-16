import { diagnoseAd } from "../src/lib/analytics/anomaly-detector";

describe("Needs Attention Anomaly Detector", () => {
  it("should flag an ad with CRITICAL severity if rejected by provider", () => {
    const report = diagnoseAd({
      id: "ad-1",
      name: "Diwali Promo Video",
      provider: "META",
      campaignName: "Festive Sale 2026",
      status: "REJECTED",
      currentSpend: 0,
      currentConversions: 0,
      currentClicks: 0,
      currentImpressions: 0,
      rejectionReason: "Landing page policy violation",
    });

    expect(report).not.toBeNull();
    expect(report?.severity).toBe("CRITICAL");
    expect(report?.problemDetected).toContain("Ad Rejected");
    expect(report?.confidence).toBe("HIGH");
  });

  it("should flag CRITICAL when ad spends >= ₹2,500 with zero conversions and >= 50 clicks", () => {
    const report = diagnoseAd({
      id: "ad-2",
      name: "Search High Intent Keywords",
      provider: "GOOGLE_ADS",
      campaignName: "Lead Generation",
      status: "ACTIVE",
      currentSpend: 3200,
      currentConversions: 0,
      currentClicks: 65,
      currentImpressions: 1200,
    });

    expect(report).not.toBeNull();
    expect(report?.severity).toBe("CRITICAL");
    expect(report?.problemDetected).toContain("Zero Attributed Conversions");
    expect(report?.supportingMetrics.spend).toBe(3200);
  });

  it("should flag HIGH severity when CPA exceeds target by more than 50%", () => {
    const report = diagnoseAd({
      id: "ad-3",
      name: "Retargeting Dynamic Catalog",
      provider: "META",
      campaignName: "E-Commerce Retargeting",
      status: "ACTIVE",
      currentSpend: 4000,
      currentConversions: 4, // CPA = 1000
      currentClicks: 150,
      currentImpressions: 5000,
      targetCpa: 500, // Target is 500, current is 1000 (+100%)
    });

    expect(report).not.toBeNull();
    expect(report?.severity).toBe("HIGH");
    expect(report?.problemDetected).toContain("CPA Exceeding Target");
  });

  it("should not flag alarms when sample size is insufficient (early monitoring phase)", () => {
    const report = diagnoseAd({
      id: "ad-4",
      name: "New Ad Just Launched",
      provider: "JIOADS",
      campaignName: "Brand Awareness",
      status: "ACTIVE",
      currentSpend: 150,
      currentConversions: 0,
      currentClicks: 6, // Insufficient sample
      currentImpressions: 200,
    });

    expect(report).toBeNull();
  });
});
