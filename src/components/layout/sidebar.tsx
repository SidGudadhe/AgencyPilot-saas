"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Radio,
  Settings,
  Sparkles,
  Zap,
  Building2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface SidebarProps {
  workspaceName?: string;
  userName?: string | null;
  userEmail?: string | null;
  className?: string;
}

export function Sidebar({
  workspaceName = "My Workspace",
  userName,
  userEmail,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Ads Analysis", href: "/ads-analysis", icon: BarChart2 },
    { name: "Ad Provider Connections", href: "/providers", icon: Radio },
    { name: "Workspace Settings", href: "/settings", icon: Settings },
  ];

  const isAiActive = pathname === "/ai-agent";

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col justify-between border-r border-slate-800 bg-[#0b1120] text-slate-300",
        className
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-slate-800/80">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Agency<span className="text-brand-400">Pilot</span>
            </span>
          </Link>
        </div>

        {/* Workspace Switcher Pill */}
        <div className="px-4 py-3 border-b border-slate-800/40">
          <div className="flex items-center justify-between rounded-md bg-slate-900/90 px-3 py-2 border border-slate-800">
            <div className="flex items-center space-x-2 truncate">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200 truncate">
                {workspaceName}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
              ACTIVE
            </span>
          </div>
        </div>

        {/* Navigation Items 1-4 */}
        <nav className="space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-brand-600/15 text-brand-400 font-semibold border border-brand-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-brand-400" : "text-slate-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Navigation Item 5 (AI Agent) + User info */}
      <div className="flex flex-col space-y-2 p-3 border-t border-slate-800/80 bg-slate-950/40">
        {/* Item 5: AI Agent */}
        <Link
          href="/ai-agent"
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all group",
            isAiActive
              ? "bg-gradient-to-r from-brand-600/25 to-indigo-600/25 text-white border border-brand-500/40 shadow-sm"
              : "bg-slate-900/90 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800"
          )}
        >
          <div className="flex items-center space-x-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/20 text-brand-400 group-hover:bg-brand-500/30 transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-100">AI Agent</span>
          </div>
          <span className="text-[10px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded shadow-sm">
            PRO
          </span>
        </Link>

        {/* User Profile Pill & Logout */}
        <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-2.5 border border-slate-800/60">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-medium text-slate-200 truncate">
              {userName || "User"}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {userEmail || "user@agencypilot.io"}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
