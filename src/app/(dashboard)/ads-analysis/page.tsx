"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AdsTable } from "@/components/ads/ads-table";
import { NeedsAttention } from "@/components/ads/needs-attention";
import { UnifiedAdItem } from "@/types/analytics";
import { AnomalyReport } from "@/lib/analytics/anomaly-detector";
import { Select } from "@/components/ui/select";
import { AdProvider } from "@prisma/client";
import { Filter, Layers } from "lucide-react";

export default function AdsAnalysisPage() {
  const [ads, setAds] = useState<UnifiedAdItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProvider !== "ALL") params.set("provider", selectedProvider);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const [adsRes, anomRes] = await Promise.all([
        fetch(`/api/ads?${params.toString()}`),
        fetch("/api/ads/attention"),
      ]);

      const [adsData, anomData] = await Promise.all([
        adsRes.json(),
        anomRes.json(),
      ]);

      if (adsData.success) setAds(adsData.ads);
      if (anomData.success) setAnomalies(anomData.anomalies);
    } catch (err) {
      console.error("Ads analysis fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvider, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Ads Analysis & Diagnostics
        </h1>
        <p className="text-xs text-slate-400">
          In-depth creative and delivery evaluation across all synchronized advertising networks
        </p>
      </div>

      {/* Section 1: High-Priority "Needs Attention" */}
      <NeedsAttention anomalies={anomalies} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Filter className="h-3.5 w-3.5 text-brand-400" />
          <span>Filter Ads:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="h-8 py-0 text-xs bg-slate-950 border-slate-700"
            >
              <option value="ALL">All Providers</option>
              <option value={AdProvider.META}>Meta Ads</option>
              <option value={AdProvider.GOOGLE_ADS}>Google Ads</option>
              <option value={AdProvider.LINKEDIN}>LinkedIn</option>
              <option value={AdProvider.JIOADS}>JioAds</option>
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 py-0 text-xs bg-slate-950 border-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 2: All Ads Unified Table */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">
            All Advertisements ({ads.length})
          </h2>
        </div>
        <AdsTable ads={ads} />
      </div>
    </div>
  );
}
