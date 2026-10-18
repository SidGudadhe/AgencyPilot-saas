import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { AdIntelligenceOrchestrator } from "@/lib/analytics/orchestrator";
import { AnomalyReport } from "@/lib/analytics/anomaly-detector";

export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context;

  try {
    // Fetch active ads with campaigns, ad accounts, and metrics
    const ads = await prisma.ad.findMany({
      where: { workspaceId },
      include: {
        campaign: { select: { id: true, name: true, objective: true } },
        metrics: {
          orderBy: { date: "asc" },
        },
      },
    });

    const intelligenceResults = [];
    const anomalies: AnomalyReport[] = [];

    for (const ad of ads) {
      let spend = 0;
      let impressions = BigInt(0);
      let reach = BigInt(0);
      let clicks = BigInt(0);
      let conversions = 0;
      let revenue = 0;

      const historicalPoints = [];

      for (const m of ad.metrics) {
        spend += m.spend;
        impressions += m.impressions;
        if (m.reach) reach += m.reach;
        clicks += m.clicks;
        if (m.conversions !== null) conversions += m.conversions;
        if (m.conversionValue !== null) revenue += m.conversionValue;

        historicalPoints.push({
          date: m.date.toISOString().split("T")[0],
          ctr: m.ctr,
          cpc: m.cpc,
          cpm: m.cpm,
          cpa: m.costPerConversion,
          roas: m.roas,
        });
      }

      // Compute active delivery days
      const uniqueDays = new Set(ad.metrics.map((m) => m.date.toISOString().split("T")[0])).size;
      const activeDeliveryDays = Math.max(1, uniqueDays);

      // Run 10-engine intelligence orchestrator
      const intelligence = AdIntelligenceOrchestrator.processAd({
        ad: {
          id: ad.id,
          name: ad.name,
          externalId: ad.externalId,
          provider: ad.provider,
          status: ad.status,
          landingPageUrl: ad.landingPageUrl,
        },
        campaign: {
          id: ad.campaign.id,
          name: ad.campaign.name,
          objective: ad.campaign.objective,
        },
        account: {
          id: "account-default",
          externalId: "ext-act",
          currency: "INR",
        },
        workspaceId,
        currentMetrics: {
          impressions: Number(impressions),
          clicks: Number(clicks),
          spend,
          conversions: conversions > 0 ? conversions : (spend > 0 ? 0 : null),
          revenue: revenue > 0 ? revenue : null,
          reach: reach > 0 ? Number(reach) : null,
        },
        historicalPoints,
        activeDeliveryDays,
        lastSyncTimestamp: new Date().toISOString(),
        reportingDateRange: {
          startDate: ad.metrics[0]?.date.toISOString().split("T")[0] || "2026-10-01",
          endDate: ad.metrics[ad.metrics.length - 1]?.date.toISOString().split("T")[0] || "2026-10-07",
        },
        configuredTargets: {
          targetCpa: 500, // Target CPA baseline
        },
      });

      intelligenceResults.push(intelligence);

      // Map verified issues to backwards-compatible AnomalyReport format
      for (const issue of intelligence.issues) {
        anomalies.push({
          id: issue.issue_id,
          adId: ad.id,
          adName: ad.name,
          campaignName: ad.campaign.name,
          provider: ad.provider,
          severity: issue.severity === "CRITICAL" ? "CRITICAL" : issue.severity === "HIGH" ? "HIGH" : "MEDIUM",
          confidence: issue.confidence_tier,
          problemDetected: issue.verification_method,
          whyItMatters: issue.alternative_explanations.length > 0
            ? `Alternative hypothesis: ${issue.alternative_explanations[0]}`
            : "Direct performance disruption observed.",
          supportingMetrics: {
            spend: Number(issue.observed_metrics.spend || spend),
            conversions: Number(issue.observed_metrics.conversions ?? conversions),
            cpa: issue.observed_metrics.cpa ? Number(issue.observed_metrics.cpa) : undefined,
            ctr: issue.observed_metrics.observedCtr ? Number(issue.observed_metrics.observedCtr) : undefined,
          },
          comparisonContext: `Baseline evaluation under objective ${ad.campaign.objective}`,
          recommendedAction: issue.recommended_action,
          potentialImpact: "Mitigates capital inefficiency based on deterministic evidence.",
          dataLimitations: issue.limitations,
          detectedAt: issue.detection_timestamp,
        });
      }
    }

    // Sort by severity (Critical first)
    const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, MONITOR: 0 };
    anomalies.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

    return NextResponse.json({
      success: true,
      anomalies,
      intelligence: intelligenceResults,
    });
  } catch (err: unknown) {
    console.warn("Database error in attention route, returning empty anomalies:", (err as Error).message);
    return NextResponse.json({
      success: true,
      anomalies: [],
      intelligence: [],
    });
  }
}
