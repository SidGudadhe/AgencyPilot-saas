"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { UnifiedAdItem } from "@/types/analytics";
import { formatCurrency, formatNumber, formatPercent, formatROAS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { generateRecommendationsForAd } from "@/lib/analytics/recommendation-engine";
import {
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Video,
  MousePointer,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface AdDetailModalProps {
  ad: UnifiedAdItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
}

export function AdDetailModal({
  ad,
  isOpen,
  onClose,
  currency = "INR",
}: AdDetailModalProps) {
  if (!ad) return null;

  // Generate real rule-based recommendations for this specific ad
  const recommendations = generateRecommendationsForAd({
    id: ad.id,
    name: ad.name,
    campaignId: ad.campaignId,
    provider: ad.provider,
    spend: ad.spend,
    impressions: ad.impressions,
    clicks: ad.clicks,
    conversions: ad.conversions || 0,
    revenue: ad.revenue,
    ctr: ad.ctr,
    cpc: ad.cpc,
    cpa: ad.costPerConversion,
    roas: ad.roas,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ad.name}
      description={`ID: ${ad.externalId} • Provider: ${ad.provider} • Campaign: ${ad.campaignName}`}
      className="max-w-3xl"
    >
      <div className="space-y-6 pt-2">
        {/* 1. Header Overview & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950 p-3 border border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Ad Status:</span>
            <Badge
              variant={ad.status === "ACTIVE" ? "success" : "secondary"}
              className="font-mono text-xs"
            >
              {ad.status}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {ad.provider}
            </Badge>
          </div>
          {ad.landingPageUrl && (
            <a
              href={ad.landingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-brand-400 hover:text-brand-300 font-mono"
            >
              <span>View Landing Page</span>
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          )}
        </div>

        {/* 2. Primary 6-Metric Diagnostic Grid */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Core Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block">Total Spend</span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(ad.spend, currency)}
              </span>
            </div>

            <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block">Impressions & Reach</span>
              <span className="text-lg font-bold text-white">
                {formatNumber(ad.impressions)}
              </span>
              {ad.reach && (
                <span className="text-[10px] text-slate-500 block">
                  Reach: {formatNumber(ad.reach)}
                </span>
              )}
            </div>

            <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block">Clicks & CTR</span>
              <span className="text-lg font-bold text-white">
                {formatNumber(ad.clicks)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                CTR: {formatPercent(ad.ctr)}
              </span>
            </div>

            <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block">Cost Per Click (CPC)</span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(ad.cpc, currency)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                CPM: {formatCurrency(ad.cpm, currency)}
              </span>
            </div>

            <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block">Conversions & CVR</span>
              <span className="text-lg font-bold text-white">
                {ad.conversions !== null ? formatNumber(ad.conversions) : "Not tracked"}
              </span>
              {ad.cvr !== null && (
                <span className="text-[10px] text-slate-400 block">
                  CVR: {formatPercent(ad.cvr)}
                </span>
              )}
            </div>

            <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block">ROAS</span>
              <span className="text-lg font-bold text-brand-400">
                {formatROAS(ad.roas)}
              </span>
              {ad.revenue !== null && (
                <span className="text-[10px] text-slate-400 block">
                  Rev: {formatCurrency(ad.revenue, currency)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Deep Evidence-Based Recommendations */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Evidence-Based Recommendations ({recommendations.length})
            </h4>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/90 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-400">
                      Recommendation
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Confidence: {rec.confidenceLevel}
                    </Badge>
                  </div>

                  <p className="text-xs font-semibold text-white">
                    {rec.detectedIssue}
                  </p>

                  <div className="rounded bg-slate-900 p-2 text-[11px] text-slate-300 font-mono border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">EVIDENCE:</span>
                    {rec.supportingEvidence}
                  </div>

                  <p className="text-xs text-slate-200">
                    <span className="font-semibold text-emerald-400">Action: </span>
                    {rec.recommendedAction}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Rationale: </span>
                    {rec.reasonForRecommendation}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <div>
                      <span className="font-semibold text-slate-400">Risks: </span>
                      {rec.potentialRisks}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">Observation: </span>
                      {rec.observationPeriod}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-950/60 p-4 text-center border border-slate-800">
              <ShieldCheck className="h-5 w-5 text-slate-500 mx-auto mb-1" />
              <p className="text-xs text-slate-400">
                No corrective actions required. Ad performance is healthy or currently in data accumulation phase.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
