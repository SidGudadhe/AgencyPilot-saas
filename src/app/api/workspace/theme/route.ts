import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { getWorkspaceTheme, updateWorkspaceTheme } from "@/lib/local-store";
import { z } from "zod";

const themeSchema = z.object({
  theme: z.enum(["dark", "light"]),
});

// GET: Fetch the current theme setting for the active workspace
export async function GET(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context;

  let theme: "dark" | "light" = "dark";

  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { theme: true },
    });

    if (ws?.theme === "light" || ws?.theme === "dark") {
      theme = ws.theme;
    } else {
      theme = getWorkspaceTheme(workspaceId);
    }
  } catch (err) {
    console.warn("Database lookup failed for workspace theme, using local store:", (err as Error).message);
    theme = getWorkspaceTheme(workspaceId);
  }

  return NextResponse.json({
    success: true,
    workspaceId,
    theme,
  });
}

// PATCH: Update the theme setting strictly for the active workspace
export async function PATCH(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context;

  try {
    const body = await req.json();
    const result = themeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid theme value. Must be 'dark' or 'light'." },
        { status: 400 }
      );
    }

    const { theme } = result.data;

    // 1. Update in Prisma if database is available
    try {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { theme },
      });
    } catch (dbErr) {
      console.warn("Database update failed for workspace theme, persisting locally:", (dbErr as Error).message);
    }

    // 2. Update in local store
    updateWorkspaceTheme(workspaceId, theme);

    return NextResponse.json({
      success: true,
      workspaceId,
      theme,
      message: `Workspace theme updated to ${theme} successfully`,
    });
  } catch (err: unknown) {
    console.error("Failed to update workspace theme:", err);
    return NextResponse.json(
      { error: "Internal server error occurred while updating theme" },
      { status: 500 }
    );
  }
}
