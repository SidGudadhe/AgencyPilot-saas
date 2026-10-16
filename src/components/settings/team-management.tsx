"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { UserPlus, Trash2, Users } from "lucide-react";

export interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
}

interface TeamManagementProps {
  members: TeamMember[];
  currentUserId: string;
  isOwner: boolean;
  onRefresh?: () => void;
}

export function TeamManagement({
  members,
  currentUserId,
  isOwner,
  onRefresh,
}: TeamManagementProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "OWNER">("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite member");

      toast.success(`Member invited successfully: ${inviteEmail}`);
      setInviteEmail("");
      onRefresh?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this workspace? Their access to all analytics will be immediately revoked.`)) {
      return;
    }

    setRemovingId(membershipId);
    try {
      const res = await fetch(`/api/workspace/members?membershipId=${membershipId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");

      toast.success("Team member access revoked successfully");
      onRefresh?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-brand-400" />
          <CardTitle className="text-sm font-semibold">Team & Workspace Members</CardTitle>
        </div>
        <CardDescription>
          Collaborate on multi-platform ad performance with explicit role-based access control
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Invite Form (Owner Only) */}
        {isOwner && (
          <form
            onSubmit={handleInvite}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Registered User Email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>
            <div className="w-36">
              <Select
                label="Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "OWNER")}
                className="h-8 text-xs py-0"
              >
                <option value="MEMBER">Member</option>
                <option value="OWNER">Owner</option>
              </Select>
            </div>
            <Button
              type="submit"
              size="sm"
              isLoading={isInviting}
              className="h-8 text-xs"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add Member
            </Button>
          </form>
        )}

        {/* Member Roster List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Members ({members.length})
          </h4>
          <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/50">
            {members.map((m) => {
              const isSelf = m.userId === currentUserId;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 text-xs"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100">
                        {m.name || "User"}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          (You)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {m.email}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={m.role === "OWNER" ? "default" : "secondary"}
                      className="text-[10px] font-mono"
                    >
                      {m.role}
                    </Badge>

                    {isOwner && !isSelf && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(m.id, m.email)}
                        isLoading={removingId === m.id}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                        title="Revoke workspace access"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
