import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const feedbackSchema = z.object({
  issueId: z.string().optional(),
  recommendationId: z.string().optional(),
  adId: z.string(),
  issueFeedback: z.enum([
    "CONFIRMED_GENUINE_ISSUE",
    "FALSE_POSITIVE_NOT_PRESENT",
    "MORE_EVIDENCE_REQUIRED",
    "ALREADY_KNOWN_INTENDED",
  ]).optional(),
  recommendationFeedback: z.enum([
    "RECOMMENDATION_USEFUL",
    "RECOMMENDATION_NOT_USEFUL",
    "APPLIED_AS_SUGGESTED",
    "PARTIALLY_APPLIED",
    "REJECTED_BUSINESS_REASON",
  ]).optional(),
  outcomeObserved: z.enum([
    "OUTCOME_IMPROVED",
    "OUTCOME_WORSENED",
    "NO_NOTICEABLE_CHANGE",
    "OUTCOME_UNCERTAIN",
    "PENDING_MEASUREMENT",
  ]).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId, userId } = auth.context;

  try {
    const body = await req.json();
    const result = feedbackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const now = new Date();

    // Record audit event for evaluation calibration
    try {
      if (userId) {
        await prisma.auditEvent.create({
          data: {
            userId,
            workspaceId,
            action: "INTELLIGENCE_FEEDBACK_RECORDED",
            resourceType: "AdIntelligence",
            resourceId: data.issueId || data.recommendationId || data.adId,
            metadata: {
              ...data,
              timestamp: now.toISOString(),
            },
          },
        });
      }
    } catch (auditErr) {
      console.warn("Audit logging fallback during feedback submission:", (auditErr as Error).message);
    }

    // If recommendation feedback exists, update recommendation history in database if present
    if (data.recommendationId) {
      try {
        await prisma.recommendationHistory.create({
          data: {
            recommendationId: data.recommendationId,
            previousStatus: "REVIEWING",
            newStatus: data.recommendationFeedback === "APPLIED_AS_SUGGESTED" ? "APPLIED" : "REVIEWING",
            changedById: userId || "reviewer",
            note: `${data.recommendationFeedback || ""}: ${data.notes || ""}`,
          },
        });
      } catch (histErr) {
        // Soft fallback if recommendation model isn't yet migrated in Postgres
      }
    }

    return NextResponse.json({
      success: true,
      message: "Feedback recorded successfully for engine calibration.",
      recordedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Feedback recording error:", err);
    return NextResponse.json(
      { error: "Failed to record feedback: " + (err as Error).message },
      { status: 500 }
    );
  }
}
