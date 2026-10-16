/**
 * Unified Analytics Math Engine for AgencyPilot SaaS
 * 
 * Centralizes all advertising formulas across the entire application.
 * Guarantees zero division by zero, zero NaN/Infinity, and strict validation
 * of missing inputs according to provider reporting standards.
 */

export interface RawMetricInputs {
  impressions?: number | bigint | null;
  clicks?: number | bigint | null;
  spend?: number | null;
  conversions?: number | null;
  attributedRevenue?: number | null;
  investmentCost?: number | null; // For true ROI calculation only
  reach?: number | bigint | null;
}

export interface CalculatedMetrics {
  ctr: number | null;               // Click-Through Rate (%)
  cpc: number | null;               // Cost Per Click (Currency)
  cpm: number | null;               // Cost Per Mille (Currency per 1k impressions)
  cvr: number | null;               // Conversion Rate (%)
  costPerConversion: number | null; // Cost Per Acquisition (CPA)
  roas: number | null;              // Return on Ad Spend (Ratio)
  roi: number | null;               // Return on Investment (%) - ONLY when costs known
  frequency: number | null;         // Average Frequency (impressions / reach)
}

/**
 * Click-Through Rate = (Clicks / Impressions) * 100
 */
export function calculateCTR(
  clicks: number | bigint | null | undefined,
  impressions: number | bigint | null | undefined
): number | null {
  const c = clicks ? Number(clicks) : 0;
  const imp = impressions ? Number(impressions) : 0;
  if (imp <= 0) return null;
  return Number(((c / imp) * 100).toFixed(4));
}

/**
 * Cost Per Click = Spend / Clicks
 */
export function calculateCPC(
  spend: number | null | undefined,
  clicks: number | bigint | null | undefined
): number | null {
  const s = spend ? Number(spend) : 0;
  const c = clicks ? Number(clicks) : 0;
  if (c <= 0 || s <= 0) return null;
  return Number((s / c).toFixed(2));
}

/**
 * Cost Per Mille (Thousand Impressions) = (Spend / Impressions) * 1,000
 */
export function calculateCPM(
  spend: number | null | undefined,
  impressions: number | bigint | null | undefined
): number | null {
  const s = spend ? Number(spend) : 0;
  const imp = impressions ? Number(impressions) : 0;
  if (imp <= 0 || s <= 0) return null;
  return Number(((s / imp) * 1000).toFixed(2));
}

/**
 * Conversion Rate = (Conversions / Clicks) * 100
 */
export function calculateCVR(
  conversions: number | null | undefined,
  clicks: number | bigint | null | undefined
): number | null {
  if (conversions === null || conversions === undefined) return null;
  const c = clicks ? Number(clicks) : 0;
  if (c <= 0) return null;
  return Number(((conversions / c) * 100).toFixed(2));
}

/**
 * Cost Per Conversion (CPA) = Spend / Conversions
 */
export function calculateCostPerConversion(
  spend: number | null | undefined,
  conversions: number | null | undefined
): number | null {
  if (!spend || !conversions || conversions <= 0) return null;
  return Number((spend / conversions).toFixed(2));
}

/**
 * Return on Ad Spend = Attributed Revenue / Spend
 * Note: Never calculated if revenue or spend is missing or zero.
 */
export function calculateROAS(
  attributedRevenue: number | null | undefined,
  spend: number | null | undefined
): number | null {
  if (
    attributedRevenue === null ||
    attributedRevenue === undefined ||
    spend === null ||
    spend === undefined ||
    spend <= 0
  ) {
    return null;
  }
  return Number((attributedRevenue / spend).toFixed(2));
}

/**
 * True Business ROI = ((Net Profit - Total Investment) / Total Investment) * 100
 * CRITICAL RULE: Advertising revenue alone is NOT profit.
 * If product costs (COGS), fulfillment, or overhead are unknown, do NOT claim
 * to calculate true business ROI. Return null.
 */
export function calculateTrueROI(
  netProfit: number | null | undefined,
  totalInvestment: number | null | undefined
): number | null {
  if (
    netProfit === null ||
    netProfit === undefined ||
    totalInvestment === null ||
    totalInvestment === undefined ||
    totalInvestment <= 0
  ) {
    return null;
  }
  return Number((((netProfit - totalInvestment) / totalInvestment) * 100).toFixed(2));
}

/**
 * Ad Frequency = Impressions / Reach
 */
export function calculateFrequency(
  impressions: number | bigint | null | undefined,
  reach: number | bigint | null | undefined
): number | null {
  const imp = impressions ? Number(impressions) : 0;
  const r = reach ? Number(reach) : 0;
  if (r <= 0 || imp <= 0) return null;
  return Number((imp / r).toFixed(2));
}

/**
 * Master calculator function: takes raw metric inputs and computes all derived metrics in one call
 */
export function computeAllMetrics(inputs: RawMetricInputs): CalculatedMetrics {
  return {
    ctr: calculateCTR(inputs.clicks, inputs.impressions),
    cpc: calculateCPC(inputs.spend, inputs.clicks),
    cpm: calculateCPM(inputs.spend, inputs.impressions),
    cvr: calculateCVR(inputs.conversions, inputs.clicks),
    costPerConversion: calculateCostPerConversion(inputs.spend, inputs.conversions),
    roas: calculateROAS(inputs.attributedRevenue, inputs.spend),
    roi: calculateTrueROI(inputs.attributedRevenue, inputs.investmentCost),
    frequency: calculateFrequency(inputs.impressions, inputs.reach),
  };
}
