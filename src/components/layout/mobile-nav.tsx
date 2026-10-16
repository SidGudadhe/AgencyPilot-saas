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
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName?: string;
  userName?: string | null;
  userEmail?: string | null;
}

export function MobileNav({
  isOpen,
  onClose,
  workspaceName = "My Workspace",
  userName,
  userEmail,
}: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Ads Analysis", href: "/ads-analysis", icon: BarChart2 },
    { name: "Ad Provider Connections", href: "/providers", icon: Radio },
    { name: "Workspace Settings", href: "/settings", icon: Settings },
    { name: "AI Agent", href: "/ai-agent", icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#0b1120] border-r border-slate-800 p-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">AgencyPilot</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-2">
          <p className="text-[11px] font-mono text-slate-400">
            Workspace: <span className="text-slate-200">{workspaceName}</span>
          </p>
        </div>

        <nav className="flex-1 space-y-1 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600/20 text-brand-400 font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-300 pb-2">
            <p className="font-semibold">{userName || "User"}</p>
            <p className="text-slate-500 truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center space-x-2 rounded px-2 py-1.5 text-xs text-red-400 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
