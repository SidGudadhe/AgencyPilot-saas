import {
  calculateCTR,
  calculateCPC,
  calculateCPM,
  calculateCVR,
  calculateCostPerConversion,
  calculateROAS,
  calculateTrueROI,
  calculateFrequency,
  computeAllMetrics,
} from "../src/lib/analytics/calculator";

describe("Unified Analytics Calculator Engine", () => {
  describe("calculateCTR", () => {
    it("should correctly compute CTR as (clicks / impressions) * 100", () => {
      expect(calculateCTR(50, 1000)).toBe(5.0);
      expect(calculateCTR(15, 3000)).toBe(0.5);
    });

    it("should safely return null when impressions are zero or negative", () => {
      expect(calculateCTR(10, 0)).toBeNull();
      expect(calculateCTR(10, -50)).toBeNull();
      expect(calculateCTR(10, null)).toBeNull();
    });
  });

  describe("calculateCPC", () => {
    it("should correctly compute CPC as spend / clicks", () => {
      expect(calculateCPC(500, 25)).toBe(20.0);
      expect(calculateCPC(1000, 80)).toBe(12.5);
    });

    it("should safely return null when clicks are zero or spend is zero", () => {
      expect(calculateCPC(500, 0)).toBeNull();
      expect(calculateCPC(0, 100)).toBeNull();
      expect(calculateCPC(null, 10)).toBeNull();
    });
  });

  describe("calculateCPM", () => {
    it("should correctly compute CPM as (spend / impressions) * 1000", () => {
      expect(calculateCPM(250, 10000)).toBe(25.0);
    });

    it("should return null for zero impressions", () => {
      expect(calculateCPM(250, 0)).toBeNull();
    });
  });

  describe("calculateROAS", () => {
    it("should correctly compute ROAS as revenue / spend", () => {
      expect(calculateROAS(4500, 1500)).toBe(3.0);
      expect(calculateROAS(2500, 1000)).toBe(2.5);
    });

    it("should strictly return null if revenue or spend is missing or zero", () => {
      expect(calculateROAS(null, 1000)).toBeNull();
      expect(calculateROAS(5000, null)).toBeNull();
      expect(calculateROAS(5000, 0)).toBeNull();
    });
  });

  describe("calculateTrueROI", () => {
    it("should compute ROI only when investment cost and net profit are provided", () => {
      expect(calculateTrueROI(15000, 10000)).toBe(50.0);
    });

    it("should strictly return null if investment cost is missing, zero, or negative", () => {
      expect(calculateTrueROI(5000, null)).toBeNull();
      expect(calculateTrueROI(5000, 0)).toBeNull();
    });
  });

  describe("calculateFrequency", () => {
    it("should calculate impressions / reach", () => {
      expect(calculateFrequency(5000, 2000)).toBe(2.5);
    });

    it("should return null when reach is missing or zero", () => {
      expect(calculateFrequency(5000, 0)).toBeNull();
      expect(calculateFrequency(5000, null)).toBeNull();
    });
  });

  describe("computeAllMetrics", () => {
    it("should compute all derived metrics simultaneously in one strong call", () => {
      const result = computeAllMetrics({
        impressions: 10000,
        clicks: 250,
        spend: 2500,
        conversions: 10,
        attributedRevenue: 7500,
        reach: 4000,
      });

      expect(result.ctr).toBe(2.5);
      expect(result.cpc).toBe(10.0);
      expect(result.cpm).toBe(250.0);
      expect(result.cvr).toBe(4.0);
      expect(result.costPerConversion).toBe(250.0);
      expect(result.roas).toBe(3.0);
      expect(result.frequency).toBe(2.5);
      expect(result.roi).toBeNull(); // Missing explicit investment cost
    });
  });
});
