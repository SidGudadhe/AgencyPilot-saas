import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeletionRequestStatus } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { step1Confirmed, step2Confirmed } = body;

    // Strict validation: Both confirmations are mandatory
    if (!step1Confirmed || !step2Confirmed) {
      return NextResponse.json(
        {
          error:
            "Two-step confirmation required. Both Step 1 (Billing warning) and Step 2 (Permanent deletion warning) must be explicitly acknowledged.",
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const now = new Date();

    // Create an auditable deletion record
    const deletionRequest = await prisma.accountDeletionRequest.create({
      data: {
        userId,
        status: DeletionRequestStatus.CONFIRMED,
        step1ConfirmedAt: now,
        step2ConfirmedAt: now,
        processedAt: now,
      },
    });

    // Run safe deletion workflow in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Find all workspaces where this user is OWNER
      const ownedMemberships = await tx.workspaceMembership.findMany({
        where: { userId, role: "OWNER" },
        include: {
          workspace: {
            include: {
              memberships: true,
            },
          },
        },
      });

      for (const m of ownedMemberships) {
        // If the owner is the ONLY member, delete the workspace data safely
        if (m.workspace.memberships.length <= 1) {
          // Delete workspace (cascades to ads, metrics, subscriptions)
          await tx.workspace.delete({
            where: { id: m.workspaceId },
          });
        } else {
          // If other members exist, transfer ownership to the oldest remaining member
          const nextOwner = m.workspace.memberships.find(
            (other) => other.userId !== userId
          );
          if (nextOwner) {
            await tx.workspace.update({
              where: { id: m.workspaceId },
              data: { ownerId: nextOwner.userId },
            });
            await tx.workspaceMembership.update({
              where: { id: nextOwner.id },
              data: { role: "OWNER" },
            });
            await tx.workspaceMembership.delete({
              where: { id: m.id },
            });
          }
        }
      }

      // 2. Remove all remaining workspace memberships
      await tx.workspaceMembership.deleteMany({
        where: { userId },
      });

      // 3. Delete user sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // 4. Anonymize user record
      await tx.user.update({
        where: { id: userId },
        data: {
          name: "Deleted User",
          email: `deleted-${userId}-${Date.now()}@deleted.agencypilot.io`,
          passwordHash: "DELETED",
          image: null,
        },
      });

      // 5. Mark deletion request as completed
      await tx.accountDeletionRequest.update({
        where: { id: deletionRequest.id },
        data: {
          status: DeletionRequestStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Account and associated personal data deleted successfully.",
    });
  } catch (err) {
    console.error("Account deletion workflow error:", err);
    return NextResponse.json(
      { error: "Failed to process account deletion safely" },
      { status: 500 }
    );
  }
}
