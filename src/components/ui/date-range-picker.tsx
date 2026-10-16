"use client";

import * as React from "react";
import { Button } from "./button";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

interface DateRangePickerProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset, customRange?: { from: string; to: string }) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
  ];

  const currentLabel = presets.find((p) => p.id === value)?.label || "Custom Range";

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:text-white"
      >
        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
        <span>{currentLabel}</span>
        <ChevronDown className="ml-2 h-3.5 w-3.5 text-slate-400" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-44 rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.id);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded px-3 py-1.5 text-xs text-left transition-colors",
                value === p.id
                  ? "bg-brand-600/20 text-brand-400 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
