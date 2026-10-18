"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export type WorkspaceTheme = "dark" | "light";

interface WorkspaceThemeContextType {
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
  workspaceId: string | null;
}

const WorkspaceThemeContext = createContext<WorkspaceThemeContextType | undefined>(undefined);

export function WorkspaceThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const workspaceId = (session?.user as unknown as { activeWorkspaceId?: string })?.activeWorkspaceId || null;

  const [theme, setCurrentTheme] = useState<WorkspaceTheme>("dark");
  const [isLoading, setIsLoading] = useState(true);

  // Sync theme to DOM
  const applyThemeToDom = (newTheme: WorkspaceTheme) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }
  };

  // Load theme when active workspace changes
  useEffect(() => {
    if (!workspaceId) {
      applyThemeToDom("dark");
      setIsLoading(false);
      return;
    }

    const storageKey = `agencypilot_workspace_theme_${workspaceId}`;
    const cachedTheme = localStorage.getItem(storageKey) as WorkspaceTheme | null;

    if (cachedTheme === "light" || cachedTheme === "dark") {
      setCurrentTheme(cachedTheme);
      applyThemeToDom(cachedTheme);
    } else {
      setCurrentTheme("dark");
      applyThemeToDom("dark");
    }

    // Fetch authoritative ground-truth theme from API
    let isMounted = true;
    fetch("/api/workspace/theme")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.success && (data.theme === "light" || data.theme === "dark")) {
          setCurrentTheme(data.theme);
          applyThemeToDom(data.theme);
          localStorage.setItem(storageKey, data.theme);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote workspace theme, using local cached value:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const setTheme = useCallback(
    async (newTheme: WorkspaceTheme) => {
      setCurrentTheme(newTheme);
      applyThemeToDom(newTheme);

      if (workspaceId) {
        localStorage.setItem(`agencypilot_workspace_theme_${workspaceId}`, newTheme);
        try {
          await fetch("/api/workspace/theme", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: newTheme }),
          });
        } catch (err) {
          console.error("Failed to persist workspace theme to server:", err);
        }
      }
    },
    [workspaceId]
  );

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    await setTheme(nextTheme);
  }, [theme, setTheme]);

  return (
    <WorkspaceThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isLoading,
        workspaceId,
      }}
    >
      <div data-theme={theme} className={theme === "light" ? "theme-light" : "theme-dark"}>
        {children}
      </div>
    </WorkspaceThemeContext.Provider>
  );
}

export function useWorkspaceTheme() {
  const context = useContext(WorkspaceThemeContext);
  if (!context) {
    throw new Error("useWorkspaceTheme must be used within a WorkspaceThemeProvider");
  }
  return context;
}
