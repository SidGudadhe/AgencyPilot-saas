import Link from "next/link";
import { Zap, BarChart2, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-100">
      {/* Navigation */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6 lg:px-12">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Agency<span className="text-brand-400">Pilot</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-Data Multi-Platform Ads Decision Engine</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
          Consolidate your ad accounts.{" "}
          <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
            Eliminate wasted spend.
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base text-slate-400 leading-relaxed">
          Monitor your campaigns across Meta, Google Ads, and Indian networks from one unified dashboard.
          Identify genuine performance anomalies with concrete mathematical evidence—never fabricated numbers.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="h-11 px-6 text-sm font-semibold">
              <span>Start Free Workspace</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-11 px-6 text-sm font-semibold border-slate-700">
              Access Existing Workspace
            </Button>
          </Link>
        </div>

        {/* 3 Core Pillars */}
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left w-full">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 mb-3 border border-brand-500/30">
              <BarChart2 className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Consolidated Analytics</h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Unified cross-platform metrics without switching tabs. Normalized spend, clicks, CTR, CPA, and ROAS.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400 mb-3 border border-red-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Evidence-Based Alerts</h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Detect ads with climbing spend and zero conversions, ad fatigue, or broken delivery rules before capital is burned.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 mb-3 border border-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Dedicated AI Analyst</h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Query your advertising data in natural language. Powered by real ground-truth numbers with workspace-scoped security.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <p>© 2026 AgencyPilot SaaS. All rights reserved. Zero fake data guarantee.</p>
      </footer>
    </div>
  );
}
