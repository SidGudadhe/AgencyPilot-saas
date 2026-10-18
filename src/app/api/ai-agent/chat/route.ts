import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { AdIntelligenceOrchestrator } from "@/lib/analytics/orchestrator";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId, workspaceName } = auth.context;

  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Fetch real ground truth data strictly scoped to this workspace
    const ads = await prisma.ad.findMany({
      where: { workspaceId },
      include: {
        campaign: { select: { id: true, name: true, objective: true } },
        metrics: {
          orderBy: { date: "asc" },
        },
      },
    });

    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId },
      select: { name: true, status: true, budget: true },
    });

    const integrations = await prisma.providerIntegration.findMany({
      where: { workspaceId },
      select: { provider: true, status: true, lastSyncAt: true },
    });

    // 2. Synthesize real ground truth evidence through 10-engine pipeline
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    const intelligenceList = ads.map((ad) => {
      let adSpend = 0;
      let adClicks = 0;
      let adImpressions = 0;
      let adConversions = 0;
      let adRev = 0;
      const history = [];

      for (const m of ad.metrics) {
        adSpend += m.spend;
        adClicks += Number(m.clicks);
        adImpressions += Number(m.impressions);
        if (m.conversions) adConversions += m.conversions;
        if (m.conversionValue) adRev += m.conversionValue;

        history.push({
          date: m.date.toISOString().split("T")[0],
          ctr: m.ctr,
          cpc: m.cpc,
          cpm: m.cpm,
          cpa: m.costPerConversion,
          roas: m.roas,
        });
      }

      totalSpend += adSpend;
      totalClicks += adClicks;
      totalImpressions += adImpressions;
      totalConversions += adConversions;
      totalRevenue += adRev;

      const uniqueDays = new Set(ad.metrics.map((m) => m.date.toISOString().split("T")[0])).size;

      return AdIntelligenceOrchestrator.processAd({
        ad: {
          id: ad.id,
          name: ad.name,
          externalId: ad.externalId,
          provider: ad.provider,
          status: ad.status,
          landingPageUrl: ad.landingPageUrl,
        },
        campaign: {
          id: ad.campaign.id,
          name: ad.campaign.name,
          objective: ad.campaign.objective,
        },
        account: {
          id: "account-default",
          externalId: "ext-act",
          currency: "INR",
        },
        workspaceId,
        currentMetrics: {
          impressions: adImpressions,
          clicks: adClicks,
          spend: adSpend,
          conversions: adConversions > 0 ? adConversions : (adSpend > 0 ? 0 : null),
          revenue: adRev > 0 ? adRev : null,
        },
        historicalPoints: history,
        activeDeliveryDays: Math.max(1, uniqueDays),
        lastSyncTimestamp: new Date().toISOString(),
        reportingDateRange: {
          startDate: ad.metrics[0]?.date.toISOString().split("T")[0] || "2026-10-01",
          endDate: ad.metrics[ad.metrics.length - 1]?.date.toISOString().split("T")[0] || "2026-10-07",
        },
        configuredTargets: {
          targetCpa: 500,
        },
      });
    });

    const verifiedIssues = intelligenceList.flatMap((i) => i.issues);
    const activeRecommendations = intelligenceList
      .map((i) => i.recommendation)
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    const groundTruth = {
      workspaceName,
      totalConnectedProviders: integrations.length,
      connectedProviders: integrations.map((i) => i.provider),
      totalCampaigns: campaigns.length,
      totalAds: ads.length,
      totalSpend: `₹${totalSpend.toFixed(2)}`,
      totalClicks,
      totalImpressions,
      totalConversions,
      totalRevenue: totalRevenue > 0 ? `₹${totalRevenue.toFixed(2)}` : "None recorded",
      verifiedIssuesCount: verifiedIssues.length,
      verifiedIssues: verifiedIssues.map((v) => ({
        issueId: v.issue_id,
        adId: v.ad_id,
        type: v.issue_type,
        severity: v.severity,
        classification: v.evidence_state,
        verificationMethod: v.verification_method,
        alternativeExplanations: v.alternative_explanations,
        recommendedAction: v.recommended_action,
      })),
      recommendations: activeRecommendations.map((r) => ({
        title: r.title,
        adId: r.ad_id,
        whatWasObserved: r.what_was_observed,
        whyItMatters: r.why_it_matters,
        investigateOrChange: r.what_user_can_investigate_or_change,
        defensibleImpactRange: r.defensible_impact_range,
        evaluationPlan: r.evaluation_plan,
      })),
      ads: intelligenceList.slice(0, 20).map((i) => ({
        name: i.adName,
        provider: i.provider,
        spend: i.canonicalMetrics.core.spend,
        clicks: i.canonicalMetrics.core.clicks,
        impressions: i.canonicalMetrics.core.impressions,
        ctr: i.canonicalMetrics.derived.ctr.value !== null ? `${i.canonicalMetrics.derived.ctr.value.toFixed(2)}%` : "—",
        cpc: i.canonicalMetrics.derived.cpc.value !== null ? `₹${i.canonicalMetrics.derived.cpc.value.toFixed(2)}` : "—",
        cpa: i.canonicalMetrics.derived.cpa.value !== null ? `₹${i.canonicalMetrics.derived.cpa.value.toFixed(2)}` : "—",
        conversions: i.canonicalMetrics.core.conversions,
        roas: i.canonicalMetrics.derived.roas.value !== null ? `${i.canonicalMetrics.derived.roas.value.toFixed(2)}x` : "—",
        evidenceState: i.maturity.evidenceState,
        confidenceTier: i.confidence.tier,
      })),
    };

    // If zero ads or providers are connected, provide an honest factual response
    if (ads.length === 0) {
      return NextResponse.json({
        success: true,
        response: `There are currently **0 active advertising campaigns or ad records** in workspace **${workspaceName}**.

To begin analyzing performance:
1. Navigate to **Ad Provider Connections** in the sidebar.
2. Link your advertising accounts (Meta, Google Ads, or Indian ad networks).
3. Once synchronized, I will immediately run our 10-engine intelligence pipeline to diagnose your ad performance, detect genuine issues, and safeguard against false-positive alerts.`,
        evidence: {
          workspaceName,
          connectedProviders: integrations.map((i) => i.provider),
          totalAds: 0,
          totalSpend: "₹0.00",
        },
      });
    }

    // 3. Generate response using Gemini API if available, else deterministic rules
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your-gemini-api-key") {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are AgencyPilot AI Analyst, an advertising analytics specialist for workspace "${workspaceName}".
CRITICAL NON-NEGOTIABLE INSTRUCTIONS:
1. You must answer using ONLY the provided DETERMINISTIC AD INTELLIGENCE ENGINE GROUND TRUTH below.
2. NEVER invent fake metrics, imaginary ads, or fictitious percentage increases (e.g. "+34.5% boost").
3. Respect evidence states:
   - If an ad is INSUFFICIENT_DATA or COLLECTING_EVIDENCE, state that it is in calibration and advise observation rather than knee-jerk changes.
   - If an issue is classified as VERIFIED_TECHNICAL_ISSUE, treat it as confirmed technical failure.
   - If an issue is classified as EVIDENCE_BACKED_PERFORMANCE_ISSUE, explain the baseline comparison and statistical evidence.
4. Currency is INR (₹).
5. Explain both the primary cause and alternative hypotheses where provided.

GROUND TRUTH ENGINE OUTPUT:
${JSON.stringify(groundTruth, null, 2)}`;

        const result = await model.generateContent([
          systemPrompt,
          `User Question: ${prompt}`,
        ]);

        return NextResponse.json({
          success: true,
          response: result.response.text(),
          evidence: groundTruth,
        });
      } catch (geminiErr) {
        console.warn("Gemini API invocation fallback:", geminiErr);
      }
    }

    // Deterministic Rule-Based Fallback
    const lower = prompt.toLowerCase();
    let reply = "";

    if (lower.includes("best") || lower.includes("top") || lower.includes("roas")) {
      const topAd = [...groundTruth.ads].sort(
        (a, b) => (parseFloat(b.roas.replace("x", "")) || 0) - (parseFloat(a.roas.replace("x", "")) || 0)
      )[0];
      reply = topAd && topAd.roas !== "—"
        ? `Based on verified synchronized metrics, your top-performing ad by ROAS is **${topAd.name}** (${topAd.provider}) with a ROAS of **${topAd.roas}** on a spend of ₹${topAd.spend.toFixed(2)}.`
        : `No ad currently has sufficient recorded revenue to determine a verified top ROAS.`;
    } else if (lower.includes("attention") || lower.includes("problem") || lower.includes("waste") || lower.includes("issue")) {
      if (groundTruth.verifiedIssues.length > 0) {
        reply = `Our Ad Intelligence Engine detected **${groundTruth.verifiedIssues.length} verified issue(s)** requiring review:\n\n` +
          groundTruth.verifiedIssues.map((issue) => (
            `• **[${issue.classification}] ${issue.type.replace(/_/g, " ")}** (${issue.severity})\n` +
            `  - Verification: ${issue.verificationMethod}\n` +
            `  - Recommended Action: ${issue.recommendedAction}`
          )).join("\n\n");
      } else {
        reply = `All mature active ads are currently delivering within expected statistical baselines. No verified technical or performance issues detected.`;
      }
    } else {
      reply = `Workspace **${workspaceName}** currently has **${ads.length} ads** tracked across **${integrations.length} ad provider(s)**.

Total tracked spend is **₹${totalSpend.toFixed(2)}** with **${totalClicks} clicks** and **${totalConversions} conversions**.
Verified Issues: **${groundTruth.verifiedIssuesCount}**

Ask me for specific breakdowns like:
- "Which ads have verified issues or need attention?"
- "What are the recommended actions to reduce wasted spend?"
- "Show me ad performance and maturity states."`;
    }

    return NextResponse.json({
      success: true,
      response: reply,
      evidence: groundTruth,
    });
  } catch (err: unknown) {
    console.error("AI Agent error:", err);
    return NextResponse.json(
      { error: "Failed to process chat query: " + (err as Error).message },
      { status: 500 }
    );
  }
}
