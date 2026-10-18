import {
  ProviderKey,
  ProviderMetadata,
  IntegrationReadiness,
} from "./types";

/**
 * Returns dynamic readiness status by checking environment variables and partner requirements.
 */
export function evaluateProviderReadiness(key: ProviderKey): {
  readiness: IntegrationReadiness;
  reason: string;
} {
  switch (key) {
    case "META": {
      const hasId = !!process.env.META_ADS_CLIENT_ID;
      const hasSecret = !!process.env.META_ADS_CLIENT_SECRET;
      if (hasId && hasSecret) {
        return {
          readiness: "AVAILABLE",
          reason: "Meta Graph API v19.0 adapter is fully implemented and configured with application credentials.",
        };
      }
      return {
        readiness: "REQUIRES_SETUP",
        reason: "Meta app credentials (META_ADS_CLIENT_ID, META_ADS_CLIENT_SECRET) must be configured in environment variables.",
      };
    }

    case "GOOGLE_ADS": {
      const hasId = !!process.env.GOOGLE_ADS_CLIENT_ID;
      const hasSecret = !!process.env.GOOGLE_ADS_CLIENT_SECRET;
      const hasDevToken = !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      if (hasId && hasSecret && hasDevToken) {
        return {
          readiness: "AVAILABLE",
          reason: "Google Ads API v17 adapter is implemented with OAuth and Developer Token configured.",
        };
      }
      return {
        readiness: "REQUIRES_SETUP",
        reason: "Google Ads OAuth credentials and Google Developer Token (GOOGLE_ADS_DEVELOPER_TOKEN) required.",
      };
    }

    case "LINKEDIN":
      return {
        readiness: "REQUIRES_APPROVAL",
        reason: "LinkedIn Marketing Developer Platform (MDP) application approval is required by LinkedIn.",
      };

    case "AMAZON_ADS":
      return {
        readiness: "PARTNER_ACCESS_REQUIRED",
        reason: "Amazon Ads API requires an approved Amazon Advertising Partner account and direct API invitation.",
      };

    case "MICROSOFT_ADS":
      return {
        readiness: "REQUIRES_SETUP",
        reason: "Microsoft Advertising Developer Center API token and Azure App registration required.",
      };

    case "SNAPCHAT":
      return {
        readiness: "REQUIRES_APPROVAL",
        reason: "Snap Marketing API developer access requires business verification and Snap approval.",
      };

    case "PINTEREST":
      return {
        readiness: "REQUIRES_APPROVAL",
        reason: "Pinterest API v5 requires trial or standard access review for ads management scopes.",
      };

    case "X_ADS":
      return {
        readiness: "REQUIRES_APPROVAL",
        reason: "X Ads API access requires developer application approval and managed ads account tier.",
      };

    case "REDDIT":
      return {
        readiness: "REQUIRES_APPROVAL",
        reason: "Reddit Ads API is restricted to whitelisted partner organizations.",
      };

    case "FLIPKART_ADS":
      return {
        readiness: "PARTNER_ACCESS_REQUIRED",
        reason: "Flipkart Commerce Ads API requires a direct retail media enterprise contract with Flipkart Commerce Cloud.",
      };

    case "JIOADS":
      return {
        readiness: "PARTNER_ACCESS_REQUIRED",
        reason: "JioAds platform access requires an enterprise partnership agreement and dedicated agency credentials.",
      };

    case "SHARECHAT":
      return {
        readiness: "PARTNER_ACCESS_REQUIRED",
        reason: "ShareChat / Moj Ads API access is provisioned via direct agency partner onboarding.",
      };

    case "INMOBI":
      return {
        readiness: "PARTNER_ACCESS_REQUIRED",
        reason: "InMobi Advertising access requires InMobi DSP/Exchange partner credentials.",
      };

    default:
      return {
        readiness: "COMING_SOON",
        reason: "Integration pipeline in development.",
      };
  }
}

/**
 * Static baseline metadata for all supported advertising providers.
 */
export const PROVIDER_CATALOG: Omit<ProviderMetadata, "readiness" | "readinessReason">[] = [
  // ─── Core Providers ────────────────────────────────────────────────────────
  {
    key: "META",
    displayName: "Meta Ads (Facebook & Instagram)",
    category: "SOCIAL",
    logo: "Meta",
    supportedProducts: ["Facebook Feed", "Instagram Stories & Reels", "Audience Network", "Messenger Ads"],
    documentationUrl: "https://developers.facebook.com/docs/marketing-apis",
    developerPortalUrl: "https://developers.facebook.com/apps",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Spend", "CTR", "CPC", "CPM", "Conversions", "ROAS", "Frequency", "Video Views"],
    currentVersion: "Graph API v19.0",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: [
      "Attribution window changes from Meta default to 7-day click / 1-day view.",
      "SKAdNetwork reporting delays may apply for iOS 14+ conversions (24-72h).",
      "App review required for public multi-tenant production access.",
    ],
    requiredCredentials: [
      {
        key: "client_id",
        label: "Meta App ID",
        envVar: "META_ADS_CLIENT_ID",
        description: "Your Meta App ID from developers.facebook.com",
        configured: !!process.env.META_ADS_CLIENT_ID,
      },
      {
        key: "client_secret",
        label: "Meta App Secret",
        envVar: "META_ADS_CLIENT_SECRET",
        description: "Your Meta App Secret (kept secure server-side)",
        configured: !!process.env.META_ADS_CLIENT_SECRET,
      },
    ],
    permissions: [
      {
        scope: "ads_read",
        name: "Read Ad Accounts & Campaigns",
        description: "View ad account details, campaigns, ad sets, and creative specifications.",
        purpose: "Required to identify campaigns, inspect targeting configurations, and detect creative issues.",
        required: true,
        accessType: "READ_ONLY",
        selectable: false,
        featureDependencies: ["Account Discovery", "Campaign Hierarchy", "Audit Diagnostics"],
      },
      {
        scope: "read_insights",
        name: "Read Performance Insights",
        description: "Retrieve aggregated performance metrics: spend, impressions, clicks, conversions, and ROAS.",
        purpose: "Required to run statistical anomaly detection and calculate evidence-based maturity metrics.",
        required: true,
        accessType: "READ_ONLY",
        selectable: false,
        featureDependencies: ["Statistical Modeling", "Anomaly Detection", "Maturity Scoring", "Performance Baselines"],
      },
      {
        scope: "business_management",
        name: "Business Manager Access",
        description: "Access ad accounts shared under Meta Business Portfolios / Agency accounts.",
        purpose: "Allows agencies to discover and connect client accounts managed through Business Manager.",
        required: false,
        accessType: "READ_ONLY",
        selectable: true,
        featureDependencies: ["Agency Client Accounts", "Multi-business Portfolios"],
      },
    ],
  },
  {
    key: "GOOGLE_ADS",
    displayName: "Google Ads",
    category: "SEARCH",
    logo: "Google",
    supportedProducts: ["Google Search", "Performance Max", "YouTube Video Ads", "Display Network", "Demand Gen"],
    documentationUrl: "https://developers.google.com/google-ads/api/docs/start",
    developerPortalUrl: "https://console.cloud.google.com/apis/credentials",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Cost (Spend)", "Conversions", "Conversion Value", "CTR", "Average CPC", "ROAS"],
    currentVersion: "Google Ads API v17",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: [
      "Requires an approved Google Ads Developer Token (Test or Standard Access).",
      "Manager Accounts (MCC) require customer-client expansion queries.",
      "Conversion lag can cause recent 24-48 hours to be incomplete.",
    ],
    requiredCredentials: [
      {
        key: "client_id",
        label: "OAuth Client ID",
        envVar: "GOOGLE_ADS_CLIENT_ID",
        description: "OAuth 2.0 Web Client ID from Google Cloud Console",
        configured: !!process.env.GOOGLE_ADS_CLIENT_ID,
      },
      {
        key: "client_secret",
        label: "OAuth Client Secret",
        envVar: "GOOGLE_ADS_CLIENT_SECRET",
        description: "OAuth 2.0 Client Secret (kept secure server-side)",
        configured: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
      },
      {
        key: "developer_token",
        label: "Google Ads Developer Token",
        envVar: "GOOGLE_ADS_DEVELOPER_TOKEN",
        description: "Developer Token issued by Google Ads API Center",
        configured: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      },
    ],
    permissions: [
      {
        scope: "https://www.googleapis.com/auth/adwords",
        name: "Google Ads API Access",
        description: "Allows AgencyPilot to retrieve accessible customer ad accounts and read-only campaign metrics.",
        purpose: "Required to list accessible accounts, query GoogleAdsService searchStream for campaign metrics.",
        required: true,
        accessType: "READ_ONLY",
        selectable: false,
        featureDependencies: ["Account Discovery", "Search Performance", "PMax Analysis", "Video Ad Baselines"],
      },
    ],
  },

  // ─── Additional International Providers ────────────────────────────────────
  {
    key: "LINKEDIN",
    displayName: "LinkedIn Ads",
    category: "SOCIAL",
    logo: "Linkedin",
    supportedProducts: ["Sponsored Content", "Message Ads", "Dynamic Ads", "Lead Gen Forms"],
    documentationUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
    developerPortalUrl: "https://www.linkedin.com/developers/apps",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Total Spend", "Leads", "Company Page Follows"],
    currentVersion: "LinkedIn Marketing API v202404",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Requires LinkedIn Marketing Developer Platform approval."],
    requiredCredentials: [
      {
        key: "client_id",
        label: "Client ID",
        envVar: "LINKEDIN_ADS_CLIENT_ID",
        description: "LinkedIn App Client ID",
        configured: !!process.env.LINKEDIN_ADS_CLIENT_ID,
      },
    ],
    permissions: [
      {
        scope: "r_ads_reporting",
        name: "Read Ads Reporting",
        description: "Read ad analytics and campaign reporting data.",
        purpose: "Analyze B2B campaign ROI and lead costs.",
        required: true,
        accessType: "READ_ONLY",
        selectable: false,
        featureDependencies: ["Lead Cost Analysis", "B2B Campaign Diagnostics"],
      },
    ],
  },
  {
    key: "AMAZON_ADS",
    displayName: "Amazon Ads",
    category: "RETAIL_MARKETPLACE",
    logo: "ShoppingBag",
    supportedProducts: ["Sponsored Products", "Sponsored Brands", "Sponsored Display", "Amazon DSP"],
    documentationUrl: "https://advertising.amazon.com/API/docs/en-us",
    developerPortalUrl: "https://developer.amazon.com",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Attributed Sales", "ACOS", "ROAS", "Spend"],
    currentVersion: "Amazon Ads API v3",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Requires approved Amazon Ads Partner Network application."],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "MICROSOFT_ADS",
    displayName: "Microsoft Advertising",
    category: "SEARCH",
    logo: "Monitor",
    supportedProducts: ["Bing Search", "Microsoft Audience Network", "Retail Ads"],
    documentationUrl: "https://learn.microsoft.com/en-us/advertising/guides/",
    developerPortalUrl: "https://developers.ads.microsoft.com",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Spend", "Conversions", "Average CPC"],
    currentVersion: "Bing Ads API v13",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Requires Microsoft Advertising Developer Token."],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "SNAPCHAT",
    displayName: "Snapchat Ads",
    category: "SOCIAL",
    logo: "Ghost",
    supportedProducts: ["Single Image/Video Ads", "Story Ads", "Collection Ads", "AR Lens"],
    documentationUrl: "https://marketingapi.snapchat.com/docs/",
    developerPortalUrl: "https://businessapi.snapchat.com/portal",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Swipes", "Spend", "Install Conversions", "Video Views"],
    currentVersion: "Snap Marketing API v1",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Requires Snap Business Manager API approval."],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "PINTEREST",
    displayName: "Pinterest Ads",
    category: "SOCIAL",
    logo: "Pin",
    supportedProducts: ["Promoted Pins", "Shopping Ads", "Video Pins"],
    documentationUrl: "https://developers.pinterest.com/docs/api/v5/",
    developerPortalUrl: "https://developers.pinterest.com/apps",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Pin Clicks", "Outbound Clicks", "Saves", "Spend", "ROAS"],
    currentVersion: "Pinterest API v5",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Standard access requires Pinterest App Review."],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "X_ADS",
    displayName: "X Ads (Twitter)",
    category: "SOCIAL",
    logo: "Twitter",
    supportedProducts: ["Promoted Posts", "Follower Ads", "Amplify Pre-roll", "Takeover"],
    documentationUrl: "https://developer.x.com/en/docs/x-ads-api",
    developerPortalUrl: "https://developer.x.com",
    authorizationMethod: "OAUTH2_PKCE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Engagements", "Spend", "Retweets", "Replies"],
    currentVersion: "X Ads API v12",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Requires X Ads API approval and enterprise developer account tier."],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "REDDIT",
    displayName: "Reddit Ads",
    category: "SOCIAL",
    logo: "MessageSquare",
    supportedProducts: ["Promoted Posts", "Conversation Ads", "Video Ads"],
    documentationUrl: "https://business.reddithelp.com/",
    developerPortalUrl: "https://www.reddit.com/prefs/apps",
    authorizationMethod: "OAUTH2_CODE",
    accountDiscoverySupported: true,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Spend", "Upvotes", "Comments"],
    currentVersion: "Reddit Ads API v1",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: ["Access is limited to approved partners."],
    requiredCredentials: [],
    permissions: [],
  },

  // ─── India-Focused & Retail Media Providers ────────────────────────────────
  {
    key: "FLIPKART_ADS",
    displayName: "Flipkart Ads (Commerce Cloud)",
    category: "RETAIL_MARKETPLACE",
    logo: "Package",
    supportedProducts: ["Product Listing Ads (PLA)", "Product Contextual Ads (PCA)", "Display Banner Ads"],
    documentationUrl: "https://seller.flipkart.com/advertising-platform",
    developerPortalUrl: "https://commercecloud.flipkart.com",
    authorizationMethod: "PARTNER_PORTAL",
    accountDiscoverySupported: false,
    reportingSupported: true,
    supportedMetrics: ["Impressions", "Clicks", "Spend", "Direct Orders", "GMV", "ROAS"],
    currentVersion: "Flipkart Commerce Cloud API",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: [
      "Does not provide public OAuth self-serve access.",
      "Requires direct enterprise retail media contract and seller authorization token.",
    ],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "JIOADS",
    displayName: "JioAds",
    category: "MOBILE_NETWORKS",
    logo: "Radio",
    supportedProducts: ["JioCinema Video Ads", "MyJio Display & Banner", "JioSaavn Audio Ads", "JioFiber TV"],
    documentationUrl: "https://jioads.com/",
    developerPortalUrl: "https://jioads.com/contact-us",
    authorizationMethod: "PARTNER_PORTAL",
    accountDiscoverySupported: false,
    reportingSupported: true,
    supportedMetrics: ["Video Impressions", "Audio Listens", "Completed Views (VTR)", "Clicks", "CTR", "Spend"],
    currentVersion: "JioAds Partner API v2",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: [
      "JioAds reporting APIs are provisioned strictly through agency agreements.",
      "Requires direct IP whitelisting and corporate API key.",
    ],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "SHARECHAT",
    displayName: "ShareChat & Moj Ads",
    category: "SOCIAL",
    logo: "Share2",
    supportedProducts: ["Moj Short Video In-Feed", "ShareChat Native Display", "Interstitial Ads"],
    documentationUrl: "https://ads.sharechat.com/",
    developerPortalUrl: "https://ads.sharechat.com/",
    authorizationMethod: "PARTNER_PORTAL",
    accountDiscoverySupported: false,
    reportingSupported: true,
    supportedMetrics: ["Video Views", "Engagements", "Clicks", "Installs", "Spend", "CTR"],
    currentVersion: "ShareChat Ads API",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: [
      "Public self-serve OAuth is unavailable.",
      "Reporting APIs require managed onboarding via ShareChat Ads Business Team.",
    ],
    requiredCredentials: [],
    permissions: [],
  },
  {
    key: "INMOBI",
    displayName: "InMobi Advertising",
    category: "MOBILE_NETWORKS",
    logo: "Smartphone",
    supportedProducts: ["In-App Video", "Playable Ads", "Native Display", "Programmatic DSP"],
    documentationUrl: "https://www.inmobi.com/",
    developerPortalUrl: "https://developer.inmobi.com/",
    authorizationMethod: "API_KEY",
    accountDiscoverySupported: false,
    reportingSupported: true,
    supportedMetrics: ["Ad Requests", "Impressions", "Clicks", "CTR", "Fill Rate", "eCPM", "Spend"],
    currentVersion: "InMobi Reporting API v3",
    lastVerifiedAt: "2026-10-18T00:00:00Z",
    knownLimitations: [
      "Requires advertiser reporting API secret key generated in InMobi DSP dashboard.",
      "Subject to regional QPS rate limits.",
    ],
    requiredCredentials: [],
    permissions: [],
  },
];

/**
 * Returns complete provider registry with computed live readiness.
 */
export function getAllProviders(): ProviderMetadata[] {
  return PROVIDER_CATALOG.map((provider) => {
    const { readiness, reason } = evaluateProviderReadiness(provider.key);
    // Update configured flag on credentials dynamically
    const requiredCredentials = provider.requiredCredentials.map((c) => ({
      ...c,
      configured: !!process.env[c.envVar],
    }));

    return {
      ...provider,
      readiness,
      readinessReason: reason,
      requiredCredentials,
    };
  });
}

/**
 * Get single provider by key with live computed readiness.
 */
export function getProviderByKey(key: ProviderKey): ProviderMetadata | null {
  const providers = getAllProviders();
  return providers.find((p) => p.key === key) || null;
}
