import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { decryptToken } from "@/lib/encryption";
import { getProviderAdapter } from "@/lib/providers/factory";
import {
  saveConnectedAccount,
  recordConnectionAuditEvent,
} from "@/lib/providers/storage";
import { ProviderKey } from "@/lib/providers/types";

export async function POST(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;

  try {
    const body = await req.json();
    const { tempAuthToken, selectedAccounts } = body;

    if (!tempAuthToken || !Array.isArray(selectedAccounts) || selectedAccounts.length === 0) {
      return NextResponse.json(
        { error: "Valid tempAuthToken and at least one selected account are required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // 1. Decrypt temporary authorization payload
    let authPayload: {
      provider: ProviderKey;
      workspaceId: string;
      accessToken: string;
      refreshToken?: string;
      tokenExpiresAt?: string;
      grantedScopes: string[];
      timestamp: number;
    };

    try {
      const decryptedJson = decryptToken(tempAuthToken);
      authPayload = JSON.parse(decryptedJson);
    } catch {
      return NextResponse.json(
        { error: "Invalid or tampered authorization token.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    // Security check: workspace match and token expiration (30 minutes)
    if (authPayload.workspaceId !== context.workspaceId) {
      return NextResponse.json(
        { error: "Authorization token does not match active workspace.", code: "WORKSPACE_MISMATCH" },
        { status: 403 }
      );
    }

    if (Date.now() - authPayload.timestamp > 30 * 60 * 1000) {
      return NextResponse.json(
        { error: "Authorization session expired. Please reconnect.", code: "SESSION_EXPIRED" },
        { status: 400 }
      );
    }

    const adapter = getProviderAdapter(authPayload.provider);
    const connectedResults = [];

    // 2. Validate and save each selected account
    for (const acc of selectedAccounts) {
      // Run live real API validation check
      const validation = await adapter.validateConnection(authPayload.accessToken, acc.externalId);

      const saved = await saveConnectedAccount({
        workspaceId: context.workspaceId,
        provider: authPayload.provider,
        externalAccountId: acc.externalId,
        accountName: acc.name || validation.accountName || acc.externalId,
        currency: acc.currency || "INR",
        timezone: acc.timezone || "Asia/Kolkata",
        rawAccessToken: authPayload.accessToken,
        rawRefreshToken: authPayload.refreshToken,
        tokenExpiresAt: authPayload.tokenExpiresAt ? new Date(authPayload.tokenExpiresAt) : undefined,
        grantedScopes: authPayload.grantedScopes,
        status: validation.status,
        metadata: {
          validationChecks: validation.checksPerformed,
          lastValidationTimestamp: validation.timestamp,
          requestId: validation.requestId,
          lastErrorCategory: validation.errorCategory,
          lastErrorMessage: validation.guidance,
        },
      });

      // Audit event
      await recordConnectionAuditEvent(
        context.workspaceId,
        context.userId,
        "AD_ACCOUNT_CONNECTED",
        {
          provider: authPayload.provider,
          externalAccountId: acc.externalId,
          accountName: saved.accountName,
          status: saved.status,
          grantedScopes: authPayload.grantedScopes,
        },
        saved.id
      );

      connectedResults.push({
        id: saved.id,
        externalAccountId: saved.externalAccountId,
        accountName: saved.accountName,
        currency: saved.currency,
        status: saved.status,
        validation,
      });
    }

    return NextResponse.json({
      success: true,
      provider: authPayload.provider,
      connectedAccounts: connectedResults,
      message: `Successfully connected ${connectedResults.length} advertising account(s).`,
    });
  } catch (err) {
    console.error("Failed connecting accounts:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed saving connected accounts" },
      { status: 500 }
    );
  }
}
