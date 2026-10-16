import { AdProvider, AdStatus } from "@prisma/client";

export interface GlobalFilterState {
  dateRange: "today" | "7d" | "30d" | "90d" | "custom";
  startDate?: string;
  endDate?: string;
  provider?: AdProvider | "ALL";
  campaignId?: string;
  accountId?: string;
  currency: string;
}

export interface DashboardKPISummary {
  totalSpend: number;
  activeAdsCount: number;
  totalAdsCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number | null;
  totalRevenue: number | null;
  roas: number | null;
  roi: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  currency: string;
  lastSynchronizedAt: string | null;
}

export interface ProviderComparisonRow {
  provider: AdProvider;
  providerName: string;
  connectedAccountName: string;
  activeAdsCount: number;
  totalSpend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  conversions: number | null;
  cvr: number | null;
  revenue: number | null;
  roas: number | null;
  performanceStatus: "HEALTHY" | "MONITOR" | "CRITICAL" | "NO_DATA";
  lastSyncAt: string | null;
}

export interface UnifiedAdItem {
  id: string;
  externalId: string;
  name: string;
  provider: AdProvider;
  campaignId: string;
  campaignName: string;
  adGroupName?: string;
  status: AdStatus;
  thumbnailUrl?: string | null;
  creativeUrl?: string | null;
  spend: number;
  currency: string;
  impressions: number;
  reach?: number | null;
  clicks: number;
  linkClicks?: number | null;
  videoViews?: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
  cvr: number | null;
  costPerConversion: number | null;
  revenue: number | null;
  roas: number | null;
  performanceStatus: "HEALTHY" | "NEEDS_ATTENTION" | "INSUFFICIENT_DATA" | "PAUSED";
  lastUpdated: string;
}
