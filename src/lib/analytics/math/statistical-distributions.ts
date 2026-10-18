/**
 * Mathematical & Statistical Distributions Core
 * 
 * Provides:
 * 1. Wilson Score Confidence Interval with continuity correction (for CTR, CVR)
 * 2. Normal Distribution Cumulative Distribution Function (CDF) and Inverse CDF
 * 3. Two-proportion Z-test p-value calculation
 * 4. Beta-Binomial Bayesian conjugate update for sparse conversion rate modeling
 * 5. Benjamini-Hochberg False Discovery Rate (FDR) multi-testing correction
 */

// ============================================================================
// 1. NORMAL CDF & INVERSE CDF (ERF-BASED APPROXIMATION)
// ============================================================================

/**
 * Standard Normal Error Function erf(x) approximation (Abramowitz and Stegun 7.1.26)
 * Max error: 1.5e-7
 */
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Standard Normal Cumulative Distribution Function Phi(z)
 * Returns P(Z <= z)
 */
export function standardNormalCdf(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

/**
 * Two-tailed p-value from Z-score
 */
export function twoTailedPValueFromZ(z: number): number {
  const absZ = Math.abs(z);
  const cdf = standardNormalCdf(absZ);
  return Math.max(0, Math.min(1, 2 * (1.0 - cdf)));
}

// ============================================================================
// 2. WILSON SCORE INTERVAL (WITH CONTINUITY CORRECTION)
// ============================================================================

export interface WilsonScoreResult {
  observedRate: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  sampleSize: number;
}

/**
 * Wilson score interval with optional continuity correction for binomial proportions.
 * As recommended for small sample sizes or extreme proportions (CTR, CVR).
 * 
 * @param successes Number of successes (e.g. clicks or conversions)
 * @param trials Total number of trials (e.g. impressions or clicks)
 * @param confidenceLevel Default 0.95 (Z = 1.95996)
 * @param continuityCorrection Whether to apply continuity correction (default: true)
 */
export function calculateWilsonScoreInterval(
  successes: number,
  trials: number,
  confidenceLevel: number = 0.95,
  continuityCorrection: boolean = true
): WilsonScoreResult {
  if (trials <= 0) {
    return {
      observedRate: 0,
      lowerBound: 0,
      upperBound: 0,
      confidence: confidenceLevel,
      sampleSize: 0,
    };
  }

  const k = Math.max(0, successes);
  const n = trials;
  const p = k / n;

  // Approximate z-score for standard confidence levels
  let z = 1.95996; // 95%
  if (confidenceLevel === 0.90) z = 1.64485;
  else if (confidenceLevel === 0.99) z = 2.57583;
  else if (confidenceLevel !== 0.95) {
    // Basic approximation if custom
    z = 1.96;
  }

  const z2 = z * z;

  if (!continuityCorrection) {
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
    return {
      observedRate: p,
      lowerBound: Math.max(0, center - margin),
      upperBound: Math.min(1, center + margin),
      confidence: confidenceLevel,
      sampleSize: n,
    };
  }

  // With continuity correction: Newcombe (1998)
  const cc = 0.5 / n;
  let lower: number;
  let upper: number;

  if (k === 0) {
    lower = 0;
  } else {
    const term1 = 2 * n * p + z2 - 1;
    const term2 = z * Math.sqrt(z2 - (2 + 1 / n) + 4 * p * (n * (1 - p) + 1));
    lower = Math.max(0, (term1 - term2) / (2 * (n + z2)));
  }

  if (k === n) {
    upper = 1;
  } else {
    const term1 = 2 * n * p + z2 + 1;
    const term2 = z * Math.sqrt(z2 + (2 - 1 / n) + 4 * p * (n * (1 - p) - 1));
    upper = Math.min(1, (term1 + term2) / (2 * (n + z2)));
  }

  return {
    observedRate: p,
    lowerBound: Math.max(0, Math.min(p, lower)),
    upperBound: Math.min(1, Math.max(p, upper)),
    confidence: confidenceLevel,
    sampleSize: n,
  };
}

// ============================================================================
// 3. TWO-PROPORTION COMPARISON (E.G. OBSERVED VS BASELINE CTR/CVR)
// ============================================================================

export interface ProportionComparisonResult {
  observedRate: number;
  baselineRate: number;
  rateDifference: number;
  relativeChangeRatio: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceIntervalWilson95: [number, number];
}

/**
 * Compares an observed proportion (e.g. current ad CTR) against a baseline proportion
 * using pooled two-proportion Z-test and Wilson score intervals.
 */
export function compareProportions(
  observedSuccesses: number,
  observedTrials: number,
  baselineSuccesses: number,
  baselineTrials: number,
  alpha: number = 0.05
): ProportionComparisonResult {
  const pObserved = observedTrials > 0 ? observedSuccesses / observedTrials : 0;
  const pBaseline = baselineTrials > 0 ? baselineSuccesses / baselineTrials : 0;

  const wilson = calculateWilsonScoreInterval(observedSuccesses, observedTrials, 0.95, true);

  if (observedTrials < 5 || baselineTrials < 5) {
    return {
      observedRate: pObserved,
      baselineRate: pBaseline,
      rateDifference: pObserved - pBaseline,
      relativeChangeRatio: pBaseline > 0 ? (pObserved - pBaseline) / pBaseline : 0,
      zScore: 0,
      pValue: 1.0,
      isSignificant: false,
      confidenceIntervalWilson95: [wilson.lowerBound, wilson.upperBound],
    };
  }

  // Pooled standard error
  const pooledP = (observedSuccesses + baselineSuccesses) / (observedTrials + baselineTrials);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / observedTrials + 1 / baselineTrials));

  let zScore = 0;
  let pValue = 1.0;

  if (se > 0) {
    zScore = (pObserved - pBaseline) / se;
    pValue = twoTailedPValueFromZ(zScore);
  }

  return {
    observedRate: pObserved,
    baselineRate: pBaseline,
    rateDifference: pObserved - pBaseline,
    relativeChangeRatio: pBaseline > 0 ? (pObserved - pBaseline) / pBaseline : 0,
    zScore,
    pValue,
    isSignificant: pValue < alpha,
    confidenceIntervalWilson95: [wilson.lowerBound, wilson.upperBound],
  };
}

// ============================================================================
// 4. BAYESIAN BETA-BINOMIAL ESTIMATION FOR SPARSE CONVERSIONS
// ============================================================================

export interface BayesianEstimateResult {
  priorAlpha: number;
  priorBeta: number;
  posteriorAlpha: number;
  posteriorBeta: number;
  posteriorMean: number;
  posteriorMode: number;
  credibleInterval95: [number, number];
  shrinkageWeight: number; // 0 to 1 weight given to prior vs observed
}

/**
 * Estimates conversion rate using Beta-Binomial conjugate updating.
 * Useful when conversions are rare (e.g. 0-2 conversions on 30 clicks) so maximum
 * likelihood estimation (0 / 30 = 0%) produces extreme, false-alarm judgments.
 * 
 * Default prior: weakly informative Beta(alpha=1, beta=20) ~ 4.7% conversion prior.
 */
export function estimateBetaBinomial(
  successes: number,
  trials: number,
  priorAlpha: number = 1.0,
  priorBeta: number = 20.0
): BayesianEstimateResult {
  const k = Math.max(0, successes);
  const n = Math.max(0, trials);

  const postAlpha = priorAlpha + k;
  const postBeta = priorBeta + (n - k);

  const posteriorMean = postAlpha / (postAlpha + postBeta);
  const posteriorMode = (postAlpha > 1 && postBeta > 1)
    ? (postAlpha - 1) / (postAlpha + postBeta - 2)
    : posteriorMean;

  // Approximate 95% Credible Interval using Normal approximation on Beta distribution
  const postVariance = (postAlpha * postBeta) / (Math.pow(postAlpha + postBeta, 2) * (postAlpha + postBeta + 1));
  const postStdDev = Math.sqrt(postVariance);
  const lowerBound = Math.max(0, posteriorMean - 1.96 * postStdDev);
  const upperBound = Math.min(1, posteriorMean + 1.96 * postStdDev);

  // Shrinkage weight: how much the prior influenced the estimate
  const priorTotal = priorAlpha + priorBeta;
  const shrinkageWeight = priorTotal / (priorTotal + n);

  return {
    priorAlpha,
    priorBeta,
    posteriorAlpha: postAlpha,
    posteriorBeta: postBeta,
    posteriorMean,
    posteriorMode,
    credibleInterval95: [lowerBound, upperBound],
    shrinkageWeight,
  };
}

// ============================================================================
// 5. BENJAMINI-HOCHBERG FALSE DISCOVERY RATE (FDR) CONTROL
// ============================================================================

export interface FdrCorrectionInput {
  id: string;
  pValue: number;
}

export interface FdrCorrectionOutput {
  id: string;
  rawPValue: number;
  adjustedPValue: number;
  isSignificant: boolean;
  rank: number;
}

/**
 * Benjamini-Hochberg procedure for controlling the False Discovery Rate (FDR)
 * when testing multiple hypotheses across hundreds of advertisements.
 * 
 * @param tests Array of test identifiers and their raw p-values
 * @param falseDiscoveryRate Target FDR q-value (default: 0.05)
 */
export function applyBenjaminiHochbergCorrection(
  tests: FdrCorrectionInput[],
  falseDiscoveryRate: number = 0.05
): FdrCorrectionOutput[] {
  const m = tests.length;
  if (m === 0) return [];

  // Sort tests by raw p-value in ascending order
  const sorted = [...tests].map((item, originalIndex) => ({
    ...item,
    originalIndex,
  })).sort((a, b) => a.pValue - b.pValue);

  // Calculate adjusted p-values: p_adj(i) = min_{j >= i} (p(j) * m / j)
  const adjusted = new Array<number>(m);
  let minCumulative = 1.0;

  for (let i = m - 1; i >= 0; i--) {
    const rank = i + 1;
    const unconstrained = (sorted[i].pValue * m) / rank;
    minCumulative = Math.min(minCumulative, unconstrained);
    adjusted[i] = Math.max(0, Math.min(1, minCumulative));
  }

  return sorted.map((item, index) => ({
    id: item.id,
    rawPValue: item.pValue,
    adjustedPValue: adjusted[index],
    isSignificant: adjusted[index] <= falseDiscoveryRate,
    rank: index + 1,
  }));
}
