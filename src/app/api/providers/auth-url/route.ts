import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { getProviderAdapter } from "@/lib/providers/factory";
import { getProviderByKey } from "@/lib/providers/registry";
import { saveOAuthState } from "@/lib/providers/storage";
import { ProviderKey } from "@/lib/providers/types";

export async function POST(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;

  try {
    const body = await req.json();
    const providerKey = body.provider as ProviderKey;
    const requestedPermissions = Array.isArray(body.permissions) ? body.permissions : undefined;

    if (!providerKey) {
      return NextResponse.json(
        { error: "Provider key is required", code: "MISSING_PROVIDER" },
        { status: 400 }
      );
    }

    const providerMeta = getProviderByKey(providerKey);
    if (!providerMeta) {
      return NextResponse.json(
        { error: `Provider ${providerKey} not found in directory`, code: "PROVIDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (providerMeta.readiness === "REQUIRES_SETUP") {
      return NextResponse.json(
        {
          error: `Provider ${providerMeta.displayName} requires environment credentials setup before it can be authorized.`,
          code: "REQUIRES_SETUP",
          requiredCredentials: providerMeta.requiredCredentials,
          guidance: providerMeta.readinessReason,
        },
        { status: 400 }
      );
    }

    if (providerMeta.readiness === "PARTNER_ACCESS_REQUIRED") {
      return NextResponse.json(
        {
          error: `${providerMeta.displayName} requires an approved enterprise partner contract and direct credential provisioning.`,
          code: "PARTNER_ACCESS_REQUIRED",
          guidance: providerMeta.readinessReason,
        },
        { status: 400 }
      );
    }

    if (providerMeta.readiness !== "AVAILABLE") {
      return NextResponse.json(
        {
          error: `${providerMeta.displayName} is currently ${providerMeta.readiness}.`,
          code: "PROVIDER_NOT_AVAILABLE",
          guidance: providerMeta.readinessReason,
        },
        { status: 400 }
      );
    }

    const adapter = getProviderAdapter(providerKey);

    // Build the registered callback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const defaultCallback = `${appUrl}/api/providers/callback`;
    const redirectUri = body.redirectUri || defaultCallback;

    // Cryptographic CSRF state
    const state = crypto.randomBytes(24).toString("hex");
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes TTL

    const { url, codeVerifier } = adapter.getAuthorizationUrl(state, redirectUri, {
      permissions: requestedPermissions,
    });

    // Record OAuth state for single-use verification
    saveOAuthState({
      state,
      provider: providerKey,
      workspaceId: context.workspaceId,
      userId: context.userId,
      codeVerifier,
      requestedScopes: requestedPermissions || [],
      redirectUri,
      createdAt: now,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      authUrl: url,
      state,
      provider: providerKey,
      redirectUri,
      expiresInSeconds: 900,
    });
  } catch (err) {
    console.error("Failed generating OAuth authorization URL:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed generating authorization URL" },
      { status: 500 }
    );
  }
}
