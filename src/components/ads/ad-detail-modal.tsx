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
  Activity,
  Layers,
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

  // Maturity classification
  const isMature = ad.spend >= 2000 && ad.clicks >= 60;
  const evidenceState = isMature ? "SUFFICIENT_EVIDENCE" : ad.spend > 400 ? "COLLECTING_EVIDENCE" : "INSUFFICIENT_DATA";

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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3.5 border border-border">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge
              variant={ad.status === "ACTIVE" ? "success" : "secondary"}
              className="font-mono text-xs"
            >
              {ad.status}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {ad.provider}
            </Badge>
            <Badge
              variant={evidenceState === "SUFFICIENT_EVIDENCE" ? "outline" : "secondary"}
              className="text-[10px] font-mono"
            >
              <Layers className="h-3 w-3 mr-1" />
              {evidenceState}
            </Badge>
          </div>
          {ad.landingPageUrl && (
            <a
              href={ad.landingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-brand-600 dark:text-brand-400 hover:underline font-mono"
            >
              <span>Verify Landing Page</span>
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          )}
        </div>

        {/* 2. Primary 6-Metric Diagnostic Grid */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Deterministic Canonical Metrics
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-3.5 border border-border font-mono shadow-sm">
              <span className="text-[11px] text-muted-foreground block">Total Spend</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(ad.spend, currency)}
              </span>
            </div>

            <div className="rounded-xl bg-card p-3.5 border border-border font-mono shadow-sm">
              <span className="text-[11px] text-muted-foreground block">Impressions & Reach</span>
              <span className="text-lg font-bold text-foreground">
                {formatNumber(ad.impressions)}
              </span>
              {ad.reach && (
                <span className="text-[10px] text-muted-foreground block">
                  Reach: {formatNumber(ad.reach)}
                </span>
              )}
            </div>

            <div className="rounded-xl bg-card p-3.5 border border-border font-mono shadow-sm">
              <span className="text-[11px] text-muted-foreground block">Clicks & CTR</span>
              <span className="text-lg font-bold text-foreground">
                {formatNumber(ad.clicks)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                CTR: {formatPercent(ad.ctr)}
              </span>
            </div>

            <div className="rounded-xl bg-card p-3.5 border border-border font-mono shadow-sm">
              <span className="text-[11px] text-muted-foreground block">Cost Per Click (CPC)</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(ad.cpc, currency)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                CPM: {formatCurrency(ad.cpm, currency)}
              </span>
            </div>

            <div className="rounded-xl bg-card p-3.5 border border-border font-mono shadow-sm">
              <span className="text-[11px] text-muted-foreground block">Conversions & CVR</span>
              <span className="text-lg font-bold text-foreground">
                {ad.conversions !== null ? formatNumber(ad.conversions) : "Not tracked"}
              </span>
              {ad.cvr !== null && (
                <span className="text-[10px] text-muted-foreground block">
                  CVR: {formatPercent(ad.cvr)}
                </span>
              )}
            </div>

            <div className="rounded-xl bg-card p-3.5 border border-border font-mono shadow-sm">
              <span className="text-[11px] text-muted-foreground block">ROAS & Revenue</span>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                {formatROAS(ad.roas)}
              </span>
              {ad.revenue !== null && (
                <span className="text-[10px] text-muted-foreground block">
                  Rev: {formatCurrency(ad.revenue, currency)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Deep Evidence-Based Recommendations */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Evidence-Based Recommendations ({recommendations.length})
            </h4>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                      Recommendation Action
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      <Activity className="h-3 w-3 mr-1 text-brand-500" />
                      Confidence: {rec.confidenceLevel}
                    </Badge>
                  </div>

                  <p className="text-xs font-semibold text-foreground">
                    {rec.detectedIssue}
                  </p>

                  <div className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-foreground font-mono border border-border">
                    <span className="text-muted-foreground block text-[10px] font-sans font-semibold">EMPIRICAL EVIDENCE:</span>
                    {rec.supportingEvidence}
                  </div>

                  <p className="text-xs text-foreground">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Action: </span>
                    {rec.recommendedAction}
                  </p>

                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Rationale: </span>
                    {rec.reasonForRecommendation}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border">
                    <div>
                      <span className="font-semibold text-foreground">Risks: </span>
                      {rec.potentialRisks}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Observation: </span>
                      {rec.observationPeriod}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-card p-5 text-center border border-border">
              <ShieldCheck className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">
                No corrective actions required. Ad performance is healthy or currently in data accumulation calibration.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
