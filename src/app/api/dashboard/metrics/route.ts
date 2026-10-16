import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { computeAllMetrics } from "@/lib/analytics/calculator";
import { DashboardKPISummary, ProviderComparisonRow } from "@/types/analytics";
import { AdProvider, AdStatus } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context;
  const url = new URL(req.url);

  const providerFilter = url.searchParams.get("provider");
  const campaignFilter = url.searchParams.get("campaignId");
  const dateRange = url.searchParams.get("dateRange") || "30d";

  // Compute date filter boundary
  const now = new Date();
  let startDate: Date | undefined;
  if (dateRange === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateRange === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (dateRange === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else {
    // Default 30d
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 1. Fetch connected provider integrations
  const integrations = await prisma.providerIntegration.findMany({
    where: { workspaceId },
    include: {
      adAccounts: true,
    },
  });

  // 2. Fetch campaigns for filter dropdown
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    select: { id: true, name: true, externalId: true },
    orderBy: { name: "asc" },
  });

  // 3. Build Ad filter
  const adWhere: Record<string, unknown> = { workspaceId };
  if (providerFilter && providerFilter !== "ALL") {
    adWhere.provider = providerFilter as AdProvider;
  }
  if (campaignFilter && campaignFilter !== "ALL") {
    adWhere.campaignId = campaignFilter;
  }

  const ads = await prisma.ad.findMany({
    where: adWhere,
    include: {
      metrics: {
        where: {
          date: { gte: startDate },
        },
      },
    },
  });

  // 4. Aggregate metrics across all matched ads
  let totalSpend = 0;
  let totalImpressions = BigInt(0);
  let totalClicks = BigInt(0);
  let totalConversions = 0;
  let totalRevenue = 0;
  let hasConversionsData = false;
  let hasRevenueData = false;

  let activeAdsCount = 0;

  for (const ad of ads) {
    if (ad.status === AdStatus.ACTIVE) {
      activeAdsCount++;
    }

    for (const m of ad.metrics) {
      totalSpend += m.spend;
      totalImpressions += m.impressions;
      totalClicks += m.clicks;

      if (m.conversions !== null && m.conversions !== undefined) {
        totalConversions += m.conversions;
        hasConversionsData = true;
      }
      if (m.conversionValue !== null && m.conversionValue !== undefined) {
        totalRevenue += m.conversionValue;
        hasRevenueData = true;
      }
    }
  }

  const computed = computeAllMetrics({
    spend: totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    conversions: hasConversionsData ? totalConversions : null,
    attributedRevenue: hasRevenueData ? totalRevenue : null,
  });

  // Find last synchronization timestamp
  const latestSync = await prisma.syncJob.findFirst({
    where: { workspaceId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  const kpiSummary: DashboardKPISummary = {
    totalSpend,
    activeAdsCount,
    totalAdsCount: ads.length,
    totalImpressions: Number(totalImpressions),
    totalClicks: Number(totalClicks),
    totalConversions: hasConversionsData ? totalConversions : null,
    totalRevenue: hasRevenueData ? totalRevenue : null,
    roas: computed.roas,
    roi: null, // Zero fabricated ROI without product COGS
    ctr: computed.ctr,
    cpc: computed.cpc,
    cpm: computed.cpm,
    currency: "INR",
    lastSynchronizedAt: latestSync?.completedAt?.toISOString() || null,
  };

  // 5. Build Provider Comparison Rows
  const providerRows: ProviderComparisonRow[] = integrations.map((int) => {
    const providerAds = ads.filter((a) => a.provider === int.provider);
    let pSpend = 0;
    let pImpressions = BigInt(0);
    let pClicks = BigInt(0);
    let pConversions = 0;
    let pRevenue = 0;
    let pHasConversions = false;
    let pHasRevenue = false;

    let pActiveAds = 0;

    for (const ad of providerAds) {
      if (ad.status === AdStatus.ACTIVE) pActiveAds++;
      for (const m of ad.metrics) {
        pSpend += m.spend;
        pImpressions += m.impressions;
        pClicks += m.clicks;
        if (m.conversions !== null) {
          pConversions += m.conversions;
          pHasConversions = true;
        }
        if (m.conversionValue !== null) {
          pRevenue += m.conversionValue;
          pHasRevenue = true;
        }
      }
    }

    const pComputed = computeAllMetrics({
      spend: pSpend,
      impressions: pImpressions,
      clicks: pClicks,
      conversions: pHasConversions ? pConversions : null,
      attributedRevenue: pHasRevenue ? pRevenue : null,
    });

    const accountName = int.adAccounts[0]?.name || "Default Account";

    return {
      provider: int.provider,
      providerName: int.provider.replace("_", " "),
      connectedAccountName: accountName,
      activeAdsCount: pActiveAds,
      totalSpend: pSpend,
      impressions: Number(pImpressions),
      clicks: Number(pClicks),
      ctr: pComputed.ctr,
      cpc: pComputed.cpc,
      conversions: pHasConversions ? pConversions : null,
      cvr: pComputed.cvr,
      revenue: pHasRevenue ? pRevenue : null,
      roas: pComputed.roas,
      performanceStatus: pSpend > 0 ? (pComputed.roas && pComputed.roas >= 2.0 ? "HEALTHY" : "MONITOR") : "NO_DATA",
      lastSyncAt: int.lastSyncAt?.toISOString() || null,
    };
  });

  return NextResponse.json({
    success: true,
    kpiSummary,
    providerRows,
    campaigns,
    workspace: {
      id: auth.context.workspaceId,
      name: auth.context.workspaceName,
      role: auth.context.role,
    },
  });
}
