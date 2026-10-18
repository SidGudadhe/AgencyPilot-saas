import { AdProvider } from "@prisma/client";

/**
 * All supported advertising provider keys in the SaaS directory.
 */
export type ProviderKey =
  | "META"
  | "GOOGLE_ADS"
  | "LINKEDIN"
  | "AMAZON_ADS"
  | "MICROSOFT_ADS"
  | "SNAPCHAT"
  | "PINTEREST"
  | "X_ADS"
  | "REDDIT"
  | "FLIPKART_ADS"
  | "JIOADS"
  | "SHARECHAT"
  | "INMOBI";

export type ProviderCategory =
  | "SOCIAL"
  | "SEARCH"
  | "RETAIL_MARKETPLACE"
  | "MOBILE_NETWORKS";

export type IntegrationReadiness =
  | "AVAILABLE"
  | "REQUIRES_SETUP"
  | "REQUIRES_APPROVAL"
  | "PARTNER_ACCESS_REQUIRED"
  | "COMING_SOON"
  | "UNAVAILABLE";

export type ConnectionStatus =
  | "PENDING_AUTHORIZATION"
  | "AUTHORIZATION_FAILED"
  | "VALIDATING"
  | "CONNECTED"
  | "CONNECTED_WITH_LIMITATIONS"
  | "TOKEN_EXPIRED"
  | "PERMISSION_REQUIRED"
  | "ACCOUNT_ACCESS_DENIED"
  | "API_CONFIGURATION_REQUIRED"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "SYNC_ERROR"
  | "PAUSED"
  | "DISCONNECTED";

export type AccessType = "READ_ONLY" | "MODIFICATION";

export interface PermissionDefinition {
  scope: string;
  name: string;
  description: string;
  purpose: string;
  required: boolean;
  accessType: AccessType;
  selectable: boolean;
  featureDependencies: string[];
}

export interface RequiredCredentialInfo {
  key: string;
  label: string;
  envVar: string;
  description: string;
  configured: boolean;
}

export interface ProviderMetadata {
  key: ProviderKey;
  displayName: string;
  category: ProviderCategory;
  logo: string;
  supportedProducts: string[];
  documentationUrl: string;
  developerPortalUrl: string;
  authorizationMethod: "OAUTH2_PKCE" | "OAUTH2_CODE" | "API_KEY" | "PARTNER_PORTAL";
  permissions: PermissionDefinition[];
  requiredCredentials: RequiredCredentialInfo[];
  readiness: IntegrationReadiness;
  readinessReason: string;
  accountDiscoverySupported: boolean;
  reportingSupported: boolean;
  supportedMetrics: string[];
  knownLimitations: string[];
  currentVersion: string;
  lastVerifiedAt: string;
}

export interface DiscoveredAdAccount {
  externalId: string;
  name: string;
  currency: string;
  timezone?: string;
  status?: string;
  alreadyConnected: boolean;
  connectedWorkspaceName?: string;
  reportingAvailable: boolean;
}

export interface ConnectionValidationResult {
  valid: boolean;
  status: ConnectionStatus;
  provider: ProviderKey;
  externalAccountId?: string;
  accountName?: string;
  grantedScopes: string[];
  checksPerformed: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
  timestamp: string;
  requestId?: string;
  errorCategory?: string;
  guidance?: string;
  latencyMs?: number;
}

export interface ConnectedAccountRecord {
  id: string;
  workspaceId: string;
  provider: ProviderKey;
  externalAccountId: string;
  accountName: string;
  currency: string;
  timezone: string;
  status: ConnectionStatus;
  grantedScopes: string[];
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: string;
  connectedAt: string;
  lastValidatedAt: string;
  lastSuccessfulSyncAt?: string;
  syncPausedAt?: string;
  lastErrorCategory?: string;
  lastErrorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionSummary {
  totalConnectedAccounts: number;
  activeConnections: number;
  attentionRequired: number;
  availableProviders: number;
  totalProvidersInDirectory: number;
}

export interface OAuthStatePayload {
  state: string;
  provider: ProviderKey;
  workspaceId: string;
  userId: string;
  codeVerifier?: string;
  requestedScopes: string[];
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
}

// ─── Existing Canonical Models (Preserved for Analytics & Sync) ───────────────

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

export interface AdProviderAdapter {
  provider: AdProvider;

  validateAuth(encryptedAccessToken: string, encryptedRefreshToken?: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    refreshedToken?: string;
  }>;

  fetchAccounts(token: string): Promise<CanonicalAdAccount[]>;
  fetchCampaigns(token: string, accountExternalId: string): Promise<CanonicalCampaign[]>;
  fetchAdGroups(token: string, campaignExternalId: string): Promise<CanonicalAdGroup[]>;
  fetchAds(token: string, adGroupExternalId: string): Promise<CanonicalAd[]>;
  fetchMetrics(
    token: string,
    adExternalId: string,
    startDate: string,
    endDate: string
  ): Promise<CanonicalDailyMetric[]>;
}
