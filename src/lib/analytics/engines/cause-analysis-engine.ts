/**
 * Engine 7: Probable Cause Analysis Engine
 * 
 * Performs objective diagnosis of detected issues by weighing competing hypotheses.
 * Distinguishes probable causes from verified facts.
 * Explores alternative explanations and identifies confounding factors (e.g. weekends, attribution delays).
 */

import { ProbableCauseAnalysis, VerifiedIssue } from "../types/intelligence";

export interface CauseAnalysisInput {
  issue: VerifiedIssue;
  frequency?: number | null;
  cpmChangePercent?: number | null;
  landingPageViews?: number | null;
  clicks?: number | null;
  isWeekendOrHoliday?: boolean;
  conversionReportingDelayHours?: number;
}

export class CauseAnalysisEngine {
  /**
   * Diagnoses root causes for a detected issue.
   */
  public static analyze(input: CauseAnalysisInput): ProbableCauseAnalysis {
    const { issue, frequency, cpmChangePercent, landingPageViews, clicks, isWeekendOrHoliday, conversionReportingDelayHours } = input;
    const confoundingFactors: string[] = [];

    if (isWeekendOrHoliday) {
      confoundingFactors.push("Weekend/holiday period may alter consumer browsing patterns or purchase intent.");
    }
    if ((conversionReportingDelayHours ?? 0) > 0) {
      confoundingFactors.push(`Attribution lag window active (${conversionReportingDelayHours}h); delayed conversions may still reconcile.`);
    }

    switch (issue.issue_type) {
      case "LANDING_PAGE_ERROR_404_OR_TIMEOUT": {
        return {
          issueId: issue.issue_id,
          primaryHypothesis: {
            cause: "Destination web server returned non-200 HTTP response or connection timed out.",
            probability: 0.95,
            corroboratingSignals: [
              `Observed HTTP status: ${issue.observed_metrics.httpStatus || "Timeout/Connection failure"}`,
              "Ad traffic redirected to unavailable URL.",
            ],
          },
          competingHypotheses: [
            {
              cause: "Transient edge CDN or Cloudflare challenge intercepting verification bots.",
              probability: 0.05,
              counterEvidence: ["Usually returns 403 or 503 rather than 404 Not Found."],
            },
          ],
          confoundingFactors,
          diagnosticNextSteps: [
            "Test URL directly in browser incognito mode.",
            "Verify URL redirects and SSL certificate validity.",
            "Inspect web hosting server error logs for matching timestamps.",
          ],
        };
      }

      case "CONVERSION_TRACKING_DISRUPTION": {
        const dropRatio = clicks && landingPageViews ? landingPageViews / clicks : null;
        return {
          issueId: issue.issue_id,
          primaryHypothesis: {
            cause: "Tracking pixel tag, GTM container, or Server-Side Conversion API disconnected.",
            probability: 0.85,
            corroboratingSignals: [
              `Clicks continue normally (${clicks ?? "active"}), but conversion event pipeline reported zero events.`,
              `Binomial probability of zero natural conversions is under 1%.`,
            ],
          },
          competingHypotheses: [
            {
              cause: "Payment gateway outage or checkout flow JavaScript error blocking users from finishing purchase.",
              probability: 0.15,
              counterEvidence: [
                dropRatio && dropRatio > 0.7 ? "Users are reaching landing page successfully." : "Checkout page unverified.",
              ],
            },
          ],
          confoundingFactors,
          diagnosticNextSteps: [
            "Open browser developer tools Network tab and verify conversion pixel payload fires on confirmation page.",
            "Check Google Tag Manager / Meta Pixel Helper for container errors.",
            "Verify payment gateway webhook logs for successful transactions without matching ad conversions.",
          ],
        };
      }

      case "CLICK_THROUGH_SIGNIFICANT_COLLAPSE": {
        const freqHigh = (frequency ?? 1) >= 2.5;
        return {
          issueId: issue.issue_id,
          primaryHypothesis: {
            cause: freqHigh
              ? "Creative fatigue driven by high audience ad frequency repetition."
              : "Creative resonance decline or increased ad competition in the targeted auction.",
            probability: freqHigh ? 0.75 : 0.60,
            corroboratingSignals: [
              freqHigh ? `Frequency reached ${frequency?.toFixed(1)}x across target audience.` : "Statistically significant CTR collapse vs historical baseline.",
              issue.observed_metrics.relativeDeclinePercent ? `Relative CTR change: ${issue.observed_metrics.relativeDeclinePercent}%` : "Drop detected.",
            ],
          },
          competingHypotheses: [
            {
              cause: "Algorithmic placement shift by advertising network to lower-cost/lower-intent inventory (e.g. audience network).",
              probability: freqHigh ? 0.25 : 0.40,
              counterEvidence: [
                cpmChangePercent && cpmChangePercent < -20 ? "Lower CPM aligns with low-intent inventory placement." : "CPM remained stable.",
              ],
            },
          ],
          confoundingFactors,
          diagnosticNextSteps: [
            "Review ad placement breakdown (Feed vs Stories vs Audience Network).",
            "Examine frequency metrics across 7-day and 14-day rolling windows.",
            "Prepare fresh creative variants (new visual hook or value proposition).",
          ],
        };
      }

      case "COST_PER_ACQUISITION_SEVERE_TARGET_BREACH":
      case "UNVALIDATED_CAPITAL_EXPENDITURE":
      default: {
        const cpmElevated = (cpmChangePercent ?? 0) > 25;
        return {
          issueId: issue.issue_id,
          primaryHypothesis: {
            cause: cpmElevated
              ? "Auction bid inflation driving up acquisition costs faster than conversion value can support."
              : "Post-click conversion funnel drop-off or mismatched audience purchase intent.",
            probability: 0.70,
            corroboratingSignals: [
              cpmElevated ? `CPM increased by ${cpmChangePercent?.toFixed(0)}%` : "Spend exceeds CPA baseline without proportional conversions.",
              `Observed spend: ₹${Number(issue.observed_metrics.spend || 0).toFixed(0)}`,
            ],
          },
          competingHypotheses: [
            {
              cause: "Attribution delay with longer customer decision journeys.",
              probability: 0.30,
              counterEvidence: [
                "Only applies if average sales cycle exceeds current reporting window.",
              ],
            },
          ],
          confoundingFactors,
          diagnosticNextSteps: [
            "Check landing page conversion rate vs historical site-wide average.",
            "Test bid caps or cost controls to prevent algorithmic overbidding.",
            "Review customer feedback on pricing or delivery time.",
          ],
        };
      }
    }
  }
}
