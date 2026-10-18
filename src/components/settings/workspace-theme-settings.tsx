"use client";

import React, { useState } from "react";
import { useWorkspaceTheme } from "@/contexts/workspace-theme-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle2, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceThemeSettingsProps {
  workspaceName?: string;
}

export function WorkspaceThemeSettings({ workspaceName = "Active Workspace" }: WorkspaceThemeSettingsProps) {
  const { theme, setTheme, isLoading } = useWorkspaceTheme();
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelectTheme = async (selected: "dark" | "light") => {
    if (selected === theme || saving) return;
    setSaving(true);
    setSuccessMessage(null);

    try {
      await setTheme(selected);
      setSuccessMessage(
        selected === "dark"
          ? "Black Theme (Dark Mode) activated for this workspace."
          : "White Theme (Light Mode) activated for this workspace."
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Theme change failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-white">
                Workspace Theme & Appearance
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Choose between Black Theme (Dark Mode) and White Theme (Light Mode) for{" "}
                <span className="font-semibold text-slate-200">{workspaceName}</span>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {successMessage && (
            <div className="flex items-center space-x-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Theme Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Black Theme (Dark Mode) */}
            <div
              onClick={() => handleSelectTheme("dark")}
              className={cn(
                "group relative cursor-pointer rounded-xl border p-4 transition-all duration-200",
                theme === "dark"
                  ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500 shadow-md shadow-brand-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
              )}
            >
              {/* Visual Mini Mockup */}
              <div className="mb-3.5 overflow-hidden rounded-lg border border-slate-800 bg-[#090d16] p-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500/80" />
                    <div className="h-2 w-2 rounded-full bg-yellow-500/80" />
                    <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="h-1.5 w-12 rounded bg-slate-800" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <div className="h-6 rounded bg-[#0f172a] border border-slate-800/60 p-1">
                    <div className="h-1 w-6 bg-brand-500/70 rounded mb-1" />
                    <div className="h-2 w-4 bg-slate-700 rounded" />
                  </div>
                  <div className="h-6 rounded bg-[#0f172a] border border-slate-800/60 p-1">
                    <div className="h-1 w-6 bg-indigo-500/70 rounded mb-1" />
                    <div className="h-2 w-4 bg-slate-700 rounded" />
                  </div>
                  <div className="h-6 rounded bg-[#0f172a] border border-slate-800/60 p-1">
                    <div className="h-1 w-6 bg-emerald-500/70 rounded mb-1" />
                    <div className="h-2 w-4 bg-slate-700 rounded" />
                  </div>
                </div>
                <div className="h-7 rounded bg-[#0f172a] border border-slate-800/60 p-1.5 flex items-end space-x-1">
                  <div className="h-3 w-1.5 bg-brand-500 rounded-sm" />
                  <div className="h-4 w-1.5 bg-brand-500 rounded-sm" />
                  <div className="h-2 w-1.5 bg-brand-500 rounded-sm" />
                  <div className="h-5 w-1.5 bg-brand-500 rounded-sm" />
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Moon className="h-4 w-4 text-slate-300" />
                    <h3 className="text-xs font-semibold text-white">
                      Black Theme (Dark Mode)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Obsidian dark slate palette optimized for low-light environments and focused ad performance monitoring.
                  </p>
                </div>
                {theme === "dark" && (
                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5 ml-2" />
                )}
              </div>
            </div>

            {/* 2. White Theme (Light Mode) */}
            <div
              onClick={() => handleSelectTheme("light")}
              className={cn(
                "group relative cursor-pointer rounded-xl border p-4 transition-all duration-200",
                theme === "light"
                  ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500 shadow-md shadow-brand-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
              )}
            >
              {/* Visual Mini Mockup */}
              <div className="mb-3.5 overflow-hidden rounded-lg border border-slate-200 bg-[#f8fafc] p-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="h-1.5 w-12 rounded bg-slate-300" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <div className="h-6 rounded bg-white border border-slate-200 p-1 shadow-xs">
                    <div className="h-1 w-6 bg-brand-600 rounded mb-1" />
                    <div className="h-2 w-4 bg-slate-400 rounded" />
                  </div>
                  <div className="h-6 rounded bg-white border border-slate-200 p-1 shadow-xs">
                    <div className="h-1 w-6 bg-indigo-600 rounded mb-1" />
                    <div className="h-2 w-4 bg-slate-400 rounded" />
                  </div>
                  <div className="h-6 rounded bg-white border border-slate-200 p-1 shadow-xs">
                    <div className="h-1 w-6 bg-emerald-600 rounded mb-1" />
                    <div className="h-2 w-4 bg-slate-400 rounded" />
                  </div>
                </div>
                <div className="h-7 rounded bg-white border border-slate-200 p-1.5 flex items-end space-x-1 shadow-xs">
                  <div className="h-3 w-1.5 bg-brand-500 rounded-sm" />
                  <div className="h-4 w-1.5 bg-brand-500 rounded-sm" />
                  <div className="h-2 w-1.5 bg-brand-500 rounded-sm" />
                  <div className="h-5 w-1.5 bg-brand-500 rounded-sm" />
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Sun className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-white">
                      White Theme (Light Mode)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Clean high-contrast paper aesthetic with slate accents, ideal for daylight review and client presentation decks.
                  </p>
                </div>
                {theme === "light" && (
                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5 ml-2" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
