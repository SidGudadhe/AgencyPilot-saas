"use client";

import React from "react";
import { Select } from "@/components/ui/select";
import { AdProvider } from "@prisma/client";
import { RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  selectedCampaign: string;
  onCampaignChange: (campaignId: string) => void;
  campaigns?: { id: string; name: string }[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function FilterBar({
  selectedProvider,
  onProviderChange,
  selectedCampaign,
  onCampaignChange,
  campaigns = [],
  onRefresh,
  isRefreshing,
}: FilterBarProps) {
  const providers: { value: string; label: string }[] = [
    { value: "ALL", label: "All Providers" },
    { value: AdProvider.META, label: "Meta (Facebook/Instagram)" },
    { value: AdProvider.GOOGLE_ADS, label: "Google Ads" },
    { value: AdProvider.LINKEDIN, label: "LinkedIn Ads" },
    { value: AdProvider.TWITTER, label: "Twitter / X Ads" },
    { value: AdProvider.SNAPCHAT, label: "Snapchat Ads" },
    { value: AdProvider.TIKTOK, label: "TikTok Ads" },
    { value: AdProvider.JIOADS, label: "JioAds (India)" },
    { value: AdProvider.HOTSTAR, label: "Disney+ Hotstar (India)" },
    { value: AdProvider.INMOBI, label: "InMobi (India)" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center text-xs font-semibold text-slate-300">
          <Filter className="mr-1.5 h-3.5 w-3.5 text-brand-400" />
          <span>Filters:</span>
        </div>

        {/* Provider Filter */}
        <div className="w-48">
          <Select
            value={selectedProvider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="h-8 py-0 text-xs bg-slate-950 border-slate-700"
          >
            {providers.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Campaign Filter */}
        <div className="w-48">
          <Select
            value={selectedCampaign}
            onChange={(e) => onCampaignChange(e.target.value)}
            className="h-8 py-0 text-xs bg-slate-950 border-slate-700"
          >
            <option value="ALL">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {(selectedProvider !== "ALL" || selectedCampaign !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onProviderChange("ALL");
              onCampaignChange("ALL");
            }}
            className="h-8 text-xs text-slate-400 hover:text-white"
          >
            Reset
          </Button>
        )}
      </div>

      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isRefreshing}
          className="h-8 text-xs border-slate-700 hover:bg-slate-800"
        >
          <RefreshCw className="mr-1.5 h-3 w-3" />
          Sync Data
        </Button>
      )}
    </div>
  );
}
