import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLocalUserProfile } from "@/lib/local-store";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const body = await req.json();
    const result = profileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const trimmedName = result.data.name.trim();

    // 1. Try updating in Prisma if database is available
    let updatedUser: { id: string; name: string | null; email: string } | null = null;
    try {
      if (userId) {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { name: trimmedName },
          select: { id: true, name: true, email: true },
        });
      } else if (userEmail) {
        updatedUser = await prisma.user.update({
          where: { email: userEmail },
          data: { name: trimmedName },
          select: { id: true, name: true, email: true },
        });
      }
    } catch (dbErr) {
      console.warn("Prisma user update failed, checking local store fallback:", (dbErr as Error).message);
    }

    // 2. Always update local store so local JSON and session lookups stay 100% in sync
    const identifier = userId || userEmail || "";
    const localUpdated = updateLocalUserProfile(identifier, trimmedName);

    if (!updatedUser && localUpdated) {
      updatedUser = {
        id: localUpdated.id,
        name: localUpdated.name,
        email: localUpdated.email,
      };
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User account not found. Please log in again." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "Failed to update profile: " + (err as Error).message },
      { status: 500 }
    );
  }
}
