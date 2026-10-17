"use client";

import React from "react";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { UnifiedAdItem } from "@/types/analytics";
import { formatCurrency, formatNumber, formatPercent, formatROAS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdDetailModal } from "./ad-detail-modal";

interface AdsTableProps {
  ads: UnifiedAdItem[];
  currency?: string;
}

export function AdsTable({ ads, currency = "INR" }: AdsTableProps) {
  const [selectedAd, setSelectedAd] = React.useState<UnifiedAdItem | null>(null);

  const columns: ColumnDef<UnifiedAdItem>[] = [
    {
      key: "name",
      header: "Ad Name & Provider",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col max-w-xs">
          <span className="font-semibold text-slate-100 truncate text-xs">
            {row.name}
          </span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="text-[10px] font-mono text-brand-400 bg-brand-500/10 px-1 rounded">
              {row.provider}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {row.campaignName}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      render: (row) => {
        const isLive = row.status === "ACTIVE";
        const isPaused = row.status === "PAUSED";
        const isRejected = row.status === "REJECTED";

        return (
          <Badge
            variant={
              isLive
                ? "success"
                : isRejected
                ? "destructive"
                : isPaused
                ? "warning"
                : "secondary"
            }
            className="text-[10px] font-mono"
          >
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "spend",
      header: "Spend",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono font-semibold text-slate-100 text-xs">
          {formatCurrency(row.spend, currency)}
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
          {row.conversions !== null ? formatNumber(row.conversions) : "—"}
        </span>
      ),
    },
    {
      key: "roas",
      header: "ROAS",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-mono font-semibold text-brand-400 text-xs">
          {formatROAS(row.roas)}
        </span>
      ),
    },
    {
      key: "performanceStatus",
      header: "Diagnosis",
      sortable: true,
      align: "center",
      render: (row) => {
        if (row.performanceStatus === "HEALTHY") {
          return <Badge variant="success" className="text-[10px]">Healthy</Badge>;
        }
        if (row.performanceStatus === "NEEDS_ATTENTION") {
          return <Badge variant="destructive" className="text-[10px]">Needs Attention</Badge>;
        }
        return <Badge variant="outline" className="text-[10px]">Monitor</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        data={ads as unknown as Record<string, unknown>[]}
        searchKey="name"
        searchPlaceholder="Search ads by name or ID..."
        onRowClick={(row) => setSelectedAd(row as unknown as UnifiedAdItem)}
        pageSize={15}
        emptyTitle="No Ads Found"
        emptyDescription="No advertising records match your active filters. If you recently connected a provider, sync your accounts to import active ads."
      />

      <AdDetailModal
        ad={selectedAd}
        isOpen={!!selectedAd}
        onClose={() => setSelectedAd(null)}
        currency={currency}
      />
    </div>
  );
}
