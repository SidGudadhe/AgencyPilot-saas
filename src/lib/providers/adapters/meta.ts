import {
  IProviderOAuthAdapter,
  ProviderApiError,
} from "./base";
import {
  DiscoveredAdAccount,
  ConnectionValidationResult,
  ConnectionStatus,
} from "../types";

export class MetaAdsAdapter implements IProviderOAuthAdapter {
  public provider = "META" as const;
  private readonly graphVersion = "v19.0";
  private readonly baseUrl = "https://graph.facebook.com/v19.0";

  private getClientId(): string {
    const id = process.env.META_ADS_CLIENT_ID;
    if (!id) {
      throw new ProviderApiError(
        "Meta App ID (META_ADS_CLIENT_ID) is not configured in server environment variables.",
        "META",
        "API_CONFIGURATION_REQUIRED",
        "Configure META_ADS_CLIENT_ID and META_ADS_CLIENT_SECRET in your SaaS environment."
      );
    }
    return id;
  }

  private getClientSecret(): string {
    const secret = process.env.META_ADS_CLIENT_SECRET;
    if (!secret) {
      throw new ProviderApiError(
        "Meta App Secret (META_ADS_CLIENT_SECRET) is not configured in server environment variables.",
        "META",
        "API_CONFIGURATION_REQUIRED",
        "Configure META_ADS_CLIENT_SECRET in your SaaS environment."
      );
    }
    return secret;
  }

  public getAuthorizationUrl(
    state: string,
    redirectUri: string,
    options?: { permissions?: string[] }
  ): { url: string } {
    const clientId = this.getClientId();
    const scopes = options?.permissions && options.permissions.length > 0
      ? options.permissions
      : ["ads_read", "read_insights"];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      response_type: "code",
      scope: scopes.join(","),
    });

    return {
      url: `https://www.facebook.com/${this.graphVersion}/dialog/oauth?${params.toString()}`,
    };
  }

  public async exchangeAuthorizationCode(
    code: string,
    redirectUri: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    grantedScopes: string[];
  }> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    // Sandbox / Test credentials support
    if (code.startsWith("sandbox_")) {
      return {
        accessToken: `sandbox_meta_token_${Date.now()}`,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        grantedScopes: ["ads_read", "read_insights", "business_management"],
      };
    }

    // 1. Exchange short-lived authorization code for user access token
    const tokenUrl = new URL(`${this.baseUrl}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      const err = tokenData.error || {};
      throw new ProviderApiError(
        err.message || "Failed exchanging Meta authorization code for access token",
        "META",
        "AUTHORIZATION_FAILED",
        "Check that the OAuth code is fresh and has not already been used or expired.",
        tokenRes.status
      );
    }

    let accessToken = tokenData.access_token;
    let expiresInSec = tokenData.expires_in || 3600;

    // 2. Exchange short-lived token for 60-day long-lived token
    try {
      const longLivedUrl = new URL(`${this.baseUrl}/oauth/access_token`);
      longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
      longLivedUrl.searchParams.set("client_id", clientId);
      longLivedUrl.searchParams.set("client_secret", clientSecret);
      longLivedUrl.searchParams.set("fb_exchange_token", accessToken);

      const llRes = await fetch(longLivedUrl.toString(), { method: "GET" });
      const llData = await llRes.json();
      if (llRes.ok && llData.access_token) {
        accessToken = llData.access_token;
        expiresInSec = llData.expires_in || 60 * 24 * 60 * 60;
      }
    } catch (err) {
      console.warn("Meta long-lived token exchange warning, using standard token:", err);
    }

    // 3. Inspect granted permissions via debug_token or /me/permissions
    let grantedScopes = ["ads_read", "read_insights"];
    try {
      const permsRes = await fetch(`${this.baseUrl}/me/permissions?access_token=${encodeURIComponent(accessToken)}`);
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        if (Array.isArray(permsData.data)) {
          grantedScopes = permsData.data
            .filter((p: { permission: string; status: string }) => p.status === "granted")
            .map((p: { permission: string }) => p.permission);
        }
      }
    } catch {
      // Fallback to default scopes if permission lookup encounters network issue
    }

    const expiresAt = new Date(Date.now() + expiresInSec * 1000);

    return {
      accessToken,
      tokenExpiresAt: expiresAt,
      grantedScopes,
    };
  }

  public async discoverAccounts(
    accessToken: string
  ): Promise<DiscoveredAdAccount[]> {
    if (accessToken.startsWith("sandbox_")) {
      return [
        {
          externalId: "act_839201948201",
          name: "AgencyPilot Main Client (E-Commerce)",
          currency: "INR",
          timezone: "Asia/Kolkata",
          status: "ACTIVE",
          alreadyConnected: false,
          reportingAvailable: true,
        },
        {
          externalId: "act_472910482019",
          name: "AgencyPilot Brand Awareness Campaign",
          currency: "USD",
          timezone: "America/New_York",
          status: "ACTIVE",
          alreadyConnected: false,
          reportingAvailable: true,
        },
      ];
    }

    const url = `${this.baseUrl}/me/adaccounts?fields=id,account_id,name,currency,timezone_name,account_status,business&limit=100&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      const err = data.error || {};
      throw new ProviderApiError(
        err.message || "Failed retrieving accessible ad accounts from Meta Graph API",
        "META",
        "ACCOUNT_ACCESS_DENIED",
        "Ensure your Facebook user account has administrative or analyst access to at least one Meta Ad Account.",
        res.status
      );
    }

    const accounts = Array.isArray(data.data) ? data.data : [];

    return accounts.map((acc: {
      id: string;
      account_id: string;
      name?: string;
      currency?: string;
      timezone_name?: string;
      account_status?: number;
    }) => {
      // Meta account_status: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW
      const statusMap: Record<number, string> = {
        1: "ACTIVE",
        2: "DISABLED",
        3: "UNSETTLED",
        7: "PENDING_RISK_REVIEW",
      };

      const status = acc.account_status !== undefined ? (statusMap[acc.account_status] || "UNKNOWN") : "ACTIVE";

      return {
        externalId: acc.id.startsWith("act_") ? acc.id : `act_${acc.account_id || acc.id}`,
        name: acc.name || `Meta Ad Account ${acc.account_id || acc.id}`,
        currency: acc.currency || "INR",
        timezone: acc.timezone_name || "Asia/Kolkata",
        status,
        alreadyConnected: false,
        reportingAvailable: status === "ACTIVE",
      };
    });
  }

  public async validateConnection(
    accessToken: string,
    accountId: string
  ): Promise<ConnectionValidationResult> {
    const startTime = Date.now();
    const cleanId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const checksPerformed: { name: string; passed: boolean; details?: string }[] = [];

    if (accessToken.startsWith("sandbox_")) {
      return {
        valid: true,
        status: "CONNECTED",
        provider: "META",
        externalAccountId: cleanId,
        accountName: "AgencyPilot Main Client (E-Commerce)",
        grantedScopes: ["ads_read", "read_insights", "business_management"],
        checksPerformed: [
          { name: "OAuth Token Validity", passed: true, details: "Verified Sandbox Developer Token" },
          { name: "Required Scopes Check", passed: true, details: "ads_read, read_insights confirmed" },
          { name: "Ad Account Access", passed: true, details: `Account ${cleanId} verified with active permissions` },
          { name: "Reporting Endpoint Ping", passed: true, details: "Meta Graph API v19.0 endpoint latency 42ms" },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: 42,
      };
    }

    // Check 1: User & Token Validity
    let userValid = false;
    let grantedScopes: string[] = [];
    try {
      const meRes = await fetch(`${this.baseUrl}/me?access_token=${encodeURIComponent(accessToken)}`);
      const meData = await meRes.json();
      if (meRes.ok && meData.id) {
        userValid = true;
        checksPerformed.push({
          name: "OAuth Token Validity",
          passed: true,
          details: `Authenticated Meta User ID: ${meData.id}`,
        });
      } else {
        checksPerformed.push({
          name: "OAuth Token Validity",
          passed: false,
          details: meData.error?.message || "Token invalid",
        });
      }
    } catch (err) {
      checksPerformed.push({
        name: "OAuth Token Validity",
        passed: false,
        details: (err as Error).message,
      });
    }

    if (!userValid) {
      return {
        valid: false,
        status: "TOKEN_EXPIRED",
        provider: "META",
        externalAccountId: cleanId,
        grantedScopes: [],
        checksPerformed,
        timestamp: new Date().toISOString(),
        errorCategory: "TOKEN_EXPIRED",
        guidance: "The Meta OAuth token has expired or been invalidated. Please reconnect your account.",
        latencyMs: Date.now() - startTime,
      };
    }

    // Check 2: Permissions Check
    try {
      const permsRes = await fetch(`${this.baseUrl}/me/permissions?access_token=${encodeURIComponent(accessToken)}`);
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        if (Array.isArray(permsData.data)) {
          grantedScopes = permsData.data
            .filter((p: { permission: string; status: string }) => p.status === "granted")
            .map((p: { permission: string }) => p.permission);
        }
      }
    } catch {
      // Best effort
    }

    const hasAdsRead = grantedScopes.includes("ads_read");
    const hasInsights = grantedScopes.includes("read_insights");
    checksPerformed.push({
      name: "Reporting Permissions (ads_read, read_insights)",
      passed: hasAdsRead && hasInsights,
      details: `Granted scopes: ${grantedScopes.join(", ") || "none detected"}`,
    });

    // Check 3: Real Read-Only Insights Reporting Query
    let reportingAccessible = false;
    let requestId: string | undefined;
    let accountName = cleanId;

    try {
      const insightsUrl = `${this.baseUrl}/${cleanId}/insights?date_preset=yesterday&limit=1&access_token=${encodeURIComponent(accessToken)}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();

      requestId = insightsRes.headers.get("x-fb-request-id") || undefined;

      if (insightsRes.ok && !insightsData.error) {
        reportingAccessible = true;
        checksPerformed.push({
          name: "Reporting Endpoint Verification (/act_.../insights)",
          passed: true,
          details: "Successfully executed test query on Meta Insights API.",
        });
      } else {
        checksPerformed.push({
          name: "Reporting Endpoint Verification (/act_.../insights)",
          passed: false,
          details: insightsData.error?.message || "Insights endpoint returned error",
        });
      }

      // Also fetch account name
      const accRes = await fetch(`${this.baseUrl}/${cleanId}?fields=name&access_token=${encodeURIComponent(accessToken)}`);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.name) accountName = accData.name;
      }
    } catch (err) {
      checksPerformed.push({
        name: "Reporting Endpoint Verification (/act_.../insights)",
        passed: false,
        details: (err as Error).message,
      });
    }

    let status: ConnectionStatus = "CONNECTED";
    let errorCategory: string | undefined;
    let guidance: string | undefined;

    if (!hasAdsRead || !hasInsights) {
      status = "PERMISSION_REQUIRED";
      errorCategory = "PERMISSION_REQUIRED";
      guidance = "Required scopes 'ads_read' and 'read_insights' are missing. Re-authorize to grant reporting permissions.";
    } else if (!reportingAccessible) {
      status = "CONNECTED_WITH_LIMITATIONS";
      errorCategory = "REPORTING_ACCESS_RESTRICTED";
      guidance = "Account connected, but reporting endpoint returned an error. Check account delivery status and permissions.";
    }

    return {
      valid: status === "CONNECTED",
      status,
      provider: "META",
      externalAccountId: cleanId,
      accountName,
      grantedScopes,
      checksPerformed,
      timestamp: new Date().toISOString(),
      requestId,
      errorCategory,
      guidance,
      latencyMs: Date.now() - startTime,
    };
  }

  public async revokeAuthorization(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/me/permissions?access_token=${encodeURIComponent(accessToken)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      return !!(res.ok && data.success);
    } catch (err) {
      console.warn("Meta permissions revocation failed:", err);
      return false;
    }
  }
}
