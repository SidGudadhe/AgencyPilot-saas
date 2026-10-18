import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { getProviderAdapter } from "@/lib/providers/factory";
import {
  validateAndConsumeOAuthState,
  getConnectedAccounts,
} from "@/lib/providers/storage";
import { encryptToken } from "@/lib/encryption";
import { ProviderApiError } from "@/lib/providers/adapters/base";

/**
 * GET handler: browser redirect from OAuth provider
 * Redirects back to SaaS providers page with code and state parameters.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code || !state) {
    const errParam = encodeURIComponent(errorDescription || error || "Authorization cancelled by user");
    return NextResponse.redirect(`${appUrl}/providers?oauth_error=${errParam}`);
  }

  // Redirect to UI wizard step with parameters
  return NextResponse.redirect(
    `${appUrl}/providers?oauth_code=${encodeURIComponent(code)}&oauth_state=${encodeURIComponent(state)}`
  );
}

/**
 * POST handler: client exchanges code, validates state, and discovers accessible accounts.
 */
export async function POST(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;

  try {
    const body = await req.json();
    const { code, state, redirectUri } = body;

    if (!code || !state) {
      return NextResponse.json(
        {
          error: "Authorization code and state are required.",
          code: "MISSING_OAUTH_PARAMS",
        },
        { status: 400 }
      );
    }

    // 1. Single-use state verification & anti-CSRF check
    const statePayload = validateAndConsumeOAuthState(state, context.workspaceId);
    if (!statePayload) {
      return NextResponse.json(
        {
          error: "Invalid, expired, or already used OAuth state parameter. Please restart authorization.",
          code: "INVALID_STATE",
        },
        { status: 400 }
      );
    }

    const { provider, codeVerifier } = statePayload;
    const adapter = getProviderAdapter(provider);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const effectiveRedirectUri = redirectUri || statePayload.redirectUri || `${appUrl}/api/providers/callback`;

    // 2. Exchange authorization code for access & refresh tokens
    const tokenResult = await adapter.exchangeAuthorizationCode(
      code,
      effectiveRedirectUri,
      codeVerifier
    );

    // 3. Discover accessible advertising accounts using real provider API
    let accounts = await adapter.discoverAccounts(tokenResult.accessToken);

    // 4. Mark which accounts are already connected to this workspace
    const existingAccounts = await getConnectedAccounts(context.workspaceId);
    const existingIds = new Set(existingAccounts.map((a) => a.externalAccountId));

    accounts = accounts.map((acc) => ({
      ...acc,
      alreadyConnected: existingIds.has(acc.externalId),
      connectedWorkspaceName: existingIds.has(acc.externalId) ? context.workspaceName : undefined,
    }));

    // 5. Create secure temporary authorization token containing the real encrypted tokens
    // Client receives this opaque token to send back with selected account IDs
    const tempAuthToken = encryptToken(
      JSON.stringify({
        provider,
        workspaceId: context.workspaceId,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenExpiresAt: tokenResult.tokenExpiresAt?.toISOString(),
        grantedScopes: tokenResult.grantedScopes,
        timestamp: Date.now(),
      })
    );

    return NextResponse.json({
      success: true,
      provider,
      discoveredAccounts: accounts,
      grantedScopes: tokenResult.grantedScopes,
      tempAuthToken,
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    if (err instanceof ProviderApiError) {
      return NextResponse.json(
        {
          error: err.message,
          provider: err.provider,
          errorCategory: err.errorCategory,
          guidance: err.guidance,
        },
        { status: err.statusCode || 400 }
      );
    }

    return NextResponse.json(
      { error: (err as Error).message || "Failed validating authorization callback" },
      { status: 500 }
    );
  }
}
