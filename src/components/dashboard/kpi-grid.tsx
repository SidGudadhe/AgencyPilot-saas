"use client";

import React from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { DashboardKPISummary } from "@/types/analytics";
import { formatCurrency, formatNumber, formatPercent, formatROAS } from "@/lib/utils";
import {
  DollarSign,
  Layers,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Percent,
} from "lucide-react";

interface KPIGridProps {
  metrics: DashboardKPISummary;
}

export function KPIGrid({ metrics }: KPIGridProps) {
  const hasData = metrics.totalSpend > 0 || metrics.totalImpressions > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Ad Spend */}
      <MetricCard
        title="Total Ad Spend"
        value={formatCurrency(metrics.totalSpend, metrics.currency)}
        icon={DollarSign}
        isAvailable={hasData}
        unavailableNote={hasData ? undefined : "₹0.00 (No Spend)"}
      />

      {/* 2. Active Ads */}
      <MetricCard
        title="Active Ads"
        value={formatNumber(metrics.activeAdsCount)}
        subValue={metrics.totalAdsCount > 0 ? `of ${metrics.totalAdsCount} total` : undefined}
        icon={Layers}
        isAvailable={metrics.totalAdsCount > 0}
        unavailableNote="0 Active"
      />

      {/* 3. Impressions */}
      <MetricCard
        title="Total Impressions"
        value={formatNumber(metrics.totalImpressions)}
        icon={Eye}
        isAvailable={hasData}
        unavailableNote="0 tracked"
      />

      {/* 4. Clicks */}
      <MetricCard
        title="Total Clicks"
        value={formatNumber(metrics.totalClicks)}
        subValue={metrics.ctr !== null ? `${formatPercent(metrics.ctr)} CTR` : undefined}
        icon={MousePointerClick}
        isAvailable={hasData}
        unavailableNote="0 tracked"
      />

      {/* 5. Conversions */}
      <MetricCard
        title="Total Conversions"
        value={metrics.totalConversions !== null ? formatNumber(metrics.totalConversions) : null}
        subValue={metrics.cpc !== null ? `Avg CPC: ${formatCurrency(metrics.cpc, metrics.currency)}` : undefined}
        icon={Target}
        isAvailable={metrics.totalConversions !== null}
        unavailableNote="Not tracked"
      />

      {/* 6. Attributed Revenue */}
      <MetricCard
        title="Attributed Revenue"
        value={metrics.totalRevenue !== null ? formatCurrency(metrics.totalRevenue, metrics.currency) : null}
        icon={DollarSign}
        isAvailable={metrics.totalRevenue !== null}
        unavailableNote="Not available"
      />

      {/* 7. Blended ROAS */}
      <MetricCard
        title="Blended ROAS"
        value={metrics.roas !== null ? formatROAS(metrics.roas) : null}
        icon={TrendingUp}
        isAvailable={metrics.roas !== null}
        unavailableNote="Requires revenue"
      />

      {/* 8. Click-Through Rate (CTR) */}
      <MetricCard
        title="Average CTR"
        value={metrics.ctr !== null ? formatPercent(metrics.ctr) : null}
        subValue={metrics.cpm !== null ? `CPM: ${formatCurrency(metrics.cpm, metrics.currency)}` : undefined}
        icon={Percent}
        isAvailable={metrics.ctr !== null}
        unavailableNote="No impressions"
      />
    </div>
  );
}
