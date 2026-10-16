"use client";

import React from "react";
import { AnomalyReport } from "@/lib/analytics/anomaly-detector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, ArrowRight, EyeOff } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

interface NeedsAttentionProps {
  anomalies: AnomalyReport[];
  onSelectAd?: (adId: string) => void;
  currency?: string;
}

export function NeedsAttention({
  anomalies,
  onSelectAd,
  currency = "INR",
}: NeedsAttentionProps) {
  if (anomalies.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-950/40 text-emerald-400 mx-auto mb-2 border border-emerald-500/30">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-white">No Critical Issues Detected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          All active ads with sufficient sample size are delivering within expected performance parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Needs Attention ({anomalies.length} Flagged)
        </h2>
        <span className="text-[11px] text-slate-400">
          Evidence-based performance anomalies requiring review
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {anomalies.map((item) => {
          const isCritical = item.severity === "CRITICAL";
          const isHigh = item.severity === "HIGH";

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm"
            >
              <div>
                {/* Header with Severity and Provider */}
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        isCritical
                          ? "destructive"
                          : isHigh
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px] uppercase font-mono"
                    >
                      {item.severity}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-200">
                      {item.provider}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Confidence: {item.confidence}
                  </span>
                </div>

                {/* Ad & Campaign Name */}
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {item.adName}
                </h3>
                <p className="text-[11px] text-slate-400 mb-2 truncate">
                  Campaign: {item.campaignName}
                </p>

                {/* Specific Problem */}
                <div className="rounded-md bg-slate-950/70 p-2.5 border border-slate-800/80 text-xs space-y-1">
                  <p className="font-semibold text-red-400">
                    Issue: {item.problemDetected}
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {item.whyItMatters}
                  </p>
                </div>

                {/* Supporting Metrics */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Spend</span>
                    <span className="font-semibold text-slate-200">
                      {formatCurrency(item.supportingMetrics.spend, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Conversions</span>
                    <span className="font-semibold text-slate-200">
                      {item.supportingMetrics.conversions}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      {item.supportingMetrics.cpa !== undefined ? "CPA" : "CTR"}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {item.supportingMetrics.cpa !== undefined && item.supportingMetrics.cpa !== null
                        ? formatCurrency(item.supportingMetrics.cpa, currency)
                        : item.supportingMetrics.ctr !== undefined
                        ? formatPercent(item.supportingMetrics.ctr)
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Recommended Corrective Action */}
                <div className="mt-2.5 text-xs">
                  <span className="font-semibold text-brand-400">Action: </span>
                  <span className="text-slate-300 text-[11px]">
                    {item.recommendedAction}
                  </span>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="mt-3.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 italic">
                  {item.dataLimitations}
                </span>
                {onSelectAd && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectAd(item.adId)}
                    className="h-7 text-xs text-brand-400 hover:text-white"
                  >
                    <span>View Diagnostics</span>
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
