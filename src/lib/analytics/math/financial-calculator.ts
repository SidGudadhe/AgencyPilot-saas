/**
 * Financial Metric Protection & Canonical Calculation Engine
 * 
 * Guarantees mathematical correctness for all advertising and financial metrics.
 * 
 * Rules:
 * 1. Zero denominators return null or explicit zero (never NaN or Infinity).
 * 2. Missing or delayed inputs return null (never fabricated 0 without explicit evidence).
 * 3. Never report calculated ROI or ROAS if required inputs are missing or invalid.
 * 4. Distinguishes provider-reported metrics from internally calculated metrics.
 * 5. Validates currency uniformity before computing financial ratios.
 */

export interface MetricCalculationResult<T = number> {
  value: T | null;
  isValid: boolean;
  isCalculated: boolean;
  status: "VALID" | "ZERO_DENOMINATOR" | "MISSING_INPUT" | "CURRENCY_MISMATCH" | "INVALID_INPUT";
  formula: string;
  requiredInputs: Record<string, any>;
  explanation?: string;
}

export class FinancialCalculator {
  /**
   * CTR (Click-Through Rate)
   * Formula: (clicks / impressions) * 100
   * Required Inputs: clicks >= 0, impressions > 0
   */
  public static calculateCTR(
    clicks: number | null | undefined,
    impressions: number | null | undefined
  ): MetricCalculationResult<number> {
    const inputs = { clicks, impressions };

    if (clicks === null || clicks === undefined || impressions === null || impressions === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "(clicks / impressions) * 100",
        requiredInputs: inputs,
        explanation: "Cannot compute CTR: clicks or impressions are missing",
      };
    }

    if (clicks < 0 || impressions < 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "INVALID_INPUT",
        formula: "(clicks / impressions) * 100",
        requiredInputs: inputs,
        explanation: "Cannot compute CTR: negative values provided",
      };
    }

    if (impressions === 0) {
      return {
        value: 0,
        isValid: true,
        isCalculated: true,
        status: "ZERO_DENOMINATOR",
        formula: "(clicks / impressions) * 100",
        requiredInputs: inputs,
        explanation: "CTR is 0% because 0 impressions were served",
      };
    }

    const ctr = (clicks / impressions) * 100;
    // Cap CTR sanity check (if clicks exceed impressions, flag data anomaly)
    const valid = clicks <= impressions;

    return {
      value: Math.min(100, Math.max(0, ctr)),
      isValid: valid,
      isCalculated: true,
      status: valid ? "VALID" : "INVALID_INPUT",
      formula: "(clicks / impressions) * 100",
      requiredInputs: inputs,
      explanation: valid ? undefined : "Anomalous data: clicks exceed impressions",
    };
  }

  /**
   * CPC (Cost Per Click)
   * Formula: spend / clicks
   * Required Inputs: spend >= 0, clicks > 0
   */
  public static calculateCPC(
    spend: number | null | undefined,
    clicks: number | null | undefined
  ): MetricCalculationResult<number> {
    const inputs = { spend, clicks };

    if (spend === null || spend === undefined || clicks === null || clicks === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "spend / clicks",
        requiredInputs: inputs,
        explanation: "Cannot compute CPC: spend or clicks are missing",
      };
    }

    if (spend < 0 || clicks < 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "INVALID_INPUT",
        formula: "spend / clicks",
        requiredInputs: inputs,
        explanation: "Cannot compute CPC: negative values provided",
      };
    }

    if (clicks === 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "ZERO_DENOMINATOR",
        formula: "spend / clicks",
        requiredInputs: inputs,
        explanation: "CPC undefined when clicks are 0 (no clicks accrued)",
      };
    }

    return {
      value: spend / clicks,
      isValid: true,
      isCalculated: true,
      status: "VALID",
      formula: "spend / clicks",
      requiredInputs: inputs,
    };
  }

  /**
   * CPM (Cost Per Thousand Impressions)
   * Formula: (spend / impressions) * 1000
   * Required Inputs: spend >= 0, impressions > 0
   */
  public static calculateCPM(
    spend: number | null | undefined,
    impressions: number | null | undefined
  ): MetricCalculationResult<number> {
    const inputs = { spend, impressions };

    if (spend === null || spend === undefined || impressions === null || impressions === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "(spend / impressions) * 1000",
        requiredInputs: inputs,
      };
    }

    if (spend < 0 || impressions < 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "INVALID_INPUT",
        formula: "(spend / impressions) * 1000",
        requiredInputs: inputs,
      };
    }

    if (impressions === 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "ZERO_DENOMINATOR",
        formula: "(spend / impressions) * 1000",
        requiredInputs: inputs,
        explanation: "CPM undefined when impressions are 0",
      };
    }

    return {
      value: (spend / impressions) * 1000,
      isValid: true,
      isCalculated: true,
      status: "VALID",
      formula: "(spend / impressions) * 1000",
      requiredInputs: inputs,
    };
  }

  /**
   * Conversion Rate (CVR)
   * Formula: (conversions / clicks) * 100
   * Required Inputs: conversions >= 0, clicks > 0
   */
  public static calculateCVR(
    conversions: number | null | undefined,
    clicks: number | null | undefined
  ): MetricCalculationResult<number> {
    const inputs = { conversions, clicks };

    if (conversions === null || conversions === undefined || clicks === null || clicks === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "(conversions / clicks) * 100",
        requiredInputs: inputs,
        explanation: "Cannot compute CVR: conversions or clicks unavailable",
      };
    }

    if (conversions < 0 || clicks < 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "INVALID_INPUT",
        formula: "(conversions / clicks) * 100",
        requiredInputs: inputs,
      };
    }

    if (clicks === 0) {
      return {
        value: conversions > 0 ? null : 0,
        isValid: conversions === 0,
        isCalculated: true,
        status: conversions > 0 ? "INVALID_INPUT" : "ZERO_DENOMINATOR",
        formula: "(conversions / clicks) * 100",
        requiredInputs: inputs,
        explanation: conversions > 0 ? "Anomalous data: conversions recorded with 0 clicks" : "CVR 0% with 0 clicks",
      };
    }

    return {
      value: (conversions / clicks) * 100,
      isValid: true,
      isCalculated: true,
      status: "VALID",
      formula: "(conversions / clicks) * 100",
      requiredInputs: inputs,
    };
  }

  /**
   * CPA (Cost Per Acquisition / Conversion)
   * Formula: spend / conversions
   * Required Inputs: spend >= 0, conversions > 0
   */
  public static calculateCPA(
    spend: number | null | undefined,
    conversions: number | null | undefined
  ): MetricCalculationResult<number> {
    const inputs = { spend, conversions };

    if (spend === null || spend === undefined || conversions === null || conversions === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "spend / conversions",
        requiredInputs: inputs,
      };
    }

    if (spend < 0 || conversions < 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "INVALID_INPUT",
        formula: "spend / conversions",
        requiredInputs: inputs,
      };
    }

    if (conversions === 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "ZERO_DENOMINATOR",
        formula: "spend / conversions",
        requiredInputs: inputs,
        explanation: "CPA is undefined when conversions are 0 (no conversions generated)",
      };
    }

    return {
      value: spend / conversions,
      isValid: true,
      isCalculated: true,
      status: "VALID",
      formula: "spend / conversions",
      requiredInputs: inputs,
    };
  }

  /**
   * ROAS (Return on Ad Spend)
   * Formula: revenue / spend
   * Required Inputs: revenue >= 0, spend > 0, currencyMatch = true
   */
  public static calculateROAS(
    revenue: number | null | undefined,
    spend: number | null | undefined,
    spendCurrency: string = "INR",
    revenueCurrency: string = "INR"
  ): MetricCalculationResult<number> {
    const inputs = { revenue, spend, spendCurrency, revenueCurrency };

    if (spendCurrency !== revenueCurrency) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "CURRENCY_MISMATCH",
        formula: "revenue / spend",
        requiredInputs: inputs,
        explanation: `Currency mismatch: spend is in ${spendCurrency} but revenue is in ${revenueCurrency}`,
      };
    }

    if (revenue === null || revenue === undefined || spend === null || spend === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "revenue / spend",
        requiredInputs: inputs,
        explanation: "Cannot compute ROAS: revenue or spend is missing. Will not fabricate 0 without evidence.",
      };
    }

    if (revenue < 0 || spend < 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "INVALID_INPUT",
        formula: "revenue / spend",
        requiredInputs: inputs,
      };
    }

    if (spend === 0) {
      return {
        value: revenue > 0 ? null : 0,
        isValid: revenue === 0,
        isCalculated: true,
        status: "ZERO_DENOMINATOR",
        formula: "revenue / spend",
        requiredInputs: inputs,
        explanation: revenue > 0 ? "Organic/free conversions (spend was 0)" : "No spend occurred",
      };
    }

    return {
      value: revenue / spend,
      isValid: true,
      isCalculated: true,
      status: "VALID",
      formula: "revenue / spend",
      requiredInputs: inputs,
    };
  }

  /**
   * ROI (Return on Investment)
   * Formula: ((revenue - totalCost) / totalCost) * 100
   * Required Inputs: revenue >= 0, totalCost > 0
   */
  public static calculateROI(
    revenue: number | null | undefined,
    totalCost: number | null | undefined,
    currencyMatch: boolean = true
  ): MetricCalculationResult<number> {
    const inputs = { revenue, totalCost, currencyMatch };

    if (!currencyMatch) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "CURRENCY_MISMATCH",
        formula: "((revenue - totalCost) / totalCost) * 100",
        requiredInputs: inputs,
      };
    }

    if (revenue === null || revenue === undefined || totalCost === null || totalCost === undefined) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "MISSING_INPUT",
        formula: "((revenue - totalCost) / totalCost) * 100",
        requiredInputs: inputs,
        explanation: "ROI requires verified total cost and revenue figures.",
      };
    }

    if (totalCost <= 0) {
      return {
        value: null,
        isValid: false,
        isCalculated: true,
        status: "ZERO_DENOMINATOR",
        formula: "((revenue - totalCost) / totalCost) * 100",
        requiredInputs: inputs,
        explanation: "ROI undefined when total cost is zero or negative.",
      };
    }

    return {
      value: ((revenue - totalCost) / totalCost) * 100,
      isValid: true,
      isCalculated: true,
      status: "VALID",
      formula: "((revenue - totalCost) / totalCost) * 100",
      requiredInputs: inputs,
    };
  }
}
