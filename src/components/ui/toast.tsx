"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  const toast = React.useMemo(
    () => ({
      success: (title: string, message?: string) => showToast("success", title, message),
      error: (title: string, message?: string) => showToast("error", title, message),
      warning: (title: string, message?: string) => showToast("warning", title, message),
      info: (title: string, message?: string) => showToast("info", title, message),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start p-4 rounded-lg border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2",
              t.type === "success" && "bg-slate-900/95 border-emerald-500/40 text-slate-100",
              t.type === "error" && "bg-slate-900/95 border-red-500/40 text-slate-100",
              t.type === "warning" && "bg-slate-900/95 border-amber-500/40 text-slate-100",
              t.type === "info" && "bg-slate-900/95 border-sky-500/40 text-slate-100"
            )}
          >
            <div className="mr-3 mt-0.5">
              {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
              {t.type === "warning" && <AlertCircle className="h-5 w-5 text-amber-400" />}
              {t.type === "info" && <Info className="h-5 w-5 text-sky-400" />}
            </div>
            <div className="flex-1 mr-2">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && <p className="text-xs text-slate-400 mt-0.5">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
