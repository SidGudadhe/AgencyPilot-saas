"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, User, Trash2, ArrowUpRight, HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  evidence?: Record<string, unknown>;
  timestamp: string;
}

interface AIChatInterfaceProps {
  workspaceName?: string;
  workspaceId: string;
}

export function AIChatInterface({
  workspaceName = "My Workspace",
  workspaceId,
}: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I am your AgencyPilot AI Analyst for **${workspaceName}**. I answer questions using only your real synchronized advertising performance data.

Try asking one of the quick questions below or enter a custom prompt.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const quickPrompts = [
    "Which ads need immediate attention?",
    "Which of my ads are performing best by ROAS?",
    "Which provider is delivering the most conversions?",
    "Are there any ads with high spend but zero conversions?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          prompt: query,
          history: messages.slice(-6), // Send last 6 turns for context
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to query AI Agent");

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        evidence: data.evidence,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast.error((err as Error).message);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error querying your workspace data. Please check your network connection or ensure your ad provider is synced.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: `Chat history cleared. How can I help you analyze your active campaigns in **${workspaceName}**?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-8.5rem)] border-slate-800 bg-slate-900/60 shadow-xl">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/80 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-sm font-semibold">
                AgencyPilot AI Advertising Analyst
              </CardTitle>
              <Badge variant="outline" className="text-[10px] py-0 font-mono">
                Real Data Only
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Direct mathematical analysis of active workspace ad metrics
            </CardDescription>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearChat}
          className="h-8 text-xs text-slate-400 hover:text-slate-200"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          New Conversation
        </Button>
      </CardHeader>

      {/* Message Stream */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {!isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-950/80 text-slate-200 border border-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                {m.evidence && (
                  <div className="mt-2.5 rounded bg-slate-900/90 p-2 text-[11px] font-mono border border-slate-800 text-slate-400">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">
                      Ground Truth Evidence:
                    </span>
                    <pre className="overflow-x-auto mt-1">
                      {JSON.stringify(m.evidence, null, 2)}
                    </pre>
                  </div>
                )}

                <span className="mt-1 block text-[10px] opacity-40 font-mono text-right">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 border border-slate-700 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 text-xs text-slate-400 italic flex items-center space-x-2">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-400" />
              <span>Analyzing workspace metrics and anomaly rules...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex flex-wrap gap-2">
        {quickPrompts.map((q) => (
          <button
            key={q}
            disabled={isLoading}
            onClick={() => handleSendMessage(q)}
            className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800 transition-colors disabled:opacity-50"
          >
            <span>{q}</span>
            <ArrowUpRight className="ml-1 h-3 w-3 text-slate-500" />
          </button>
        ))}
      </div>

      {/* Input Box Footer */}
      <CardFooter className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex w-full items-center space-x-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your active ads, spend, ROAS, or conversions..."
            disabled={isLoading}
            className="flex-1 h-10 text-xs bg-slate-900 border-slate-700"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isLoading}
            className="h-10 px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
