"use client";

import { useState, useEffect } from "react";
import Switch from "react-switch";
import { cn } from "@/lib/utils";
import { interfaceColor } from "@/lib/theme";

interface ChineseScriptToggleProps {
  className?: string;
  onScriptChange?: (script: "traditional" | "simplified") => void;
}

export function ChineseScriptToggle({
  className = "",
  onScriptChange,
}: ChineseScriptToggleProps) {
  const [isTraditional, setIsTraditional] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user preference on mount
    const userPreference = getUserChineseScriptPreference();
    setIsTraditional(userPreference === "traditional");
    setIsLoading(false);
  }, []);

  const handleToggle = (checked: boolean) => {
    const newScript = checked ? "traditional" : "simplified";
    setIsTraditional(checked);
    setUserChineseScriptPreference(newScript);

    // Notify parent component if callback provided
    if (onScriptChange) {
      onScriptChange(newScript);
    }

    // Trigger a page refresh to apply the conversion immediately
    // This ensures all Chinese text on the page is converted in real-time
    setTimeout(() => {
      window.location.reload();
    }, 10);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="h-3 w-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        简体
      </span>
      <Switch
        checked={isTraditional}
        onChange={handleToggle}
        checkedIcon={false}
        uncheckedIcon={false}
        onColor={interfaceColor}
        offColor={interfaceColor}
        height={20}
        width={40}
      />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        繁體
      </span>
    </div>
  );
}

/**
 * Hook for managing Chinese script preference
 */
export function useChineseScriptPreference() {
  const [script, setScript] = useState<"traditional" | "simplified">(
    "simplified"
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userPreference = getUserChineseScriptPreference();
    setScript(userPreference);
    setIsLoading(false);
  }, []);

  const updateScript = (newScript: "traditional" | "simplified") => {
    setScript(newScript);
    setUserChineseScriptPreference(newScript);
  };

  return {
    script,
    updateScript,
    isLoading,
  };
}

// Helper functions (these will be imported from chinese-converter.ts)
function getUserChineseScriptPreference(): "traditional" | "simplified" {
  if (typeof window === "undefined") return "simplified";

  try {
    const preference = localStorage.getItem("chineseScriptPreference");
    return preference === "traditional" ? "traditional" : "simplified";
  } catch (error) {
    console.error("[CHINESE_TOGGLE] Error getting user preference:", error);
    return "simplified";
  }
}

function setUserChineseScriptPreference(
  script: "traditional" | "simplified"
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("chineseScriptPreference", script);
  } catch (error) {
    console.error("[CHINESE_TOGGLE] Error setting user preference:", error);
  }
}
