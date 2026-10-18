"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  ShieldCheck,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";
import { DisconnectConfirmModal } from "./disconnect-confirm-modal";

interface AccountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  onStatusChanged: () => void;
}

export function AccountDetailModal({
  isOpen,
  onClose,
  accountId,
  onStatusChanged,
}: AccountDetailModalProps) {
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen && accountId) {
      fetchAccountDetails();
    } else {
      setAccount(null);
    }
  }, [isOpen, accountId]);

  const fetchAccountDetails = async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/providers/${accountId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed fetching account details");
      setAccount(data.account);
    } catch (err) {
      toast.error((err as Error).message);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accountId) return;
    setIsTesting(true);
    try {
      const res = await fetch(`/api/providers/${accountId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed");

      if (data.validation?.valid) {
        toast.success(`Connection verified successfully! Latency: ${data.validation.latencyMs || 120}ms`);
      } else {
        toast.warning(`Connection check: ${data.validation?.status || "Attention required"}`);
      }
      fetchAccountDetails();
      onStatusChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleSync = async () => {
    if (!account) return;
    const isPaused = account.status === "PAUSED";
    const nextAction = isPaused ? "RESUME_SYNC" : "PAUSE_SYNC";

    setIsTogglingSync(true);
    try {
      const res = await fetch(`/api/providers/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed modifying sync status");

      toast.success(data.message || "Sync status updated.");
      fetchAccountDetails();
      onStatusChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsTogglingSync(false);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/providers/${account.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed disconnecting account");

      toast.success("Account disconnected successfully.");
      onStatusChanged();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={account?.accountName || "Account Details"}
        description={account ? `${account.providerDisplayName} • ID: ${account.maskedAccountId}` : "Loading..."}
        className="max-w-2xl"
      >
        {isLoading || !account ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-400" />
            <p className="text-xs">Loading connection telemetry...</p>
          </div>
        ) : (
          <div className="space-y-6 text-xs text-slate-300">
            {/* Status & Health Header Banner */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                  Connection Status
                </p>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                      account.status === "CONNECTED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : account.status === "PAUSED"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {account.status === "CONNECTED" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : account.status === "PAUSED" ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span>{account.status.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-slate-400 text-xs">
                    Currency: <strong className="text-white">{account.currency}</strong> • Timezone:{" "}
                    <strong className="text-white">{account.timezone}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  isLoading={isTesting}
                  className="text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
                >
                  <Activity className="h-3.5 w-3.5 mr-1 text-brand-400" />
                  <span>Test Connection</span>
                </Button>
              </div>
            </div>

            {/* Error Guidance if applicable */}
            {account.lastErrorCategory && (
              <div className="flex items-start space-x-3 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-200">
                    {account.lastErrorCategory.replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-red-300/80 leading-relaxed">
                    {account.lastErrorMessage || "An issue was detected with this provider connection."}
                  </p>
                </div>
              </div>
            )}

            {/* Granted Permissions & Capabilities */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-white font-semibold">
                <ShieldCheck className="h-4 w-4 text-brand-400" />
                <span>Granted Access & Reporting Permissions</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                <p className="text-[11px] text-slate-400">
                  AgencyPilot operates under least-privilege read-only permissions for campaign reporting:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {account.grantedScopes && account.grantedScopes.length > 0 ? (
                    account.grantedScopes.map((scope: string) => (
                      <span
                        key={scope}
                        className="inline-flex items-center space-x-1 rounded bg-brand-500/10 px-2 py-1 font-mono text-[10px] text-brand-300 border border-brand-500/20"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5 text-brand-400" />
                        <span>{scope}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px] italic">
                      Standard reporting scopes granted via provider session
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Synchronization & Telemetry Timeline */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-white font-semibold">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Connection Health & Audit Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Connected On</span>
                  </span>
                  <p className="text-xs font-medium text-slate-200 font-mono">
                    {new Date(account.connectedAt).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Last API Validation</span>
                  </span>
                  <p className="text-xs font-medium text-slate-200 font-mono">
                    {account.lastValidatedAt
                      ? new Date(account.lastValidatedAt).toLocaleString()
                      : "Verified upon connection"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleSync}
                  isLoading={isTogglingSync}
                  className={`text-xs border-slate-700 ${
                    account.status === "PAUSED"
                      ? "text-emerald-400 hover:bg-emerald-950/20"
                      : "text-amber-400 hover:bg-amber-950/20"
                  }`}
                >
                  {account.status === "PAUSED" ? (
                    <>
                      <Play className="h-3.5 w-3.5 mr-1" />
                      <span>Resume Sync</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 mr-1" />
                      <span>Pause Sync</span>
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  className="text-xs bg-red-600/80 hover:bg-red-600 text-white flex items-center space-x-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Disconnect Account</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Disconnect Confirmation Modal */}
      {account && (
        <DisconnectConfirmModal
          isOpen={isDisconnectModalOpen}
          onClose={() => setIsDisconnectModalOpen(false)}
          accountName={account.accountName}
          maskedAccountId={account.maskedAccountId}
          provider={account.providerDisplayName}
          onConfirm={handleDisconnectConfirm}
        />
      )}
    </>
  );
}
