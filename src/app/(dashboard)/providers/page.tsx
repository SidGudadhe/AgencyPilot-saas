"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/providers/provider-card";
import { SetupGuideModal } from "@/components/providers/setup-guide-modal";
import { ConnectionWizard } from "@/components/providers/connection-wizard";
import { ConnectedAccountsTable, ConnectedAccountView } from "@/components/providers/connected-accounts-table";
import {
  ProviderMetadata,
  ConnectionSummary,
  ProviderCategory,
} from "@/lib/providers/types";
import {
  Plus,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ProviderConnectionsPage() {
  const [providers, setProviders] = useState<ProviderMetadata[]>([]);
  const [summary, setSummary] = useState<ConnectionSummary>({
    totalConnectedAccounts: 0,
    activeConnections: 0,
    attentionRequired: 0,
    availableProviders: 0,
    totalProvidersInDirectory: 13,
  });

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountView[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Filters for provider directory
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [providerSearch, setProviderSearch] = useState<string>("");

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedWizardProvider, setSelectedWizardProvider] = useState<ProviderMetadata | null>(null);

  const [setupGuideProvider, setSetupGuideProvider] = useState<ProviderMetadata | null>(null);
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);

  const { toast } = useToast();

  const fetchProvidersAndSummary = useCallback(async () => {
    setIsLoadingProviders(true);
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed loading providers:", err);
    } finally {
      setIsLoadingProviders(false);
    }
  }, []);

  const fetchConnectedAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await fetch("/api/providers/accounts");
      const data = await res.json();
      if (data.success) {
        setConnectedAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error("Failed loading connected accounts:", err);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchProvidersAndSummary();
    fetchConnectedAccounts();
  }, [fetchProvidersAndSummary, fetchConnectedAccounts]);

  const handleOpenWizardWithProvider = (provider?: ProviderMetadata) => {
    setSelectedWizardProvider(provider || null);
    setIsWizardOpen(true);
  };

  const handleOpenSetupGuide = (provider: ProviderMetadata) => {
    setSetupGuideProvider(provider);
    setIsSetupGuideOpen(true);
  };

  const handleSuccess = () => {
    fetchProvidersAndSummary();
    fetchConnectedAccounts();
  };

  // Filter provider cards
  const filteredProviders = providers.filter((p) => {
    const matchesCategory =
      categoryFilter === "ALL" || p.category === categoryFilter;
    const matchesSearch =
      p.displayName.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.supportedProducts.some((prod) => prod.toLowerCase().includes(providerSearch.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* ─── SECTION A: Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Radio className="h-5 w-5 text-brand-400" />
            <span>Ad Provider Connections</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect your advertising accounts to analyze campaign performance in one workspace.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            onClick={() => handleOpenWizardWithProvider()}
            className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center space-x-1.5 shadow-md shadow-brand-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Provider</span>
          </Button>
        </div>
      </div>

      {/* ─── Telemetry Summary KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Connected Accounts
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {summary.totalConnectedAccounts}
            </span>
            <span className="text-[11px] text-slate-500">across networks</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Active Connections</span>
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-400">
              {summary.activeConnections}
            </span>
            <span className="text-[11px] text-emerald-500/80">healthy & syncing</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span>Requires Attention</span>
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-amber-400">
              {summary.attentionRequired}
            </span>
            <span className="text-[11px] text-slate-500">paused / re-auth</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
            <Sparkles className="h-3 w-3 text-brand-400" />
            <span>Available Providers</span>
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-brand-300">
              {summary.availableProviders}
            </span>
            <span className="text-[11px] text-slate-500">
              of {summary.totalProvidersInDirectory} in directory
            </span>
          </div>
        </div>
      </div>

      {/* ─── SECTION B: Connected Accounts List ─── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Connected Accounts</h2>
            <p className="text-xs text-slate-400">
              Live advertising accounts currently reporting into this workspace.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchConnectedAccounts}
            className="text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>Refresh</span>
          </Button>
        </div>

        <ConnectedAccountsTable
          accounts={connectedAccounts}
          isLoading={isLoadingAccounts}
          onRefresh={handleSuccess}
          onOpenConnectWizard={() => handleOpenWizardWithProvider()}
        />
      </div>

      {/* ─── SECTION C: Provider Directory ─── */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Supported Ad Networks & Retail Media
            </h2>
            <p className="text-xs text-slate-400">
              India-first advertising directory covering search, social, marketplace, and mobile networks.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search providers..."
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: "ALL", label: "All Providers" },
            { id: "SOCIAL", label: "Social Advertising" },
            { id: "SEARCH", label: "Search Advertising" },
            { id: "RETAIL_MARKETPLACE", label: "Marketplace & Retail Media" },
            { id: "MOBILE_NETWORKS", label: "Mobile Networks" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors shrink-0 ${
                categoryFilter === tab.id
                  ? "bg-brand-600/20 text-brand-300 font-semibold border border-brand-500/30"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Provider Cards Grid */}
        {isLoadingProviders ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading provider registry...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.key}
                provider={provider}
                onConnect={handleOpenWizardWithProvider}
                onOpenSetupGuide={handleOpenSetupGuide}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      <ConnectionWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        availableProviders={providers}
        initialProvider={selectedWizardProvider}
        onSuccess={handleSuccess}
      />

      <SetupGuideModal
        provider={setupGuideProvider}
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />
    </div>
  );
}
