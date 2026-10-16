import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { WorkspaceRole, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(1, "Name is required").max(100),
  workspaceName: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, workspaceName } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user and auto-provision their personal workspace in a single transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          passwordHash,
        },
      });

      const initialWorkspaceName = workspaceName?.trim() || `${name.trim()}'s Workspace`;
      const baseSlug = initialWorkspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 30);
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

      const workspace = await tx.workspace.create({
        data: {
          name: initialWorkspaceName,
          slug: uniqueSlug,
          ownerId: user.id,
        },
      });

      // Assign user as OWNER
      await tx.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: WorkspaceRole.OWNER,
        },
      });

      // Create initial Free Tier Subscription record
      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      // Audit log
      await tx.auditEvent.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          action: "USER_REGISTERED_WORKSPACE_CREATED",
          resourceType: "Workspace",
          resourceId: workspace.id,
        },
      });

      return user;
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred during registration" },
      { status: 500 }
    );
  }
}
