"use client";

import React from "react";
import { AnomalyReport } from "@/lib/analytics/anomaly-detector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, ArrowRight, Activity, HelpCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

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
      <div className="rounded-xl border border-border bg-card/60 p-6 text-center backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto mb-3 border border-emerald-500/20">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Zero Critical Issues Detected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          All active advertising creatives with adequate maturity are delivering within expected statistical confidence bands. No anomalous spend waste or broken destinations detected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Needs Attention ({anomalies.length} Verified {anomalies.length === 1 ? "Issue" : "Issues"})
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Evidence-based anomalies separated from normal market variance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {anomalies.map((item) => {
          const isCritical = item.severity === "CRITICAL";
          const isHigh = item.severity === "HIGH";

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80"
            >
              <div className="space-y-3">
                {/* Header with Severity, Provider, and Confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        isCritical
                          ? "destructive"
                          : isHigh
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px] uppercase font-mono tracking-wider font-semibold"
                    >
                      {item.severity}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">
                      {item.provider}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-muted-foreground">
                    <Activity className="h-3 w-3 text-brand-500" />
                    <span>Confidence: {item.confidence}</span>
                  </div>
                </div>

                {/* Ad & Campaign Name */}
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    {item.adName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Campaign: {item.campaignName}
                  </p>
                </div>

                {/* Verification & Cause */}
                <div className="rounded-lg bg-muted/40 p-3 border border-border/60 text-xs space-y-1.5">
                  <div className="flex items-start space-x-1.5">
                    <span className="font-semibold text-destructive shrink-0">Verification:</span>
                    <span className="text-foreground text-[11px] leading-relaxed">
                      {item.problemDetected}
                    </span>
                  </div>
                  {item.whyItMatters && (
                    <div className="flex items-start space-x-1.5 text-muted-foreground text-[11px]">
                      <HelpCircle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>{item.whyItMatters}</span>
                    </div>
                  )}
                </div>

                {/* Supporting Metrics */}
                <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Spend</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.supportingMetrics.spend, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Conversions</span>
                    <span className="font-semibold text-foreground">
                      {item.supportingMetrics.conversions}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      {item.supportingMetrics.cpa !== undefined ? "CPA" : "CTR"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {item.supportingMetrics.cpa !== undefined && item.supportingMetrics.cpa !== null
                        ? formatCurrency(item.supportingMetrics.cpa, currency)
                        : item.supportingMetrics.ctr !== undefined
                        ? formatPercent(item.supportingMetrics.ctr)
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="rounded-lg bg-brand-500/10 border border-brand-500/20 p-2.5 text-xs">
                  <span className="font-semibold text-brand-600 dark:text-brand-400">Recommended Action: </span>
                  <span className="text-foreground text-[11px]">
                    {item.recommendedAction}
                  </span>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground italic">
                  Deterministic mathematical verification
                </span>
                {onSelectAd && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectAd(item.adId)}
                    className="h-7 text-xs text-brand-600 dark:text-brand-400 hover:text-foreground"
                  >
                    <span>Inspect Diagnostics</span>
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
