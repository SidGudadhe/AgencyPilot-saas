import React from "react";
import { Card, CardContent } from "./card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  change?: number | null; // e.g. +12.5%
  changePeriod?: string;  // e.g. "vs previous 7 days"
  icon?: LucideIcon;
  subValue?: string;
  isAvailable?: boolean;
  unavailableNote?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changePeriod = "vs prev period",
  icon: Icon,
  subValue,
  isAvailable = true,
  unavailableNote = "No tracked data",
  className,
}: MetricCardProps) {
  const isNeutral = change === null || change === undefined || change === 0;
  const isPositive = typeof change === "number" && change > 0;

  return (
    <Card className={cn("overflow-hidden border-slate-800/80 bg-slate-900/70", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between space-x-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          {Icon && (
            <div className="rounded-md bg-slate-800/60 p-1.5 text-slate-400 border border-slate-700/40">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3">
          {isAvailable && value !== null && value !== undefined ? (
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-white">
                {value}
              </span>
              {subValue && (
                <span className="text-xs text-slate-400">{subValue}</span>
              )}
            </div>
          ) : (
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-medium text-slate-500 italic">
                {unavailableNote}
              </span>
            </div>
          )}
        </div>

        {isAvailable && change !== null && change !== undefined && (
          <div className="mt-2.5 flex items-center space-x-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center font-medium",
                isPositive && "text-emerald-400",
                !isPositive && !isNeutral && "text-red-400",
                isNeutral && "text-slate-400"
              )}
            >
              {isPositive && <TrendingUp className="mr-1 h-3.5 w-3.5" />}
              {!isPositive && !isNeutral && <TrendingDown className="mr-1 h-3.5 w-3.5" />}
              {isNeutral && <Minus className="mr-1 h-3.5 w-3.5" />}
              {change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`}
            </span>
            <span className="text-slate-500">{changePeriod}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
