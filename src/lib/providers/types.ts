import { AdProvider } from "@prisma/client";

/**
 * Canonical Internal Advertising Data Model
 * 
 * Standardizes ad accounts, campaigns, ad sets/groups, ads, and daily time-series
 * metrics across all external ad networks (Meta, Google, JioAds, etc.)
 */

export interface CanonicalAdAccount {
  externalId: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
}

export interface CanonicalCampaign {
  externalId: string;
  adAccountExternalId: string;
  name: string;
  objective?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | "DELETED";
  budget?: number;
  budgetType?: "DAILY" | "LIFETIME";
  startDate?: Date;
  endDate?: Date;
}

export interface CanonicalAdGroup {
  externalId: string;
  campaignExternalId: string;
  name: string;
  status: string;
  targetingData?: Record<string, unknown>;
}

export interface CanonicalAd {
  externalId: string;
  adGroupExternalId: string;
  campaignExternalId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "REJECTED" | "ARCHIVED" | "DELETED" | "PENDING_REVIEW";
  provider: AdProvider;
  creativeUrl?: string;
  thumbnailUrl?: string;
  landingPageUrl?: string;
  adType?: string;
  rawMetadata?: Record<string, unknown>;
}

export interface CanonicalDailyMetric {
  adExternalId: string;
  date: string; // YYYY-MM-DD
  impressions: number;
  reach?: number;
  clicks: number;
  linkClicks?: number;
  landingPageViews?: number;
  videoViews?: number;
  videoViews25?: number;
  videoViews50?: number;
  videoViews75?: number;
  videoViews100?: number;
  spend: number;
  currency: string;
  conversions?: number;
  conversionValue?: number;
  conversionCurrency?: string;
  frequency?: number;
  engagements?: number;
  rawProviderData?: Record<string, unknown>;
}

/**
 * Provider Adapter Interface
 * 
 * Every future ad network integration (Meta, Google Ads, JioAds, etc.)
 * implements this standard interface.
 */
export interface AdProviderAdapter {
  provider: AdProvider;

  /**
   * Validate token or refresh expired credentials
   */
  validateAuth(encryptedAccessToken: string, encryptedRefreshToken?: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    refreshedToken?: string;
  }>;

  /**
   * Fetch accessible ad accounts for authenticated user/business
   */
  fetchAccounts(token: string): Promise<CanonicalAdAccount[]>;

  /**
   * Fetch all campaigns for a specific account
   */
  fetchCampaigns(token: string, accountExternalId: string): Promise<CanonicalCampaign[]>;

  /**
   * Fetch all ad groups / ad sets for a campaign
   */
  fetchAdGroups(token: string, campaignExternalId: string): Promise<CanonicalAdGroup[]>;

  /**
   * Fetch all ads under an ad group
   */
  fetchAds(token: string, adGroupExternalId: string): Promise<CanonicalAd[]>;

  /**
   * Fetch time-series performance metrics for a date range
   */
  fetchMetrics(
    token: string,
    adExternalId: string,
    startDate: string,
    endDate: string
  ): Promise<CanonicalDailyMetric[]>;
}
