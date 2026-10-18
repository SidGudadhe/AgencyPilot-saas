"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { UserCheck } from "lucide-react";

interface ProfileFormProps {
  initialName?: string | null;
  email?: string | null;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [name, setName] = useState(initialName || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { update } = useSession();

  // Synchronize state when session loads asynchronously
  useEffect(() => {
    if (initialName) {
      setName(initialName);
    }
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a valid name");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      const savedName = data.user?.name || name.trim();
      setName(savedName);

      toast.success("Profile updated successfully");

      // Broadcast update event so Sidebar and Navigation immediately re-render with new name
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("agency-pilot-profile-updated", {
            detail: { name: savedName },
          })
        );
      }

      // Update client session name and trigger server component refresh
      try {
        await update({ name: savedName, user: { name: savedName } });
      } catch {
        // Session update is best effort
      }
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-brand-500" />
          <span>User Profile</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Manage your personal display information across workspaces
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            label="Full Name / Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />

          <Input
            label="Login Email (Read-only)"
            value={email || ""}
            disabled
            className="opacity-70 bg-muted/50 font-mono text-xs cursor-not-allowed"
          />

          <Button type="submit" size="sm" isLoading={isSaving}>
            Save Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
