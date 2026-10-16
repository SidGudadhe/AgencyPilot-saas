import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-guard";
import { prisma } from "@/lib/prisma";
import { computeAllMetrics } from "@/lib/analytics/calculator";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const auth = await requireWorkspaceAccess(req);
  if (!auth.success) return auth.response;

  const { workspaceId, workspaceName } = auth.context;

  try {
    const body = await req.json();
    const { prompt, history } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Fetch real ground truth data strictly scoped to this workspace
    const ads = await prisma.ad.findMany({
      where: { workspaceId },
      include: {
        campaign: { select: { name: true } },
        metrics: true,
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

    // 2. Synthesize real ground truth evidence
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    const adSummaries = ads.map((ad) => {
      let adSpend = 0;
      let adClicks = 0;
      let adImpressions = 0;
      let adConversions = 0;
      let adRev = 0;

      for (const m of ad.metrics) {
        adSpend += m.spend;
        adClicks += Number(m.clicks);
        adImpressions += Number(m.impressions);
        if (m.conversions) adConversions += m.conversions;
        if (m.conversionValue) adRev += m.conversionValue;
      }

      totalSpend += adSpend;
      totalClicks += adClicks;
      totalImpressions += adImpressions;
      totalConversions += adConversions;
      totalRevenue += adRev;

      const calc = computeAllMetrics({
        spend: adSpend,
        clicks: adClicks,
        impressions: adImpressions,
        conversions: adConversions > 0 ? adConversions : null,
        attributedRevenue: adRev > 0 ? adRev : null,
      });

      return {
        name: ad.name,
        provider: ad.provider,
        campaign: ad.campaign.name,
        status: ad.status,
        spend: adSpend,
        clicks: adClicks,
        impressions: adImpressions,
        ctr: calc.ctr ? `${calc.ctr}%` : "—",
        cpc: calc.cpc ? `₹${calc.cpc}` : "—",
        conversions: adConversions,
        roas: calc.roas ? `${calc.roas}x` : "—",
      };
    });

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
      ads: adSummaries.slice(0, 20), // Top 20 for context window
    };

    // If zero ads or providers are connected, provide an honest factual response
    if (ads.length === 0) {
      return NextResponse.json({
        success: true,
        response: `There are currently **0 active advertising campaigns or ad records** in workspace **${workspaceName}**.

To begin analyzing performance:
1. Navigate to **Ad Provider Connections** in the sidebar.
2. Link your advertising accounts (Meta, Google Ads, or Indian ad networks).
3. Once synchronized, I will immediately diagnose your ad performance, detect anomalies, and track your ROAS.`,
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

        const systemPrompt = `You are AgencyPilot AI, a senior ad analytics consultant for workspace "${workspaceName}".
CRITICAL NON-NEGOTIABLE INSTRUCTIONS:
1. You must answer using ONLY the provided GROUND TRUTH DATA below.
2. NEVER invent fake metrics, imaginary ads, or fictitious percentage increases.
3. If an ad has 0 conversions or spend is missing, state it directly.
4. Distinguish facts, calculations, inferences, and recommended actions.
5. Currency is INR (₹).

GROUND TRUTH DATA:
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
        // Fallback to deterministic rule answer below
      }
    }

    // Deterministic Rule-Based Fallback
    const lower = prompt.toLowerCase();
    let reply = "";

    if (lower.includes("best") || lower.includes("top") || lower.includes("roas")) {
      const topAd = [...adSummaries].sort((a, b) => (parseFloat(b.roas) || 0) - (parseFloat(a.roas) || 0))[0];
      reply = topAd
        ? `Based on your real synchronized metrics, your top-performing ad by ROAS is **${topAd.name}** (${topAd.provider}) with a ROAS of **${topAd.roas}** on a spend of ₹${topAd.spend}.`
        : `No ad currently has sufficient recorded revenue to determine a top ROAS.`;
    } else if (lower.includes("attention") || lower.includes("problem") || lower.includes("waste")) {
      const problemAds = adSummaries.filter((a) => a.spend > 1000 && a.conversions === 0);
      reply = problemAds.length > 0
        ? `I detected **${problemAds.length} ad(s)** requiring immediate review due to high spend without recorded conversions:\n` +
          problemAds.map((a) => `• **${a.name}** (${a.provider}): Spent ₹${a.spend} with 0 conversions.`).join("\n") +
          `\n\nRecommendation: Verify your conversion tracking pixel and audit the mobile landing page experience.`
        : `All active ads are delivering without severe conversion tracking anomalies.`;
    } else {
      reply = `Workspace **${workspaceName}** currently has **${ads.length} ads** tracked across **${integrations.length} ad provider(s)**.

Total tracked spend is **₹${totalSpend.toFixed(2)}** with **${totalClicks} clicks** and **${totalConversions} conversions**.

Ask me for specific breakdowns like:
- "Which ads need immediate attention?"
- "Which provider has the lowest CPC?"
- "Show me ads with high spend but low conversions."`;
    }

    return NextResponse.json({
      success: true,
      response: reply,
      evidence: groundTruth,
    });
  } catch (err) {
    console.error("AI Agent error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI analysis response" },
      { status: 500 }
    );
  }
}
