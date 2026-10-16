"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { signOut } from "next-auth/react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleStep1Confirm = () => {
    setStep(2);
  };

  const handleStep2Execute = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      toast.error("Confirmation text does not match");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step1Confirmed: true,
          step2Confirmed: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process account deletion");
      }

      toast.success("Account deletion initiated. Signing out...");
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1500);
    } catch (err) {
      toast.error((err as Error).message);
      setIsDeleting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setConfirmText("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={step === 1 ? "Step 1: Subscription & Billing Warning" : "Step 2: Permanent Data Deletion"}
      className="max-w-md"
    >
      <div className="space-y-4 pt-2">
        {step === 1 ? (
          <>
            <div className="rounded-lg bg-amber-950/40 p-4 border border-amber-500/40 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span className="font-semibold text-sm">Subscription Cancellation</span>
              </div>
              <p className="text-xs text-amber-200 leading-relaxed">
                Deleting your account will permanently remove your account access and initiate the
                applicable subscription cancellation process. Refund eligibility is governed by the
                applicable subscription terms. Recreating an account with the same details will not
                automatically restore a canceled subscription or previous subscription benefits.
              </p>
            </div>

            <p className="text-xs text-slate-400">
              Please review your active billing commitments before continuing. Proceeding to Step 2
              does not cancel your account yet.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleStep1Confirm}>
                I Understand, Proceed to Step 2
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-red-950/40 p-4 border border-red-500/40 space-y-2">
              <div className="flex items-center space-x-2 text-red-400">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span className="font-semibold text-sm">Permanent Data Deletion</span>
              </div>
              <p className="text-xs text-red-200 leading-relaxed">
                Deleting your account will permanently delete the account data and analytics
                associated with the account, subject to applicable legal, billing, security, and
                data-retention obligations. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 block">
                Type <span className="font-mono text-red-400 font-bold">DELETE MY ACCOUNT</span> to confirm:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="font-mono text-xs border-red-900 focus-visible:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} disabled={isDeleting}>
                Back to Step 1
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStep2Execute}
                isLoading={isDeleting}
                disabled={confirmText !== "DELETE MY ACCOUNT"}
              >
                Permanently Delete Account
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
