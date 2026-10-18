import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import {
  getConnectedAccountById,
  getDecryptedAccessToken,
  updateAccountValidation,
  recordConnectionAuditEvent,
} from "@/lib/providers/storage";
import { getProviderAdapter } from "@/lib/providers/factory";

export async function POST(
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
    const adapter = getProviderAdapter(account.provider);
    const rawToken = getDecryptedAccessToken(account);

    // Run real live verification query against provider API
    const validationResult = await adapter.validateConnection(
      rawToken,
      account.externalAccountId
    );

    // Update account status based on live test
    await updateAccountValidation(context.workspaceId, params.id, {
      status: validationResult.status,
      lastErrorCategory: validationResult.errorCategory,
      lastErrorMessage: validationResult.guidance,
    });

    // Record audit event
    await recordConnectionAuditEvent(
      context.workspaceId,
      context.userId,
      "AD_ACCOUNT_CONNECTION_TESTED",
      {
        provider: account.provider,
        externalAccountId: account.externalAccountId,
        status: validationResult.status,
        valid: validationResult.valid,
        latencyMs: validationResult.latencyMs,
      },
      account.id
    );

    return NextResponse.json({
      success: true,
      validation: validationResult,
    });
  } catch (err) {
    console.error("Connection test error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed executing connection test" },
      { status: 500 }
    );
  }
}
