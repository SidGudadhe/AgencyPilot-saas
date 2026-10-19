"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ProviderMetadata, DiscoveredAdAccount, ProviderKey } from "@/lib/providers/types";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Layers,
  Lock,
  RefreshCw,
  Building,
  Check,
  Search,
  Sparkles,
  Info,
} from "lucide-react";

interface ConnectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  availableProviders: ProviderMetadata[];
  initialProvider?: ProviderMetadata | null;
  onSuccess: () => void;
}

export function ConnectionWizard({
  isOpen,
  onClose,
  availableProviders,
  initialProvider,
  onSuccess,
}: ConnectionWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderMetadata | null>(
    initialProvider || null
  );

  // Step 1: Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Step 2: Selected permissions
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  // Step 3 & 4: OAuth exchange state
  const [isGeneratingAuth, setIsGeneratingAuth] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAdAccount[]>([]);
  const [tempAuthToken, setTempAuthToken] = useState<string | null>(null);

  // Step 5: Selected account IDs
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  // Step 6: Final results
  const [connectResult, setConnectResult] = useState<any>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
      // Preselect default required permissions
      const required = initialProvider.permissions.map((p) => p.scope);
      setSelectedScopes(required);
      setStep(2);
    } else {
      setStep(1);
      setSelectedProvider(null);
    }
  }, [initialProvider, isOpen]);

  // Reset wizard on close
  const handleClose = () => {
    setStep(1);
    setSelectedProvider(null);
    setSelectedScopes([]);
    setDiscoveredAccounts([]);
    setTempAuthToken(null);
    setSelectedAccountIds([]);
    setConnectResult(null);
    setSearchQuery("");
    setCategoryFilter("ALL");
    onClose();
  };

  const handleSelectProvider = (prov: ProviderMetadata) => {
    setSelectedProvider(prov);
    const required = prov.permissions.map((p) => p.scope);
    setSelectedScopes(required);
    setStep(2);
  };

  const toggleScope = (scope: string, required: boolean) => {
    if (required) return; // Cannot uncheck required scope
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  // Launch official OAuth flow
  const handleStartOAuth = async () => {
    if (!selectedProvider) return;
    setIsGeneratingAuth(true);

    try {
      const res = await fetch("/api/providers/auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider.key,
          permissions: selectedScopes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed initiating provider authorization.");
      }

      const authUrl = data.authUrl;
      const expectedState = data.state;

      // Open OAuth in a popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        `Authorize ${selectedProvider.displayName}`,
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
      );

      setStep(3);

      // Listen for popup redirect completion or message
      const timer = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setIsGeneratingAuth(false);
            return;
          }

          // Check if popup reached our callback URL
          if (popup.location && popup.location.href.includes("/providers")) {
            const popupUrl = new URL(popup.location.href);
            const code = popupUrl.searchParams.get("oauth_code");
            const state = popupUrl.searchParams.get("oauth_state");
            const error = popupUrl.searchParams.get("oauth_error");

            popup.close();
            clearInterval(timer);

            if (error) {
              toast.error(`Authorization error: ${error}`);
              setStep(2);
              return;
            }

            if (code && state) {
              await handleExchangeAndDiscover(code, state);
            }
          }
        } catch {
          // Cross-origin restriction while on provider domain; expected until redirected
        }
      }, 700);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsGeneratingAuth(false);
    }
  };

  // Launch developer sandbox / test account flow
  const handleSandboxAuthorize = async () => {
    if (!selectedProvider) return;
    setIsGeneratingAuth(true);

    try {
      const res = await fetch("/api/providers/auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider.key,
          permissions: selectedScopes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed initiating provider authorization.");
      }

      const expectedState = data.state;
      await handleExchangeAndDiscover(
        `sandbox_${selectedProvider.key.toLowerCase()}_code_${Date.now()}`,
        expectedState
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsGeneratingAuth(false);
    }
  };

  // Step 4: Exchange code and discover accounts
  const handleExchangeAndDiscover = async (code: string, state: string) => {
    setIsDiscovering(true);
    setStep(4);

    try {
      const res = await fetch("/api/providers/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed discovering accounts from provider.");
      }

      setDiscoveredAccounts(data.discoveredAccounts || []);
      setTempAuthToken(data.tempAuthToken);

      // Pre-select first non-connected account
      const available = (data.discoveredAccounts || []).filter(
        (a: DiscoveredAdAccount) => !a.alreadyConnected
      );
      if (available.length > 0) {
        setSelectedAccountIds([available[0].externalId]);
      }

      setStep(5);
    } catch (err) {
      toast.error((err as Error).message);
      setStep(2);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Step 5: Save selected accounts
  const handleSaveAccounts = async () => {
    if (!tempAuthToken || selectedAccountIds.length === 0 || !selectedProvider) return;

    const chosen = discoveredAccounts.filter((a) => selectedAccountIds.includes(a.externalId));
    setIsConnecting(true);

    try {
      const res = await fetch("/api/providers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempAuthToken,
          selectedAccounts: chosen.map((c) => ({
            externalId: c.externalId,
            name: c.name,
            currency: c.currency,
            timezone: c.timezone,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed saving ad accounts.");
      }

      setConnectResult(data);
      setStep(6);
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  // Filter and sort providers for Step 1
  const filteredProviders = (availableProviders || []).filter((p) => {
    const matchesCategory =
      categoryFilter === "ALL" || p.category === categoryFilter;
    const matchesSearch =
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supportedProducts.some((prod) =>
        prod.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  // Sort: AVAILABLE providers first
  const sortedProviders = [...filteredProviders].sort((a, b) => {
    if (a.readiness === "AVAILABLE" && b.readiness !== "AVAILABLE") return -1;
    if (a.readiness !== "AVAILABLE" && b.readiness === "AVAILABLE") return 1;
    return 0;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Advertising Provider"
      description="Connect your advertising platform to sync live campaign metrics securely"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          {[
            { num: 1, label: "Provider" },
            { num: 2, label: "Permissions" },
            { num: 3, label: "Authorize" },
            { num: 4, label: "Validate" },
            { num: 5, label: "Accounts" },
            { num: 6, label: "Complete" },
          ].map((st) => (
            <div key={st.num} className="flex items-center space-x-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === st.num
                    ? "bg-brand-500 text-white ring-2 ring-brand-500/30"
                    : step > st.num
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {step > st.num ? <Check className="h-3 w-3" /> : st.num}
              </div>
              <span
                className={`text-[11px] font-medium hidden sm:inline ${
                  step === st.num ? "text-white font-semibold" : "text-slate-400"
                }`}
              >
                {st.label}
              </span>
            </div>
          ))}
        </div>

        {/* ─── STEP 1: Select Provider ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <p className="text-xs text-slate-300">
                Choose an advertising platform to initiate connection:
              </p>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search platforms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: "ALL", label: "All Platforms" },
                { id: "SOCIAL", label: "Social" },
                { id: "SEARCH", label: "Search" },
                { id: "MARKETPLACE", label: "Marketplace" },
                { id: "MOBILE", label: "Mobile / OTT" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === cat.id
                      ? "bg-brand-500/20 text-brand-300 border border-brand-500/40"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Provider Grid */}
            {sortedProviders.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No advertising platforms match your search criteria.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("ALL");
                  }}
                  className="text-xs border-slate-700"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {sortedProviders.map((prov) => {
                  const isAvailable = prov.readiness === "AVAILABLE";
                  const initial = prov.displayName.slice(0, 2).toUpperCase();

                  return (
                    <button
                      key={prov.key}
                      onClick={() => handleSelectProvider(prov)}
                      className={`flex items-start space-x-3 rounded-xl border p-3.5 text-left transition-all group ${
                        isAvailable
                          ? "border-emerald-500/40 bg-slate-900/90 hover:border-emerald-500 hover:bg-slate-800/80 shadow-sm"
                          : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-xs shrink-0 border ${
                          isAvailable
                            ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}
                      >
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                            {prov.displayName}
                          </h4>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {prov.currentVersion}
                        </p>

                        <div className="mt-2 flex items-center">
                          {isAvailable ? (
                            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                              Ready to Connect (OAuth 2.0)
                            </span>
                          ) : prov.readiness === "PARTNER_ACCESS_REQUIRED" ? (
                            <span className="inline-flex items-center text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                              Partner Access Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              Developer Setup
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: Review Permissions ─── */}
        {step === 2 && selectedProvider && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <div className="flex items-center space-x-2 text-white font-semibold text-xs">
                <ShieldCheck className="h-4 w-4 text-brand-400" />
                <span>Read-Only Least Privilege Access</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                AgencyPilot requires only read-only reporting access. We will never modify your ad
                budgets, alter bids, or publish changes to your campaigns.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-white uppercase tracking-wider text-[10px]">
                Supported Access Permissions for {selectedProvider.displayName}
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 divide-y divide-slate-800">
                {selectedProvider.permissions.map((perm) => (
                  <div key={perm.scope} className="p-3 flex items-start justify-between space-x-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white">{perm.name}</span>
                        <span className="font-mono text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                          {perm.scope}
                        </span>
                        {perm.required && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{perm.description}</p>
                      <p className="text-[10px] text-slate-500 italic">Purpose: {perm.purpose}</p>
                    </div>
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(perm.scope)}
                        disabled={perm.required}
                        onChange={() => toggleScope(perm.scope, perm.required)}
                        className="rounded border-slate-700 text-brand-600 focus:ring-brand-500 h-4 w-4 bg-slate-900 cursor-pointer disabled:opacity-70"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back to Providers</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSandboxAuthorize}
                  isLoading={isGeneratingAuth}
                  className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-medium"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  <span>Connect Developer Test Account</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartOAuth}
                  isLoading={isGeneratingAuth}
                  className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center space-x-1.5"
                >
                  <span>Continue to Live OAuth</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Authorizing in Progress ─── */}
        {step === 3 && selectedProvider && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-400 animate-pulse">
              <Lock className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">
                Authorize with {selectedProvider.displayName}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                A secure official authorization window has been opened. Sign in to your{" "}
                {selectedProvider.displayName} account and grant read-only permissions to complete the
                connection.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="text-xs border-slate-700"
              >
                Back to Permissions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSandboxAuthorize}
                isLoading={isGeneratingAuth}
                className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-medium"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                <span>Connect Developer Test Account</span>
              </Button>
              <Button
                size="sm"
                onClick={handleStartOAuth}
                isLoading={isGeneratingAuth}
                className="text-xs bg-brand-600 hover:bg-brand-500 text-white"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                <span>Re-open OAuth Window</span>
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Validating and Discovering ─── */}
        {step === 4 && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-400 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">
                Validating Authorization & Discovering Accounts...
              </h4>
              <p className="text-xs text-slate-400">
                Exchanging secure authorization code and querying accessible advertising accounts via
                official provider API.
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP 5: Select Accounts ─── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Accessible Advertising Accounts</h4>
                <p className="text-xs text-slate-400">
                  Select the advertising account(s) you wish to connect to this workspace:
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedAccountIds.length} of {discoveredAccounts.length} selected
              </span>
            </div>

            {discoveredAccounts.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-amber-300 space-y-1">
                <AlertTriangle className="h-5 w-5 mx-auto text-amber-400" />
                <p className="font-semibold">No Ad Accounts Found</p>
                <p className="text-[11px] text-amber-300/80">
                  Your provider account does not have access to any active advertising accounts. Ensure
                  your user has appropriate business manager permissions.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800 max-h-60 overflow-y-auto">
                {discoveredAccounts.map((acc) => {
                  const isSelected = selectedAccountIds.includes(acc.externalId);
                  const isAlready = acc.alreadyConnected;

                  return (
                    <div
                      key={acc.externalId}
                      onClick={() => {
                        if (isAlready) return;
                        if (isSelected) {
                          setSelectedAccountIds(selectedAccountIds.filter((id) => id !== acc.externalId));
                        } else {
                          setSelectedAccountIds([...selectedAccountIds, acc.externalId]);
                        }
                      }}
                      className={`p-3 flex items-center justify-between transition-colors ${
                        isAlready
                          ? "opacity-50 cursor-not-allowed bg-slate-900/30"
                          : "hover:bg-slate-800/60 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-white font-bold text-xs shrink-0">
                          {acc.currency}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-white">{acc.name}</span>
                            {isAlready && (
                              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                                ALREADY CONNECTED
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {acc.externalId} • TZ: {acc.timezone || "Asia/Kolkata"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAlready}
                          onChange={() => {}}
                          className="rounded border-slate-700 text-brand-600 focus:ring-brand-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAccounts}
                isLoading={isConnecting}
                disabled={selectedAccountIds.length === 0}
                className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium"
              >
                <span>Connect Selected ({selectedAccountIds.length})</span>
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 6: Success Confirmation ─── */}
        {step === 6 && connectResult && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-white">Connection Verified & Saved!</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {connectResult.message || "Your advertising account is successfully linked and verified."}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Verified Connected Accounts</span>
                <span className="text-emerald-400">Live Reporting Verified</span>
              </div>
              <div className="space-y-1.5 divide-y divide-slate-800/60">
                {connectResult.connectedAccounts?.map((acc: any) => (
                  <div key={acc.id} className="pt-1.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white text-xs">{acc.accountName}</p>
                      <p className="font-mono text-[10px] text-slate-400">ID: {acc.externalAccountId}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {acc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3">
              <Button
                size="sm"
                onClick={handleClose}
                className="w-full text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium"
              >
                Return to Connected Accounts
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
