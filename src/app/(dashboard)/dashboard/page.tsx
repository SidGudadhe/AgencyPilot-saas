"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KPIGrid } from "@/components/dashboard/kpi-grid";
import { PerformanceChart, TimeSeriesPoint } from "@/components/dashboard/performance-chart";
import { ProviderTable } from "@/components/dashboard/provider-table";
import { DashboardKPISummary, ProviderComparisonRow } from "@/types/analytics";
import { EmptyState } from "@/components/ui/empty-state";
import { Radio, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  const [selectedProvider, setSelectedProvider] = useState("ALL");
  const [selectedCampaign, setSelectedCampaign] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const [kpiSummary, setKpiSummary] = useState<DashboardKPISummary>({
    totalSpend: 0,
    activeAdsCount: 0,
    totalAdsCount: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: null,
    totalRevenue: null,
    roas: null,
    roi: null,
    ctr: null,
    cpc: null,
    cpm: null,
    currency: "INR",
    lastSynchronizedAt: null,
  });

  const [providerRows, setProviderRows] = useState<ProviderComparisonRow[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProvider !== "ALL") params.set("provider", selectedProvider);
      if (selectedCampaign !== "ALL") params.set("campaignId", selectedCampaign);

      const res = await fetch(`/api/dashboard/metrics?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setKpiSummary(data.kpiSummary);
        setProviderRows(data.providerRows);
        setCampaigns(data.campaigns);

        // If real daily points exist, map them, else empty array
        setChartData([]);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvider, selectedCampaign]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const hasConnectedAccounts = providerRows.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Real Data Assurance */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Advertising Overview
          </h1>
          <p className="text-xs text-slate-400">
            Consolidated cross-platform performance metrics across all connected ad networks
          </p>
        </div>

        <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded border font-mono real-data-pill">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Real Data Only • Zero Synthetic Metrics</span>
        </div>
      </div>

      {/* Zero Providers Connected Banner */}
      {!hasConnectedAccounts && !isLoading && (
        <EmptyState
          icon={Radio}
          title="No Advertising Accounts Connected"
          description="AgencyPilot does not display fake metrics. To view real performance, click below to inspect provider integration channels."
          actionLabel="View Ad Provider Connections"
          actionHref="/providers"
        />
      )}

      {/* Global Filter Bar */}
      <FilterBar
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        selectedCampaign={selectedCampaign}
        onCampaignChange={setSelectedCampaign}
        campaigns={campaigns}
        onRefresh={fetchDashboardData}
        isRefreshing={isLoading}
      />

      {/* KPI Cards Grid */}
      <KPIGrid metrics={kpiSummary} />

      {/* Time-Series Trend Chart */}
      <PerformanceChart data={chartData} currency={kpiSummary.currency} />

      {/* Provider Breakdown Table */}
      <ProviderTable data={providerRows} currency={kpiSummary.currency} />
    </div>
  );
}
