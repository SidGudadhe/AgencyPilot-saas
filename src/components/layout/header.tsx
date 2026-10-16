"use client";

import React from "react";
import { DateRangePicker, DateRangePreset } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Menu, ShieldCheck } from "lucide-react";

interface HeaderProps {
  workspaceName?: string;
  role?: string;
  dateRange: DateRangePreset;
  onDateRangeChange: (preset: DateRangePreset) => void;
  onMobileMenuToggle?: () => void;
  currency?: string;
  lastSyncAt?: string | null;
}

export function Header({
  workspaceName = "My Workspace",
  role = "OWNER",
  dateRange,
  onDateRangeChange,
  onMobileMenuToggle,
  currency = "INR",
  lastSyncAt,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#090d16]/90 px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Workspace Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMobileMenuToggle}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <h1 className="text-sm font-semibold text-white tracking-tight">
            {workspaceName}
          </h1>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-mono">
            {role}
          </Badge>
        </div>
      </div>

      {/* Right: Global Date Picker, Currency, Sync Status */}
      <div className="flex items-center space-x-3">
        {lastSyncAt ? (
          <span className="hidden lg:inline-flex text-[11px] text-slate-400 font-mono items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Synced: {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="hidden lg:inline-flex text-[11px] text-slate-400 font-mono items-center">
            <ShieldCheck className="h-3.5 w-3.5 mr-1 text-slate-500" />
            Real-Data Engine
          </span>
        )}

        <div className="hidden sm:flex items-center rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-mono text-slate-300">
          <span>{currency}</span>
        </div>

        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>
    </header>
  );
}
