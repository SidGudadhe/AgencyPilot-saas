"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DateRangePreset } from "@/components/ui/date-range-picker";
import { WorkspaceThemeProvider } from "@/contexts/workspace-theme-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d");
  const [currentUserName, setCurrentUserName] = useState<string | null | undefined>(
    session?.user?.name
  );

  // Synchronize state when session changes
  React.useEffect(() => {
    if (session?.user?.name) {
      setCurrentUserName(session.user.name);
    }
  }, [session?.user?.name]);

  // Reactive listener for immediate profile updates across components without page reload
  React.useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string }>;
      if (customEvent.detail?.name) {
        setCurrentUserName(customEvent.detail.name);
      }
    };
    window.addEventListener("agency-pilot-profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("agency-pilot-profile-updated", handleProfileUpdate);
    };
  }, []);

  // Protect client side while NextAuth evaluates
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090d16] text-slate-400">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
          <span>Authenticating AgencyPilot Session...</span>
        </div>
      </div>
    );
  }

  const activeUserName = currentUserName || session?.user?.name;

  return (
    <WorkspaceThemeProvider>
      <div className="flex h-screen overflow-hidden bg-[#090d16]">
        {/* Desktop Persistent Sidebar */}
        <Sidebar
          workspaceName="Personal Workspace"
          userName={activeUserName}
          userEmail={session?.user?.email}
          className="hidden md:flex shrink-0"
        />

        {/* Mobile Drawer */}
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          workspaceName="Personal Workspace"
          userName={activeUserName}
          userEmail={session?.user?.email}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Header
            workspaceName="Personal Workspace"
            role="OWNER"
            dateRange={dateRange}
            onDateRangeChange={(p) => setDateRange(p)}
            onMobileMenuToggle={() => setMobileNavOpen(true)}
          />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceThemeProvider>
  );
}
