import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { diagnoseAd, AnomalyReport, AdDiagnosticData } from "@/lib/analytics/anomaly-detector";

export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context;

  try {
    // Fetch active ads with metrics
    const ads = await prisma.ad.findMany({
      where: { workspaceId },
      include: {
        campaign: { select: { id: true, name: true } },
        metrics: true,
      },
    });

    const anomalies: AnomalyReport[] = [];

    for (const ad of ads) {
      let spend = 0;
      let impressions = BigInt(0);
      let reach = BigInt(0);
      let clicks = BigInt(0);
      let conversions = 0;

      for (const m of ad.metrics) {
        spend += m.spend;
        impressions += m.impressions;
        if (m.reach) reach += m.reach;
        clicks += m.clicks;
        if (m.conversions !== null) conversions += m.conversions;
      }

      const diagInput: AdDiagnosticData = {
        id: ad.id,
        name: ad.name,
        provider: ad.provider,
        campaignName: ad.campaign.name,
        status: ad.status,
        currentSpend: spend,
        currentConversions: conversions,
        currentClicks: Number(clicks),
        currentImpressions: Number(impressions),
        currentReach: reach > 0 ? Number(reach) : null,
        targetCpa: 500, // Default target CPA baseline
      };

      const anomaly = diagnoseAd(diagInput);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    // Sort by severity (Critical first)
    const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, MONITOR: 0 };
    anomalies.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

    return NextResponse.json({
      success: true,
      anomalies,
    });
  } catch (err: unknown) {
    console.warn("Database error in attention route, returning empty anomalies:", (err as Error).message);
    return NextResponse.json({
      success: true,
      anomalies: [],
    });
  }
}
