"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Search,
  ExternalLink,
  MoreVertical,
  Plus,
  Play,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { AccountDetailModal } from "./account-detail-modal";
import { DisconnectConfirmModal } from "./disconnect-confirm-modal";
import { useToast } from "@/components/ui/toast";

export interface ConnectedAccountView {
  id: string;
  workspaceId: string;
  provider: string;
  externalAccountId: string;
  maskedAccountId: string;
  accountName: string;
  currency: string;
  timezone: string;
  status: string;
  grantedScopes: string[];
  connectedAt: string;
  lastValidatedAt: string;
  lastSuccessfulSyncAt?: string;
  syncPausedAt?: string;
  lastErrorCategory?: string;
}

interface ConnectedAccountsTableProps {
  accounts: ConnectedAccountView[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenConnectWizard: () => void;
}

export function ConnectedAccountsTable({
  accounts,
  isLoading,
  onRefresh,
  onOpenConnectWizard,
}: ConnectedAccountsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [disconnectingAccount, setDisconnectingAccount] = useState<ConnectedAccountView | null>(null);
  const { toast } = useToast();

  // Filtered accounts
  const filtered = accounts.filter((acc) => {
    const matchesSearch =
      acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.externalAccountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.provider.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider =
      selectedProviderFilter === "ALL" || acc.provider === selectedProviderFilter;

    const matchesStatus =
      selectedStatusFilter === "ALL" || acc.status === selectedStatusFilter;

    return matchesSearch && matchesProvider && matchesStatus;
  });

  const handleTestConnection = async (account: ConnectedAccountView, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/providers/${account.id}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed");
      toast.success(`${account.accountName}: connection verified (Status: ${data.validation?.status})`);
      onRefresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleToggleSync = async (account: ConnectedAccountView, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAction = account.status === "PAUSED" ? "RESUME_SYNC" : "PAUSE_SYNC";
    try {
      const res = await fetch(`/api/providers/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed modifying sync status");
      toast.success(data.message || "Sync updated");
      onRefresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectingAccount) return;
    try {
      const res = await fetch(`/api/providers/${disconnectingAccount.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed disconnecting account");
      toast.success("Account disconnected successfully.");
      onRefresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search accounts or IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-[#0d1424] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={selectedProviderFilter}
            onChange={(e) => setSelectedProviderFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-[#0d1424] px-3 py-2 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
          >
            <option value="ALL">All Providers</option>
            <option value="META">Meta Ads</option>
            <option value="GOOGLE_ADS">Google Ads</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-[#0d1424] px-3 py-2 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONNECTED">Connected</option>
            <option value="PAUSED">Sync Paused</option>
            <option value="PERMISSION_REQUIRED">Permission Required</option>
          </select>
        </div>
      </div>

      {/* Table / List Container */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1424] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading connected accounts telemetry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">No advertising accounts connected yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || selectedProviderFilter !== "ALL" || selectedStatusFilter !== "ALL"
                  ? "No connected accounts match your search filters."
                  : "Connect your Meta Ads or Google Ads accounts above to start analyzing campaign performance."}
              </p>
            </div>
            {!searchTerm && (
              <Button
                size="sm"
                onClick={onOpenConnectWizard}
                className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium inline-flex items-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Provider</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Account & Network</th>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Currency & TZ</th>
                  <th className="py-3 px-4">Connected At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((acc) => (
                  <tr
                    key={acc.id}
                    onClick={() => setActiveDetailId(acc.id)}
                    className="hover:bg-slate-850/50 cursor-pointer transition-colors"
                  >
                    {/* Account & Provider */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-white font-bold text-xs shrink-0 border border-slate-700">
                          {acc.provider.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[200px]">
                            {acc.accountName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {acc.provider === "META" ? "Meta Ads" : acc.provider === "GOOGLE_ADS" ? "Google Ads" : acc.provider}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Masked ID */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      {acc.maskedAccountId}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          acc.status === "CONNECTED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : acc.status === "PAUSED"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {acc.status === "CONNECTED" ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : acc.status === "PAUSED" ? (
                          <Pause className="h-2.5 w-2.5" />
                        ) : (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        )}
                        <span>{acc.status.replace(/_/g, " ")}</span>
                      </span>
                    </td>

                    {/* Currency & Timezone */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      <span className="text-white font-medium">{acc.currency}</span> • {acc.timezone}
                    </td>

                    {/* Connected Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(acc.connectedAt).toLocaleDateString()}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleTestConnection(acc, e)}
                          title="Run Live API Validation"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        >
                          <Activity className="h-3.5 w-3.5 text-brand-400" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleToggleSync(acc, e)}
                          title={acc.status === "PAUSED" ? "Resume Sync" : "Pause Sync"}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        >
                          {acc.status === "PAUSED" ? (
                            <Play className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Pause className="h-3.5 w-3.5 text-amber-400" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDisconnectingAccount(acc);
                          }}
                          title="Disconnect Account"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Details Drawer/Modal */}
      <AccountDetailModal
        isOpen={!!activeDetailId}
        onClose={() => setActiveDetailId(null)}
        accountId={activeDetailId}
        onStatusChanged={onRefresh}
      />

      {/* Disconnect Modal */}
      {disconnectingAccount && (
        <DisconnectConfirmModal
          isOpen={!!disconnectingAccount}
          onClose={() => setDisconnectingAccount(null)}
          accountName={disconnectingAccount.accountName}
          maskedAccountId={disconnectingAccount.maskedAccountId}
          provider={disconnectingAccount.provider}
          onConfirm={handleDisconnectConfirm}
        />
      )}
    </div>
  );
}
