"use client";

import React from "react";
import { AIChatInterface } from "@/components/ai/ai-chat-interface";
import { useSession } from "next-auth/react";

export default function AIAgentPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          AI Advertising Analyst
        </h1>
        <p className="text-xs text-slate-400">
          Ask natural-language questions about your multi-platform spend, conversion efficiency, and problem ads
        </p>
      </div>

      <AIChatInterface
        workspaceName="Personal Workspace"
        workspaceId={session?.user?.activeWorkspaceId || "default"}
      />
    </div>
  );
}
