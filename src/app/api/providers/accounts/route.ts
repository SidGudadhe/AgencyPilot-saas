import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { getConnectedAccounts } from "@/lib/providers/storage";
import { maskAccountId } from "@/lib/encryption";
import { ProviderKey, ConnectionStatus } from "@/lib/providers/types";

export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;
  const url = new URL(req.url);

  const search = url.searchParams.get("search") || undefined;
  const provider = (url.searchParams.get("provider") as ProviderKey) || undefined;
  const status = (url.searchParams.get("status") as ConnectionStatus) || undefined;
  const sortBy = (url.searchParams.get("sortBy") as "name" | "date" | "status") || "date";
  const sortDir = (url.searchParams.get("sortDir") as "asc" | "desc") || "desc";

  const rawAccounts = await getConnectedAccounts(context.workspaceId, {
    search,
    provider,
    status,
    sortBy,
    sortDir,
  });

  // Safe view for client (tokens completely stripped, account ID masked for safety)
  const safeAccounts = rawAccounts.map((a) => ({
    id: a.id,
    workspaceId: a.workspaceId,
    provider: a.provider,
    externalAccountId: a.externalAccountId,
    maskedAccountId: maskAccountId(a.externalAccountId),
    accountName: a.accountName,
    currency: a.currency,
    timezone: a.timezone,
    status: a.status,
    grantedScopes: a.grantedScopes,
    tokenExpiresAt: a.tokenExpiresAt,
    connectedAt: a.connectedAt,
    lastValidatedAt: a.lastValidatedAt,
    lastSuccessfulSyncAt: a.lastSuccessfulSyncAt,
    syncPausedAt: a.syncPausedAt,
    lastErrorCategory: a.lastErrorCategory,
    lastErrorMessage: a.lastErrorMessage,
  }));

  return NextResponse.json({
    success: true,
    total: safeAccounts.length,
    accounts: safeAccounts,
  });
}
