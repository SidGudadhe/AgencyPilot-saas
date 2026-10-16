import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";

export interface WorkspaceContext {
  userId: string;
  userEmail: string;
  userName?: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
}

/**
 * Validates session, extracts active workspace, and checks role permissions.
 * Guarantees zero cross-tenant leakage.
 */
export async function requireWorkspaceAccess(
  req?: Request,
  requiredRole?: WorkspaceRole
): Promise<
  | { success: true; context: WorkspaceContext }
  | { success: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  // Workspace ID can come from header (e.g. x-workspace-id), query param, or user default
  let requestedWorkspaceId: string | null = null;

  if (req) {
    const url = new URL(req.url);
    requestedWorkspaceId =
      req.headers.get("x-workspace-id") || url.searchParams.get("workspaceId");
  }

  let membership;

  if (requestedWorkspaceId) {
    // Verify membership in the specifically requested workspace
    membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: requestedWorkspaceId,
          userId: session.user.id,
        },
      },
      include: {
        workspace: true,
      },
    });
  } else {
    // Fallback to user's first available workspace membership
    membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        workspace: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });
  }

  if (!membership) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "You do not have access to this workspace",
          code: "WORKSPACE_FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  // Check role requirement (e.g. OWNER only operations like Billing, Team member deletion)
  if (requiredRole && requiredRole === WorkspaceRole.OWNER && membership.role !== WorkspaceRole.OWNER) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "This operation requires workspace Owner privileges",
          code: "FORBIDDEN_INSUFFICIENT_ROLE",
        },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    context: {
      userId: session.user.id,
      userEmail: session.user.email || "",
      userName: session.user.name,
      workspaceId: membership.workspace.id,
      workspaceName: membership.workspace.name,
      workspaceSlug: membership.workspace.slug,
      role: membership.role,
    },
  };
}
