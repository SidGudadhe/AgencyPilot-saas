"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart2 } from "lucide-react";

export interface TimeSeriesPoint {
  date: string; // e.g. "Oct 10"
  spend: number;
  clicks: number;
  conversions?: number;
}

interface PerformanceChartProps {
  data: TimeSeriesPoint[];
  currency?: string;
}

export function PerformanceChart({
  data,
  currency = "INR",
}: PerformanceChartProps) {
  const hasData = data && data.length > 0 && data.some((d) => d.spend > 0 || d.clicks > 0);

  if (!hasData) {
    return (
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-200">
            Performance Trend Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart2}
            title="No Time-Series Data"
            description="Daily performance metrics will appear here once active advertising campaigns generate spend and impressions."
            className="border-0 bg-transparent py-12"
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate SVG scales
  const maxSpend = Math.max(...data.map((d) => d.spend), 100);
  const maxClicks = Math.max(...data.map((d) => d.clicks), 10);

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-200">
            Performance Trend (Spend & Clicks)
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Real daily spend compared with traffic generated
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
            <span className="text-slate-300">Spend ({currency})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Clicks</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 w-full">
          <div className="flex h-full items-end gap-2 pt-6 pb-6">
            {data.map((pt, i) => {
              const spendHeight = Math.max(4, (pt.spend / maxSpend) * 180);
              const clickHeight = Math.max(4, (pt.clicks / maxClicks) * 180);

              return (
                <div
                  key={i}
                  className="group relative flex flex-1 flex-col items-center justify-end h-full"
                >
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-12 z-20 hidden flex-col items-center rounded-md bg-slate-950 p-2 text-[11px] font-mono text-slate-100 shadow-xl border border-slate-700 group-hover:flex">
                    <span>{pt.date}</span>
                    <span className="text-brand-400 font-semibold">
                      Spend: {formatCurrency(pt.spend, currency)}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      Clicks: {formatNumber(pt.clicks)}
                    </span>
                  </div>

                  {/* Bars */}
                  <div className="flex items-end space-x-1 w-full justify-center">
                    {/* Spend Bar */}
                    <div
                      style={{ height: `${spendHeight}px` }}
                      className="w-1/2 max-w-[16px] rounded-t bg-brand-500/80 transition-all group-hover:bg-brand-400"
                    />
                    {/* Clicks Indicator */}
                    <div
                      style={{ height: `${clickHeight}px` }}
                      className="w-1/2 max-w-[16px] rounded-t bg-emerald-500/80 transition-all group-hover:bg-emerald-400"
                    />
                  </div>

                  {/* X-axis label */}
                  <span className="mt-2 text-[10px] text-slate-500 font-mono truncate max-w-[48px]">
                    {pt.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
