import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { computeAllMetrics } from "@/lib/analytics/calculator";
import { UnifiedAdItem } from "@/types/analytics";
import { AdProvider, AdStatus } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context;
  const url = new URL(req.url);

  const providerFilter = url.searchParams.get("provider");
  const campaignFilter = url.searchParams.get("campaignId");
  const statusFilter = url.searchParams.get("status");

  const where: Record<string, unknown> = { workspaceId };
  if (providerFilter && providerFilter !== "ALL") {
    where.provider = providerFilter as AdProvider;
  }
  if (campaignFilter && campaignFilter !== "ALL") {
    where.campaignId = campaignFilter;
  }
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as AdStatus;
  }

  try {
    const ads = await prisma.ad.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true } },
        adGroup: { select: { id: true, name: true } },
        metrics: true,
      },
      orderBy: { createdAt: "desc" },
    });

  const formattedAds: UnifiedAdItem[] = ads.map((ad) => {
    let spend = 0;
    let impressions = BigInt(0);
    let reach = BigInt(0);
    let clicks = BigInt(0);
    let conversions = 0;
    let revenue = 0;
    let hasConversions = false;
    let hasRevenue = false;

    for (const m of ad.metrics) {
      spend += m.spend;
      impressions += m.impressions;
      if (m.reach) reach += m.reach;
      clicks += m.clicks;
      if (m.conversions !== null) {
        conversions += m.conversions;
        hasConversions = true;
      }
      if (m.conversionValue !== null) {
        revenue += m.conversionValue;
        hasRevenue = true;
      }
    }

    const computed = computeAllMetrics({
      spend,
      impressions,
      clicks,
      conversions: hasConversions ? conversions : null,
      attributedRevenue: hasRevenue ? revenue : null,
      reach: reach > 0 ? reach : null,
    });

    let performanceStatus: "HEALTHY" | "NEEDS_ATTENTION" | "INSUFFICIENT_DATA" | "PAUSED" = "HEALTHY";
    if (ad.status === AdStatus.PAUSED) {
      performanceStatus = "PAUSED";
    } else if (spend >= 2500 && conversions === 0 && clicks >= 40) {
      performanceStatus = "NEEDS_ATTENTION";
    } else if (spend === 0 || impressions < 500) {
      performanceStatus = "INSUFFICIENT_DATA";
    }

    return {
      id: ad.id,
      externalId: ad.externalId,
      name: ad.name,
      provider: ad.provider,
      campaignId: ad.campaignId,
      campaignName: ad.campaign.name,
      adGroupName: ad.adGroup.name,
      status: ad.status,
      thumbnailUrl: ad.thumbnailUrl,
      creativeUrl: ad.creativeUrl,
      spend,
      currency: "INR",
      impressions: Number(impressions),
      reach: reach > 0 ? Number(reach) : null,
      clicks: Number(clicks),
      ctr: computed.ctr,
      cpc: computed.cpc,
      cpm: computed.cpm,
      conversions: hasConversions ? conversions : null,
      cvr: computed.cvr,
      costPerConversion: computed.costPerConversion,
      revenue: hasRevenue ? revenue : null,
      roas: computed.roas,
      performanceStatus,
      lastUpdated: ad.updatedAt.toISOString(),
    };
  });

    return NextResponse.json({
      success: true,
      ads: formattedAds,
    });
  } catch (err: unknown) {
    console.warn("Database error in ads route, returning empty list:", (err as Error).message);
    return NextResponse.json({
      success: true,
      ads: [],
    });
  }
}
