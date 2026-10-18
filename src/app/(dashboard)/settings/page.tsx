"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { TeamManagement, TeamMember } from "@/components/settings/team-management";
import { BillingSection } from "@/components/settings/billing-section";
import { WorkspaceThemeSettings } from "@/components/settings/workspace-theme-settings";
import { DeleteAccountModal } from "@/components/settings/delete-account-modal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { AlertTriangle, User, Key, Users, CreditCard, Trash2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "team" | "billing" | "security">("profile");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isOwner, setIsOwner] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/members");
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
        setIsOwner(data.isOwner);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "team") {
      fetchMembers();
    }
  }, [activeTab, fetchMembers]);

  const navItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Workspace Theme", icon: Palette },
    { id: "team", label: "Team Management", icon: Users },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "security", label: "Security & Password", icon: Key },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Workspace Settings
        </h1>
        <p className="text-xs text-slate-400">
          Manage your personal profile, security credentials, team access, and subscription
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation Tabs */}
        <div className="w-full md:w-56 shrink-0 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={cn(
                  "flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left",
                  isActive
                    ? "bg-brand-600/20 text-brand-400 font-semibold border border-brand-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Danger Zone Tab Divider */}
          <div className="pt-4 border-t border-slate-800/80 mt-4">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/30 transition-colors text-left"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 space-y-6">
          {activeTab === "profile" && (
            <ProfileForm
              initialName={session?.user?.name}
              email={session?.user?.email}
            />
          )}

          {activeTab === "appearance" && (
            <WorkspaceThemeSettings workspaceName="Primary Agency Workspace" />
          )}

          {activeTab === "team" && (
            <TeamManagement
              members={members}
              currentUserId={session?.user?.id || ""}
              isOwner={isOwner}
              onRefresh={fetchMembers}
            />
          )}

          {activeTab === "billing" && (
            <BillingSection plan="FREE" status="ACTIVE" />
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <PasswordForm />

              {/* Danger Zone Box */}
              <Card className="border-red-900/50 bg-red-950/10">
                <CardHeader>
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <CardTitle className="text-sm font-semibold text-red-300">
                      Danger Zone
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-red-300/70">
                    Permanently delete your account and cancel active subscriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="text-xs"
                  >
                    Initiate 2-Step Account Deletion
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Two-Step Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        userEmail={session?.user?.email || ""}
      />
    </div>
  );
}
