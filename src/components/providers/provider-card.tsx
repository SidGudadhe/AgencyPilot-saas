"use client";

import React from "react";
import { ProviderMetadata } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Plus,
  Settings,
  Info,
} from "lucide-react";

interface ProviderCardProps {
  provider: ProviderMetadata;
  onConnect: (provider: ProviderMetadata) => void;
  onOpenSetupGuide: (provider: ProviderMetadata) => void;
}

export function ProviderCard({
  provider,
  onConnect,
  onOpenSetupGuide,
}: ProviderCardProps) {
  // Render badge color based on readiness
  const renderReadinessBadge = () => {
    switch (provider.readiness) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            <span>Ready to Connect</span>
          </span>
        );
      case "REQUIRES_SETUP":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3 w-3" />
            <span>Setup Required</span>
          </span>
        );
      case "REQUIRES_APPROVAL":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
            <Info className="h-3 w-3" />
            <span>App Review Required</span>
          </span>
        );
      case "PARTNER_ACCESS_REQUIRED":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
            <Lock className="h-3 w-3" />
            <span>Partner Access</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700">
            <Clock className="h-3 w-3" />
            <span>Coming Soon</span>
          </span>
        );
    }
  };

  const isAvailable = provider.readiness === "AVAILABLE";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0d1424] p-5 transition-all hover:border-slate-700/80 shadow-sm">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/90 text-white font-bold text-sm shadow-inner border border-slate-700/60">
              {provider.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {provider.displayName}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {provider.category.replace(/_/g, " ")} • {provider.currentVersion}
              </p>
            </div>
          </div>
          {renderReadinessBadge()}
        </div>

        {/* Supported Products */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Supported Products
          </p>
          <div className="flex flex-wrap gap-1.5">
            {provider.supportedProducts.slice(0, 3).map((prod) => (
              <span
                key={prod}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-300 border border-slate-700/40"
              >
                {prod}
              </span>
            ))}
            {provider.supportedProducts.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/40 text-slate-400">
                +{provider.supportedProducts.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Permission Overview */}
        <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/70 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-300 font-medium text-[11px]">
            <ShieldCheck className="h-3 w-3 text-brand-400 shrink-0" />
            <span>Authorization Method</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed pl-4">
            {provider.authorizationMethod === "OAUTH2_CODE"
              ? "Official OAuth 2.0 Web Flow (Read-only reporting by default)"
              : provider.authorizationMethod === "OAUTH2_PKCE"
              ? "OAuth 2.0 with PKCE Security"
              : "Enterprise Partner Onboarding / Dedicated API Key"}
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px]">
          <a
            href={provider.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 flex items-center space-x-1"
          >
            <span>Docs</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>

        <div>
          {isAvailable ? (
            <Button
              size="sm"
              onClick={() => onConnect(provider)}
              className="text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white flex items-center space-x-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Account</span>
            </Button>
          ) : provider.readiness === "REQUIRES_SETUP" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenSetupGuide(provider)}
              className="text-xs font-medium border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex items-center space-x-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Setup Required</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenSetupGuide(provider)}
              className="text-xs font-medium border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center space-x-1.5"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Prerequisites</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
