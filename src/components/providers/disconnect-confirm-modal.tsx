"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, ShieldAlert } from "lucide-react";

interface DisconnectConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  maskedAccountId: string;
  provider: string;
  onConfirm: () => Promise<void>;
}

export function DisconnectConfirmModal({
  isOpen,
  onClose,
  accountName,
  maskedAccountId,
  provider,
  onConfirm,
}: DisconnectConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDisconnect = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disconnect Advertising Account?"
      description={`You are about to disconnect ${accountName} (${maskedAccountId})`}
      className="max-w-md border-red-900/60 bg-slate-900"
    >
      <div className="space-y-4 text-xs text-slate-300">
        <div className="flex items-start space-x-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-1">
            <p className="font-semibold text-red-200">
              Immediate Effect on Synchronization
            </p>
            <p className="text-[11px] leading-relaxed text-red-300/80">
              All ongoing and scheduled data synchronization for this account will stop immediately.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg bg-slate-950/60 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-200 font-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>What happens during disconnection:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>AgencyPilot will cease all API calls to {provider} on behalf of this account.</li>
            <li>Stored OAuth tokens will be securely wiped from encrypted storage.</li>
            <li>Token revocation will be executed with {provider} where supported.</li>
            <li>Previously collected historical reports remain safely in your workspace.</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            isLoading={isDeleting}
            className="text-xs bg-red-600 hover:bg-red-700 text-white flex items-center space-x-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Confirm Disconnect</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
