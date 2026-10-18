"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { ProviderMetadata } from "@/lib/providers/types";
import { ExternalLink, Key, ShieldCheck, AlertCircle, FileText } from "lucide-react";

interface SetupGuideModalProps {
  provider: ProviderMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ provider, isOpen, onClose }: SetupGuideModalProps) {
  if (!provider) return null;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/providers/callback`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${provider.displayName} Setup Guide`}
      description="Configure server-side application credentials to enable this provider integration"
      className="max-w-2xl"
    >
      <div className="space-y-5 text-xs text-slate-300">
        {/* Readiness Info Alert */}
        <div className="flex items-start space-x-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-200">
              {provider.readiness.replace(/_/g, " ")}
            </p>
            <p className="text-[11px] leading-relaxed text-amber-300/80">
              {provider.readinessReason}
            </p>
          </div>
        </div>

        {/* Required Environment Variables */}
        {provider.requiredCredentials.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <Key className="h-3.5 w-3.5 text-brand-400" />
              <span>Required Server Environment Variables</span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800">
              {provider.requiredCredentials.map((cred) => (
                <div key={cred.key} className="p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-mono text-brand-300 font-medium text-xs">{cred.envVar}</p>
                    <p className="text-[11px] text-slate-400">{cred.description}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      cred.configured
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {cred.configured ? "CONFIGURED" : "MISSING"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registered OAuth Redirect URI */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-white font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Registered OAuth Redirect URI</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Add this exact URI to your Authorized Redirect URIs in the provider's developer console:
          </p>
          <div className="flex items-center justify-between rounded bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 border border-slate-800">
            <span className="truncate">{callbackUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(callbackUrl)}
              className="ml-2 text-brand-400 hover:text-brand-300 text-[10px] font-sans font-semibold shrink-0"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Official Links */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <a
            href={provider.developerPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 text-brand-400 hover:text-brand-300 text-xs font-medium"
          >
            <span>Open Developer Console</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={provider.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium"
          >
            <FileText className="h-3 w-3" />
            <span>API Documentation</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
