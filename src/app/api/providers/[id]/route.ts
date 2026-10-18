import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import {
  getConnectedAccountById,
  pauseAccountSync,
  resumeAccountSync,
  disconnectAccount,
  recordConnectionAuditEvent,
  getDecryptedAccessToken,
} from "@/lib/providers/storage";
import { getProviderAdapter } from "@/lib/providers/factory";
import { getProviderByKey } from "@/lib/providers/registry";
import { maskAccountId } from "@/lib/encryption";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;
  const account = await getConnectedAccountById(context.workspaceId, params.id);

  if (!account) {
    return NextResponse.json(
      { error: "Connected account not found.", code: "ACCOUNT_NOT_FOUND" },
      { status: 404 }
    );
  }

  const providerMeta = getProviderByKey(account.provider);

  // Strip tokens completely, format safe detailed response
  const details = {
    id: account.id,
    workspaceId: account.workspaceId,
    provider: account.provider,
    providerDisplayName: providerMeta?.displayName || account.provider,
    externalAccountId: account.externalAccountId,
    maskedAccountId: maskAccountId(account.externalAccountId),
    accountName: account.accountName,
    currency: account.currency,
    timezone: account.timezone,
    status: account.status,
    grantedScopes: account.grantedScopes,
    requiredScopes: providerMeta?.permissions.filter((p) => p.required).map((p) => p.scope) || [],
    optionalScopes: providerMeta?.permissions.filter((p) => !p.required).map((p) => p.scope) || [],
    connectedAt: account.connectedAt,
    lastValidatedAt: account.lastValidatedAt,
    lastSuccessfulSyncAt: account.lastSuccessfulSyncAt,
    syncPausedAt: account.syncPausedAt,
    tokenExpiresAt: account.tokenExpiresAt,
    lastErrorCategory: account.lastErrorCategory,
    lastErrorMessage: account.lastErrorMessage,
    supportedProducts: providerMeta?.supportedProducts || [],
    knownLimitations: providerMeta?.knownLimitations || [],
    metadata: account.metadata || {},
  };

  return NextResponse.json({
    success: true,
    account: details,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;
  const account = await getConnectedAccountById(context.workspaceId, params.id);

  if (!account) {
    return NextResponse.json(
      { error: "Connected account not found.", code: "ACCOUNT_NOT_FOUND" },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action as "PAUSE_SYNC" | "RESUME_SYNC";

    if (action === "PAUSE_SYNC") {
      const updated = await pauseAccountSync(context.workspaceId, params.id);
      await recordConnectionAuditEvent(
        context.workspaceId,
        context.userId,
        "AD_ACCOUNT_SYNC_PAUSED",
        {
          externalAccountId: account.externalAccountId,
          accountName: account.accountName,
          provider: account.provider,
        },
        account.id
      );
      return NextResponse.json({
        success: true,
        action: "PAUSED",
        status: updated?.status,
        syncPausedAt: updated?.syncPausedAt,
        message: "Data synchronization paused successfully.",
      });
    }

    if (action === "RESUME_SYNC") {
      const updated = await resumeAccountSync(context.workspaceId, params.id);
      await recordConnectionAuditEvent(
        context.workspaceId,
        context.userId,
        "AD_ACCOUNT_SYNC_RESUMED",
        {
          externalAccountId: account.externalAccountId,
          accountName: account.accountName,
          provider: account.provider,
        },
        account.id
      );
      return NextResponse.json({
        success: true,
        action: "RESUMED",
        status: updated?.status,
        message: "Data synchronization resumed successfully.",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: PAUSE_SYNC, RESUME_SYNC", code: "INVALID_ACTION" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Account patch error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed modifying account status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;
  const account = await getConnectedAccountById(context.workspaceId, params.id);

  if (!account) {
    return NextResponse.json(
      { error: "Connected account not found.", code: "ACCOUNT_NOT_FOUND" },
      { status: 404 }
    );
  }

  try {
    // 1. Attempt token revocation on provider API if supported
    let revocationSuccess = false;
    try {
      const adapter = getProviderAdapter(account.provider);
      const rawToken = getDecryptedAccessToken(account);
      revocationSuccess = await adapter.revokeAuthorization(rawToken);
    } catch (revErr) {
      console.warn("Provider revocation warning during disconnect:", revErr);
    }

    // 2. Disconnect and remove credentials
    const disconnected = await disconnectAccount(context.workspaceId, params.id);

    // 3. Record audit event (NO secrets)
    await recordConnectionAuditEvent(
      context.workspaceId,
      context.userId,
      "AD_ACCOUNT_DISCONNECTED",
      {
        externalAccountId: account.externalAccountId,
        accountName: account.accountName,
        provider: account.provider,
        providerRevocationExecuted: revocationSuccess,
      },
      account.id
    );

    return NextResponse.json({
      success: disconnected,
      message: `Account ${account.accountName} disconnected successfully. Scheduled data synchronization stopped.`,
      providerRevocationExecuted: revocationSuccess,
    });
  } catch (err) {
    console.error("Account disconnect error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed disconnecting account" },
      { status: 500 }
    );
  }
}
