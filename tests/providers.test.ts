import {
  getAllProviders,
  getProviderByKey,
  evaluateProviderReadiness,
} from "../src/lib/providers/registry";
import {
  encryptToken,
  decryptToken,
  maskAccountId,
} from "../src/lib/encryption";
import {
  saveOAuthState,
  validateAndConsumeOAuthState,
  saveConnectedAccount,
  getConnectedAccounts,
  getConnectedAccountById,
  pauseAccountSync,
  resumeAccountSync,
  disconnectAccount,
  getConnectionSummary,
  recordConnectionAuditEvent,
  getLocalAuditEvents,
} from "../src/lib/providers/storage";
import { getProviderAdapter } from "../src/lib/providers/factory";
import { MetaAdsAdapter } from "../src/lib/providers/adapters/meta";
import { GoogleAdsAdapter } from "../src/lib/providers/adapters/google-ads";

describe("Ad Provider Connections System — Comprehensive Test Suite", () => {
  const testWorkspace1 = `ws_test_prov_1_${Date.now()}`;
  const testWorkspace2 = `ws_test_prov_2_${Date.now()}`;

  // ─── 1. Provider Directory & India-first Registry ──────────────────────────

  test("Directory contains all 13 required providers across categories", () => {
    const providers = getAllProviders();
    expect(providers.length).toBe(13);

    const keys = providers.map((p) => p.key);
    // Core
    expect(keys).toContain("META");
    expect(keys).toContain("GOOGLE_ADS");
    // International
    expect(keys).toContain("LINKEDIN");
    expect(keys).toContain("AMAZON_ADS");
    expect(keys).toContain("MICROSOFT_ADS");
    expect(keys).toContain("SNAPCHAT");
    expect(keys).toContain("PINTEREST");
    expect(keys).toContain("X_ADS");
    expect(keys).toContain("REDDIT");
    // India-focused & Retail Media
    expect(keys).toContain("FLIPKART_ADS");
    expect(keys).toContain("JIOADS");
    expect(keys).toContain("SHARECHAT");
    expect(keys).toContain("INMOBI");
  });

  test("Providers have accurate official documentation and developer URLs", () => {
    const meta = getProviderByKey("META");
    expect(meta).not.toBeNull();
    expect(meta?.documentationUrl).toContain("developers.facebook.com");
    expect(meta?.developerPortalUrl).toContain("developers.facebook.com/apps");

    const google = getProviderByKey("GOOGLE_ADS");
    expect(google).not.toBeNull();
    expect(google?.documentationUrl).toContain("developers.google.com/google-ads");

    const flipkart = getProviderByKey("FLIPKART_ADS");
    expect(flipkart?.readiness).toBe("PARTNER_ACCESS_REQUIRED");

    const jioads = getProviderByKey("JIOADS");
    expect(jioads?.readiness).toBe("PARTNER_ACCESS_REQUIRED");
  });

  test("Readiness evaluation dynamically reflects environment variable state", () => {
    // When credentials not set in process.env, evaluates to REQUIRES_SETUP
    const metaStatus = evaluateProviderReadiness("META");
    if (!process.env.META_ADS_CLIENT_ID) {
      expect(metaStatus.readiness).toBe("REQUIRES_SETUP");
      expect(metaStatus.reason).toContain("META_ADS_CLIENT_ID");
    }

    const googleStatus = evaluateProviderReadiness("GOOGLE_ADS");
    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      expect(googleStatus.readiness).toBe("REQUIRES_SETUP");
      expect(googleStatus.reason).toContain("GOOGLE_ADS_DEVELOPER_TOKEN");
    }
  });

  // ─── 2. Permission Catalog & Least-Privilege Access ────────────────────────

  test("Meta Ads permission catalog enforces read-only reporting as default", () => {
    const meta = getProviderByKey("META");
    expect(meta).not.toBeNull();

    const adsRead = meta?.permissions.find((p) => p.scope === "ads_read");
    expect(adsRead).toBeDefined();
    expect(adsRead?.accessType).toBe("READ_ONLY");
    expect(adsRead?.required).toBe(true);

    const insights = meta?.permissions.find((p) => p.scope === "read_insights");
    expect(insights).toBeDefined();
    expect(insights?.accessType).toBe("READ_ONLY");
    expect(insights?.required).toBe(true);

    // Business management is optional
    const biz = meta?.permissions.find((p) => p.scope === "business_management");
    expect(biz).toBeDefined();
    expect(biz?.required).toBe(false);
    expect(biz?.selectable).toBe(true);
  });

  test("Google Ads permissions specify official adwords reporting scope", () => {
    const google = getProviderByKey("GOOGLE_ADS");
    expect(google).not.toBeNull();
    const adwordsScope = google?.permissions.find((p) =>
      p.scope.includes("adwords")
    );
    expect(adwordsScope).toBeDefined();
    expect(adwordsScope?.accessType).toBe("READ_ONLY");
  });

  // ─── 3. Cryptographic Token Secrecy (AES-256-GCM) ──────────────────────────

  test("encryptToken and decryptToken securely protect OAuth secrets at rest", () => {
    const sensitiveToken = "EAAFlkj234908sdf098asdf_real_meta_long_lived_token";
    const encrypted = encryptToken(sensitiveToken);

    // Ciphertext must not match or contain plaintext
    expect(encrypted).not.toContain(sensitiveToken);
    expect(encrypted.split(":").length).toBe(3); // iv:tag:ciphertext

    // Decryption restores exact secret
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(sensitiveToken);
  });

  test("maskAccountId masks sensitive account IDs safely for client views", () => {
    expect(maskAccountId("act_123456789012")).toBe("act_***9012");
    expect(maskAccountId("1234567890")).toBe("***7890");
    expect(maskAccountId("123")).toBe("123");
  });

  // ─── 4. OAuth State CSRF & Single-Use Replay Protection ─────────────────────

  test("saveOAuthState and validateAndConsumeOAuthState prevent replay attacks", () => {
    const testState = `state_${Math.random().toString(36).substring(2, 15)}`;
    saveOAuthState({
      state: testState,
      provider: "META",
      workspaceId: testWorkspace1,
      userId: "usr_test_1",
      requestedScopes: ["ads_read"],
      redirectUri: "http://localhost:3000/api/providers/callback",
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // 1. First consume succeeds
    const consumed = validateAndConsumeOAuthState(testState, testWorkspace1);
    expect(consumed).not.toBeNull();
    expect(consumed?.provider).toBe("META");
    expect(consumed?.workspaceId).toBe(testWorkspace1);

    // 2. Second consume fails (replay attack prevented!)
    const replayed = validateAndConsumeOAuthState(testState, testWorkspace1);
    expect(replayed).toBeNull();
  });

  test("validateAndConsumeOAuthState rejects mismatched workspace IDs", () => {
    const csrfState = `state_csrf_${Date.now()}`;
    saveOAuthState({
      state: csrfState,
      provider: "GOOGLE_ADS",
      workspaceId: testWorkspace1,
      userId: "usr_attacker",
      requestedScopes: [],
      redirectUri: "http://localhost:3000/api/providers/callback",
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    });

    // Attempting to consume state in a different workspace context fails
    const invalidWorkspace = validateAndConsumeOAuthState(csrfState, testWorkspace2);
    expect(invalidWorkspace).toBeNull();
  });

  // ─── 5. Provider Adapters & URL Generation ─────────────────────────────────

  test("MetaAdsAdapter generates official OAuth dialog URL with CSRF state", () => {
    process.env.META_ADS_CLIENT_ID = "mock_meta_app_123";
    process.env.META_ADS_CLIENT_SECRET = "mock_meta_secret_456";

    const adapter = new MetaAdsAdapter();
    const { url } = adapter.getAuthorizationUrl(
      "test_state_123",
      "http://localhost:3000/api/providers/callback",
      { permissions: ["ads_read", "read_insights"] }
    );

    expect(url).toContain("facebook.com/v19.0/dialog/oauth");
    expect(url).toContain("client_id=mock_meta_app_123");
    expect(url).toContain("state=test_state_123");
    expect(url).toContain("scope=ads_read%2Cread_insights");
  });

  test("GoogleAdsAdapter generates official Google OAuth URL with offline access", () => {
    process.env.GOOGLE_ADS_CLIENT_ID = "mock_google_client_789.apps.googleusercontent.com";
    process.env.GOOGLE_ADS_CLIENT_SECRET = "mock_google_secret_012";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "mock_dev_token_345";

    const adapter = new GoogleAdsAdapter();
    const { url } = adapter.getAuthorizationUrl(
      "google_state_456",
      "http://localhost:3000/api/providers/callback"
    );

    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=mock_google_client_789");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("state=google_state_456");
    expect(url).toContain("auth%2Fadwords");
  });

  test("getProviderAdapter throws informative error for partner-only networks", () => {
    expect(() => getProviderAdapter("FLIPKART_ADS")).toThrow(
      /enterprise partner onboarding/
    );
    expect(() => getProviderAdapter("JIOADS")).toThrow(
      /enterprise partner onboarding/
    );
  });

  // ─── 6. Account Persistence, Tenant Isolation & Lifecycle ─────────────────

  test("saveConnectedAccount encrypts tokens and isolates accounts by workspace", async () => {
    const acc1 = await saveConnectedAccount({
      workspaceId: testWorkspace1,
      provider: "META",
      externalAccountId: "act_99887766",
      accountName: "Client A Meta Ads",
      currency: "INR",
      timezone: "Asia/Kolkata",
      rawAccessToken: "raw_secret_meta_token_123",
      grantedScopes: ["ads_read", "read_insights"],
    });

    expect(acc1.id).toBeDefined();
    expect(acc1.workspaceId).toBe(testWorkspace1);
    expect(acc1.status).toBe("CONNECTED");
    // Token is encrypted in storage
    expect(acc1.encryptedAccessToken).not.toContain("raw_secret_meta_token_123");

    // Account is visible in testWorkspace1
    const ws1Accounts = await getConnectedAccounts(testWorkspace1);
    expect(ws1Accounts.some((a) => a.externalAccountId === "act_99887766")).toBe(true);

    // Account is strictly NOT visible in testWorkspace2 (tenant isolation)
    const ws2Accounts = await getConnectedAccounts(testWorkspace2);
    expect(ws2Accounts.some((a) => a.externalAccountId === "act_99887766")).toBe(false);
  });

  test("pauseAccountSync and resumeAccountSync properly toggle synchronization", async () => {
    // 1. Pause
    const paused = await pauseAccountSync(testWorkspace1, "act_99887766");
    expect(paused).not.toBeNull();
    expect(paused?.status).toBe("PAUSED");
    expect(paused?.syncPausedAt).toBeDefined();

    // Verify lookup reflects paused
    const lookedUp = await getConnectedAccountById(testWorkspace1, "act_99887766");
    expect(lookedUp?.status).toBe("PAUSED");

    // 2. Resume
    const resumed = await resumeAccountSync(testWorkspace1, "act_99887766");
    expect(resumed).not.toBeNull();
    expect(resumed?.status).toBe("CONNECTED");
    expect(resumed?.syncPausedAt).toBeUndefined();
  });

  test("disconnectAccount removes account and records connection audit event", async () => {
    const disconnected = await disconnectAccount(testWorkspace1, "act_99887766");
    expect(disconnected).toBe(true);

    // Verify account is removed from active accounts
    const after = await getConnectedAccountById(testWorkspace1, "act_99887766");
    expect(after).toBeNull();

    // Record audit event
    await recordConnectionAuditEvent(
      testWorkspace1,
      "usr_admin",
      "AD_ACCOUNT_DISCONNECTED",
      {
        provider: "META",
        externalAccountId: "act_99887766",
        accountName: "Client A Meta Ads",
      }
    );

    const audits = getLocalAuditEvents();
    const foundAudit = audits.find(
      (a) => a.workspaceId === testWorkspace1 && a.action === "AD_ACCOUNT_DISCONNECTED"
    );
    expect(foundAudit).toBeDefined();
    expect(foundAudit?.safeMetadata.externalAccountId).toBe("act_99887766");
    // Guarantee no secrets are ever stored in audit logs
    expect(JSON.stringify(foundAudit?.safeMetadata)).not.toContain("token");
  });

  test("getConnectionSummary accurately reports workspace KPI counts", async () => {
    // Add two test accounts to testWorkspace2
    await saveConnectedAccount({
      workspaceId: testWorkspace2,
      provider: "META",
      externalAccountId: "act_summary_1",
      accountName: "Summary Meta 1",
      currency: "INR",
      rawAccessToken: "raw_token_1",
      grantedScopes: ["ads_read"],
      status: "CONNECTED",
    });

    await saveConnectedAccount({
      workspaceId: testWorkspace2,
      provider: "GOOGLE_ADS",
      externalAccountId: "1122334455",
      accountName: "Summary Google 2",
      currency: "USD",
      rawAccessToken: "raw_token_2",
      grantedScopes: ["https://www.googleapis.com/auth/adwords"],
      status: "PERMISSION_REQUIRED",
    });

    const summary = await getConnectionSummary(testWorkspace2);
    expect(summary.totalConnectedAccounts).toBe(2);
    expect(summary.activeConnections).toBe(1);
    expect(summary.attentionRequired).toBe(1);
    expect(summary.totalProvidersInDirectory).toBe(13);
  });

  // ─── 7. Sandbox Developer Flow & Account Discovery ────────────────────────

  test("MetaAdsAdapter seamlessly handles sandbox developer codes and discovery", async () => {
    const adapter = new MetaAdsAdapter();
    const tokenResult = await adapter.exchangeAuthorizationCode(
      "sandbox_meta_test_code_123",
      "http://localhost:3000/api/providers/callback"
    );

    expect(tokenResult.accessToken).toContain("sandbox_meta_token_");
    expect(tokenResult.grantedScopes).toContain("ads_read");
    expect(tokenResult.grantedScopes).toContain("read_insights");

    const accounts = await adapter.discoverAccounts(tokenResult.accessToken);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(accounts[0].externalId).toContain("act_");
    expect(accounts[0].reportingAvailable).toBe(true);

    const validation = await adapter.validateConnection(
      tokenResult.accessToken,
      accounts[0].externalId
    );
    expect(validation.valid).toBe(true);
    expect(validation.status).toBe("CONNECTED");
    expect(validation.checksPerformed.length).toBe(4);
  });

  test("GoogleAdsAdapter seamlessly handles sandbox developer codes and discovery", async () => {
    const adapter = new GoogleAdsAdapter();
    const tokenResult = await adapter.exchangeAuthorizationCode(
      "sandbox_google_test_code_456",
      "http://localhost:3000/api/providers/callback"
    );

    expect(tokenResult.accessToken).toContain("sandbox_google_token_");
    expect(tokenResult.refreshToken).toBeDefined();
    expect(tokenResult.grantedScopes).toContain("https://www.googleapis.com/auth/adwords");

    const accounts = await adapter.discoverAccounts(tokenResult.accessToken);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(accounts[0].externalId).toBe("839-201-9482");
    expect(accounts[0].status).toBe("ACTIVE");

    const validation = await adapter.validateConnection(
      tokenResult.accessToken,
      accounts[0].externalId
    );
    expect(validation.valid).toBe(true);
    expect(validation.status).toBe("CONNECTED");
  });
});

