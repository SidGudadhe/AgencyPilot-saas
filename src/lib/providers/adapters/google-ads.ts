import {
  IProviderOAuthAdapter,
  ProviderApiError,
} from "./base";
import {
  DiscoveredAdAccount,
  ConnectionValidationResult,
  ConnectionStatus,
} from "../types";

export class GoogleAdsAdapter implements IProviderOAuthAdapter {
  public provider = "GOOGLE_ADS" as const;
  private readonly apiVersion = "v17";
  private readonly baseUrl = "https://googleads.googleapis.com/v17";

  private getClientId(): string {
    const id = process.env.GOOGLE_ADS_CLIENT_ID;
    if (!id) {
      throw new ProviderApiError(
        "Google Ads Client ID (GOOGLE_ADS_CLIENT_ID) is not configured in server environment variables.",
        "GOOGLE_ADS",
        "API_CONFIGURATION_REQUIRED",
        "Configure GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET in your server environment."
      );
    }
    return id;
  }

  private getClientSecret(): string {
    const secret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    if (!secret) {
      throw new ProviderApiError(
        "Google Ads Client Secret (GOOGLE_ADS_CLIENT_SECRET) is not configured in server environment variables.",
        "GOOGLE_ADS",
        "API_CONFIGURATION_REQUIRED",
        "Configure GOOGLE_ADS_CLIENT_SECRET in your server environment."
      );
    }
    return secret;
  }

  private getDeveloperToken(): string {
    const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!token) {
      throw new ProviderApiError(
        "Google Ads Developer Token (GOOGLE_ADS_DEVELOPER_TOKEN) is not configured.",
        "GOOGLE_ADS",
        "API_CONFIGURATION_REQUIRED",
        "Set GOOGLE_ADS_DEVELOPER_TOKEN from your Google Ads API Center."
      );
    }
    return token;
  }

  public getAuthorizationUrl(
    state: string,
    redirectUri: string,
    options?: { permissions?: string[] }
  ): { url: string } {
    const clientId = this.getClientId();
    const scopes = options?.permissions && options.permissions.length > 0
      ? options.permissions
      : ["https://www.googleapis.com/auth/adwords"];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: state,
      include_granted_scopes: "true",
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
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

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new ProviderApiError(
        data.error_description || data.error || "Failed exchanging Google authorization code",
        "GOOGLE_ADS",
        "AUTHORIZATION_FAILED",
        "Verify your redirect URI matches Google Cloud Console and that the authorization code is fresh.",
        res.status
      );
    }

    const grantedScopes = data.scope ? data.scope.split(" ") : ["https://www.googleapis.com/auth/adwords"];
    const expiresInSec = data.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt,
      grantedScopes,
    };
  }

  public async refreshCredentials(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new ProviderApiError(
        data.error_description || "Failed refreshing Google OAuth token",
        "GOOGLE_ADS",
        "TOKEN_EXPIRED",
        "Google refresh token has been revoked or expired. User must reconnect.",
        res.status
      );
    }

    const expiresInSec = data.expires_in || 3600;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
    };
  }

  public async discoverAccounts(
    accessToken: string,
    options?: { developerToken?: string }
  ): Promise<DiscoveredAdAccount[]> {
    const devToken = options?.developerToken || this.getDeveloperToken();

    const res = await fetch(`${this.baseUrl}/customers:listAccessibleCustomers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": devToken,
      },
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const err = data.error || {};
      const msg = err.message || "Failed to list accessible customers from Google Ads API";
      throw new ProviderApiError(
        msg,
        "GOOGLE_ADS",
        err.status === "PERMISSION_DENIED" ? "ACCOUNT_ACCESS_DENIED" : "API_ERROR",
        "Check that your Google Ads Developer Token is valid and approved, and that the account has accessible customers.",
        res.status
      );
    }

    const resourceNames: string[] = Array.isArray(data.resourceNames) ? data.resourceNames : [];

    // Parse each customer id (e.g. "customers/1234567890" -> "1234567890")
    const discovered: DiscoveredAdAccount[] = [];

    for (const resName of resourceNames) {
      const customerId = resName.replace("customers/", "").trim();
      let accountName = `Google Ads (${customerId})`;
      let currency = "INR";
      let timezone = "Asia/Kolkata";
      let status = "ACTIVE";

      // Attempt to retrieve descriptive details for each customer
      try {
        const queryRes = await fetch(`${this.baseUrl}/customers/${customerId}/googleAds:searchStream`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": devToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.status FROM customer LIMIT 1",
          }),
        });

        if (queryRes.ok) {
          const queryData = await queryRes.json();
          if (Array.isArray(queryData) && queryData[0]?.results?.[0]?.customer) {
            const cust = queryData[0].results[0].customer;
            if (cust.descriptiveName) accountName = cust.descriptiveName;
            if (cust.currencyCode) currency = cust.currencyCode;
            if (cust.timeZone) timezone = cust.timeZone;
            if (cust.status) status = cust.status;
          }
        }
      } catch {
        // Fallback to basic customer ID if individual search stream is rate limited
      }

      discovered.push({
        externalId: customerId,
        name: accountName,
        currency,
        timezone,
        status,
        alreadyConnected: false,
        reportingAvailable: status === "ENABLED" || status === "ACTIVE",
      });
    }

    return discovered;
  }

  public async validateConnection(
    accessToken: string,
    accountId: string,
    options?: { developerToken?: string }
  ): Promise<ConnectionValidationResult> {
    const startTime = Date.now();
    const cleanId = accountId.replace(/[^0-9]/g, "");
    const devToken = options?.developerToken || this.getDeveloperToken();
    const checksPerformed: { name: string; passed: boolean; details?: string }[] = [];

    // Check 1: Tokeninfo endpoint
    let tokenValid = false;
    let grantedScopes: string[] = [];
    try {
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
      const tokenInfo = await tokenInfoRes.json();
      if (tokenInfoRes.ok && tokenInfo.scope) {
        tokenValid = true;
        grantedScopes = tokenInfo.scope.split(" ");
        checksPerformed.push({
          name: "Google OAuth Token Validity",
          passed: true,
          details: `Expires in ${tokenInfo.expires_in}s. Aud: ${tokenInfo.aud || "Google"}`,
        });
      } else {
        checksPerformed.push({
          name: "Google OAuth Token Validity",
          passed: false,
          details: tokenInfo.error_description || "Token invalid",
        });
      }
    } catch (err) {
      checksPerformed.push({
        name: "Google OAuth Token Validity",
        passed: false,
        details: (err as Error).message,
      });
    }

    if (!tokenValid) {
      return {
        valid: false,
        status: "TOKEN_EXPIRED",
        provider: "GOOGLE_ADS",
        externalAccountId: cleanId,
        grantedScopes: [],
        checksPerformed,
        timestamp: new Date().toISOString(),
        errorCategory: "TOKEN_EXPIRED",
        guidance: "Your Google OAuth access token is expired. Please reconnect.",
        latencyMs: Date.now() - startTime,
      };
    }

    // Check 2: Google Ads Scope
    const hasAdwordsScope = grantedScopes.some((s) => s.includes("adwords"));
    checksPerformed.push({
      name: "Google Ads Scope (https://www.googleapis.com/auth/adwords)",
      passed: hasAdwordsScope,
      details: hasAdwordsScope ? "Adwords scope granted" : "Adwords scope missing",
    });

    // Check 3: Real Google Ads Reporting Query
    let querySuccessful = false;
    let accountName = `Google Ads (${cleanId})`;
    let requestId: string | undefined;

    try {
      const searchRes = await fetch(`${this.baseUrl}/customers/${cleanId}/googleAds:searchStream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1",
        }),
      });

      requestId = searchRes.headers.get("request-id") || undefined;
      const searchData = await searchRes.json();

      if (searchRes.ok && Array.isArray(searchData)) {
        querySuccessful = true;
        if (searchData[0]?.results?.[0]?.customer?.descriptiveName) {
          accountName = searchData[0].results[0].customer.descriptiveName;
        }
        checksPerformed.push({
          name: "Google Ads API Reporting Query (searchStream)",
          passed: true,
          details: "Successfully queried customer metadata via Google Ads API.",
        });
      } else {
        const errorDetail = searchData.error?.message || "Customer search stream query failed";
        checksPerformed.push({
          name: "Google Ads API Reporting Query (searchStream)",
          passed: false,
          details: errorDetail,
        });
      }
    } catch (err) {
      checksPerformed.push({
        name: "Google Ads API Reporting Query (searchStream)",
        passed: false,
        details: (err as Error).message,
      });
    }

    let status: ConnectionStatus = "CONNECTED";
    let errorCategory: string | undefined;
    let guidance: string | undefined;

    if (!hasAdwordsScope) {
      status = "PERMISSION_REQUIRED";
      errorCategory = "PERMISSION_REQUIRED";
      guidance = "Google Ads scope was not granted. Please re-authorize and check the required permissions.";
    } else if (!querySuccessful) {
      status = "CONNECTED_WITH_LIMITATIONS";
      errorCategory = "DEVELOPER_TOKEN_OR_CUSTOMER_ACCESS_ISSUE";
      guidance = "OAuth valid, but Google Ads API query failed. Verify your Google Ads Developer Token approval status and account permissions.";
    }

    return {
      valid: status === "CONNECTED",
      status,
      provider: "GOOGLE_ADS",
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
      const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return res.ok;
    } catch (err) {
      console.warn("Google token revocation failed:", err);
      return false;
    }
  }
}
