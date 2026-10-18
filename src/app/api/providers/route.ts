import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { getAllProviders } from "@/lib/providers/registry";
import { getConnectionSummary } from "@/lib/providers/storage";

export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { context } = auth;
  const providers = getAllProviders();
  const summary = await getConnectionSummary(context.workspaceId);

  return NextResponse.json({
    success: true,
    summary,
    providers,
  });
}
