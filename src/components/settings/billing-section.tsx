"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, ShieldCheck } from "lucide-react";

interface BillingSectionProps {
  plan?: string;
  status?: string;
  currentPeriodEnd?: string | null;
}

export function BillingSection({
  plan = "FREE",
  status = "ACTIVE",
  currentPeriodEnd,
}: BillingSectionProps) {
  const plans = [
    {
      name: "Starter",
      price: "₹1,999",
      period: "per month",
      description: "Essential multi-platform ad monitoring for individual media buyers",
      features: [
        "Up to 3 Ad Accounts",
        "Meta & Google Ads tracking",
        "Evidence-based problem detector",
        "Daily automated sync",
      ],
      current: plan === "FREE" || plan === "STARTER",
    },
    {
      name: "Professional",
      price: "₹4,999",
      period: "per month",
      description: "Comprehensive analytics with AI Agent and team access",
      features: [
        "Unlimited Ad Accounts",
        "All Global & Indian Ad Providers",
        "AI Agent natural-language queries",
        "3 Team Member seats",
        "Hourly sync & custom CPA targets",
      ],
      current: plan === "PROFESSIONAL",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "annual billing",
      description: "Dedicated infrastructure, custom attribution, and SLA guarantees",
      features: [
        "Custom API integrations",
        "Unlimited team seats",
        "Dedicated account manager",
        "Custom data retention policies",
      ],
      current: plan === "ENTERPRISE",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Overview Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-brand-400" />
              <CardTitle className="text-sm font-semibold">
                Subscription & Billing Plan
              </CardTitle>
            </div>
            <Badge
              variant={status === "ACTIVE" ? "success" : "secondary"}
              className="font-mono text-xs"
            >
              {status}
            </Badge>
          </div>
          <CardDescription>
            Manage active workspace license and subscription lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-950 p-4 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Current Plan Tier</span>
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                {plan} TIER
              </span>
            </div>
            {currentPeriodEnd && (
              <div>
                <span className="text-xs text-slate-400 block">Next Renewal Date</span>
                <span className="text-sm font-mono text-slate-200">
                  {new Date(currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400 block">Billing Provider</span>
              <span className="text-xs font-mono text-slate-300">
                Direct Workspace Invoicing
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
              p.current
                ? "border-brand-500/60 bg-brand-950/20 shadow-md shadow-brand-500/10"
                : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{p.name}</h3>
                {p.current && (
                  <Badge variant="default" className="text-[10px]">
                    Current Plan
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex items-baseline space-x-1">
                <span className="text-2xl font-bold font-mono text-white">
                  {p.price}
                </span>
                <span className="text-xs text-slate-400">/{p.period}</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {p.description}
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3">
                {p.features.map((feat) => (
                  <div key={feat} className="flex items-center space-x-2 text-xs text-slate-300">
                    <Check className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-2">
              <Button
                variant={p.current ? "outline" : "default"}
                size="sm"
                className="w-full text-xs"
                disabled={p.current}
              >
                {p.current ? "Active Plan" : "Upgrade Plan"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
