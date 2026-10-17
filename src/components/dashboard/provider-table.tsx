"use client";

import React from "react";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { ProviderComparisonRow } from "@/types/analytics";
import { formatCurrency, formatNumber, formatPercent, formatROAS, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface ProviderTableProps {
  data: ProviderComparisonRow[];
  currency?: string;
}

export function ProviderTable({ data, currency = "INR" }: ProviderTableProps) {
  const router = useRouter();

  const columns: ColumnDef<ProviderComparisonRow>[] = [
    {
      key: "providerName",
      header: "Ad Provider",
      sortable: true,
      render: (row) => (
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-xs font-bold text-brand-400 border border-slate-700">
            {row.provider.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-100">{row.providerName}</span>
            <span className="text-[11px] text-slate-400">{row.connectedAccountName}</span>
          </div>
        </div>
      ),
    },
    {
      key: "activeAdsCount",
      header: "Active Ads",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-mono text-xs">{row.activeAdsCount}</span>
      ),
    },
    {
      key: "totalSpend",
      header: "Total Spend",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono font-semibold text-slate-100">
          {formatCurrency(row.totalSpend, currency)}
        </span>
      ),
    },
    {
      key: "impressions",
      header: "Impressions",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {formatNumber(row.impressions)}
        </span>
      ),
    },
    {
      key: "clicks",
      header: "Clicks",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {formatNumber(row.clicks)}
        </span>
      ),
    },
    {
      key: "ctr",
      header: "CTR",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {formatPercent(row.ctr)}
        </span>
      ),
    },
    {
      key: "cpc",
      header: "CPC",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {formatCurrency(row.cpc, currency)}
        </span>
      ),
    },
    {
      key: "conversions",
      header: "Conversions",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {row.conversions !== null ? formatNumber(row.conversions) : "Not tracked"}
        </span>
      ),
    },
    {
      key: "roas",
      header: "ROAS",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono font-semibold text-brand-400">
          {formatROAS(row.roas)}
        </span>
      ),
    },
    {
      key: "performanceStatus",
      header: "Status",
      sortable: true,
      align: "center",
      render: (row) => {
        if (row.performanceStatus === "HEALTHY") {
          return <Badge variant="success">Healthy</Badge>;
        }
        if (row.performanceStatus === "CRITICAL") {
          return <Badge variant="destructive">Critical</Badge>;
        }
        if (row.performanceStatus === "MONITOR") {
          return <Badge variant="warning">Monitor</Badge>;
        }
        return <Badge variant="secondary">No Data</Badge>;
      },
    },
    {
      key: "lastSyncAt",
      header: "Last Synced",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-[11px] font-mono text-slate-400">
          {formatDateTime(row.lastSyncAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Advertising Provider Comparison
          </h2>
          <p className="text-xs text-slate-400">
            Cross-platform breakdown of connected ad networks
          </p>
        </div>
      </div>

      <DataTable
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        data={data as unknown as Record<string, unknown>[]}
        searchKey="providerName"
        searchPlaceholder="Filter providers..."
        onRowClick={(row) => {
          const provider = (row as unknown as ProviderComparisonRow).provider;
          router.push(`/ads-analysis?provider=${provider}`);
        }}
        emptyTitle="No Ad Providers Connected"
        emptyDescription="Connect your Meta, Google, or Indian ad network accounts to compare multi-platform performance from one place."
      />
    </div>
  );
}
