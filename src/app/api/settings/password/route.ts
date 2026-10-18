import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, verifyPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findLocalUserById, findLocalUserByEmail, updateLocalUserPassword } from "@/lib/local-store";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const body = await req.json();
    const result = passwordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // 1. Try Prisma DB user
    let userPasswordHash: string | null = null;
    let isPrismaUser = false;

    try {
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : (userEmail ? await prisma.user.findUnique({ where: { email: userEmail } }) : null);

      if (user && user.passwordHash) {
        userPasswordHash = user.passwordHash;
        isPrismaUser = true;
      }
    } catch (dbErr) {
      console.warn("Prisma user lookup failed during password change:", (dbErr as Error).message);
    }

    // 2. Try local store if not found in Prisma
    let localUser = null;
    if (!userPasswordHash) {
      localUser = userId ? findLocalUserById(userId) : null;
      if (!localUser && userEmail) {
        localUser = findLocalUserByEmail(userEmail);
      }
      if (localUser && localUser.passwordHash) {
        userPasswordHash = localUser.passwordHash;
      }
    }

    if (!userPasswordHash) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(
      result.data.currentPassword,
      userPasswordHash
    );

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    // Hash and store new password
    const newHash = await hashPassword(result.data.newPassword);

    if (isPrismaUser && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      try {
        await prisma.auditEvent.create({
          data: {
            userId,
            action: "PASSWORD_CHANGED",
            resourceType: "User",
            resourceId: userId,
          },
        });
      } catch (auditErr) {
        console.warn("Audit event creation skipped:", auditErr);
      }
    } else {
      const identifier = userId || userEmail || "";
      const updated = updateLocalUserPassword(identifier, newHash);
      if (!updated) {
        throw new Error("Failed persisting updated password locally");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Password change error:", err);
    return NextResponse.json(
      { error: "Failed to update password: " + (err as Error).message },
      { status: 500 }
    );
  }
}
