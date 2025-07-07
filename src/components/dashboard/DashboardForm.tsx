"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CustomPopover } from "@/app/dashboard/menu-components/CustomPopover";
import type { PopoverItem } from "@/app/dashboard/menu-components/CustomPopover";
import { nativeLanguageData } from "@/app/dashboard/menu-data/nativeLanguageData";
import {
  languageLearningData,
  type LanguageOption,
} from "@/app/dashboard/menu-data/languageLearningData";
import { levelsData } from "@/app/dashboard/menu-data/levelsData";
import { useDashboardForm } from "@/app/hooks/useDashboardForm";
import { InterlocutorSelector } from "@/components/dashboard/InterlocutorSelector";
import { interfaceColor } from "@/lib/theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface DashboardFormProps {
  isDemo?: boolean;
}

interface DemoData {
  messages?: Array<{
    role: string;
    content: string;
    createdAt?: string;
  }>;
  settings?: {
    nativeLanguage?: string;
    nativeLanguageLabel?: string;
    selectedLanguage?: string;
    selectedLanguageLabel?: string;
    selectedLevel?: string;
    interlocutor?: string;
  };
  [key: string]: unknown;
}

export function DashboardForm({ isDemo = false }: DashboardFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDemoRecovery, setShowDemoRecovery] = useState(false);
  const [recoveredDemoData, setRecoveredDemoData] = useState<DemoData | null>(
    null
  );

  // Demo-specific state
  const [demoIsLoading, setDemoIsLoading] = useState(false);
  const [demoPopoverStates, setDemoPopoverStates] = useState({
    nativeLanguagePopoverOpen: false,
    languagePopoverOpen: false,
    levelPopoverOpen: false,
  });
  const [demoFormState, setDemoFormState] = useState({
    nativeLanguage: nativeLanguageData[0] as PopoverItem | undefined,
    selectedLanguage: languageLearningData[0] as LanguageOption | undefined,
    selectedLevel: levelsData[0] as PopoverItem | undefined,
    interlocutor: undefined as string | undefined,
  });

  // Authenticated dashboard form hook
  const {
    state: { nativeLanguage, selectedLanguage, selectedLevel, interlocutor },
    actions: {
      setNativeLanguage,
      setSelectedLanguage,
      setSelectedLevel,
      setInterlocutor,
      handleStartLearning,
    },
    isFormComplete,
    isLoading,
    popoverStates: {
      nativeLanguagePopoverOpen,
      languagePopoverOpen,
      levelPopoverOpen,
    },
    setPopoverStates: {
      setNativeLanguagePopoverOpen,
      setLanguagePopoverOpen,
      setLevelPopoverOpen,
    },
  } = useDashboardForm();

  // Use demo state or authenticated state based on mode
  const currentState = isDemo
    ? demoFormState
    : { nativeLanguage, selectedLanguage, selectedLevel, interlocutor };
  const currentPopoverStates = isDemo
    ? demoPopoverStates
    : { nativeLanguagePopoverOpen, languagePopoverOpen, levelPopoverOpen };
  const currentIsLoading = isDemo ? demoIsLoading : isLoading;
  const currentIsFormComplete = isDemo
    ? !!(
        demoFormState.nativeLanguage &&
        demoFormState.selectedLanguage &&
        demoFormState.selectedLevel &&
        demoFormState.interlocutor
      )
    : isFormComplete;

  // Check for recovered demo session (only in authenticated mode)
  useEffect(() => {
    if (!isDemo) {
      const recovered = searchParams.get("recovered") === "demo";
      const demoData = localStorage.getItem("recoveredDemoSession");

      if (recovered && demoData) {
        try {
          const parsedData = JSON.parse(demoData);
          setRecoveredDemoData(parsedData);
          setShowDemoRecovery(true);
          toast.success("Your demo conversation is ready to continue!");
        } catch (error) {
          console.error("Failed to parse demo data:", error);
        }
      }
    }
  }, [searchParams, isDemo]);

  const handleContinueDemo = async () => {
    if (recoveredDemoData) {
      try {
        const response = await fetch("/api/chat/demo-recovery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ demoData: recoveredDemoData }),
        });

        if (response.ok) {
          const result = await response.json();
          // Clear the demo data
          localStorage.removeItem("recoveredDemoSession");
          setShowDemoRecovery(false);

          // Redirect to the recovered chat
          router.push(`/chat/${result.chatId}`);
        } else {
          toast.error("Failed to recover demo session");
        }
      } catch (error) {
        console.error("Demo recovery error:", error);
        toast.error("Failed to recover demo session");
      }
    }
  };

  const handleDismissDemo = () => {
    setShowDemoRecovery(false);
    localStorage.removeItem("recoveredDemoSession");
    // Remove the query parameter
    router.replace("/dashboard");
  };

  const handleDemoStartLearning = async () => {
    if (!currentIsFormComplete) return;

    setDemoIsLoading(true);
    try {
      // Create a demo session with the selected settings
      const demoSettings = {
        nativeLanguage: demoFormState.nativeLanguage?.value,
        nativeLanguageLabel: demoFormState.nativeLanguage?.label,
        selectedLanguage: demoFormState.selectedLanguage?.value,
        selectedLanguageLabel: demoFormState.selectedLanguage?.label,
        selectedLevel: demoFormState.selectedLevel?.value,
        interlocutor: demoFormState.interlocutor,
        isDemo: true, // Mark as demo session
      };

      // Store demo settings in sessionStorage for the chat
      sessionStorage.setItem("demoSettings", JSON.stringify(demoSettings));

      // Redirect to demo chat
      router.push("/demo/chat");
    } catch (error) {
      console.error("Failed to start demo:", error);
    } finally {
      setDemoIsLoading(false);
    }
  };

  const finalHandleStartLearning = isDemo
    ? handleDemoStartLearning
    : handleStartLearning;

  return (
    <div className="text-slate-800 min-h-screen flex flex-col items-center justify-center p-4">
      {/* ------------- global CSS, lives ONLY in this component ------------- */}
      <style jsx global>{`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        .fade-in {
          animation: fadeIn 0.2s forwards;
        }
        .delay-1 {
          animation-delay: 0.05s;
        }
        .delay-2 {
          animation-delay: 0.1s;
        }
        .delay-3 {
          animation-delay: 0.15s;
        }
        .delay-4 {
          animation-delay: 0.2s;
        }
      `}</style>

      {/* --------------------------- logo --------------------------- */}
      <header className="flex flex-col items-center mb-3 fade-in">
        <Link href="/" className="hover:opacity-70">
          <Image
            src="/logo.svg"
            alt="Malan Logo"
            className="h-12 w-auto"
            width={120}
            height={48}
          />
        </Link>
      </header>

      {/* Demo Recovery Alert (only in authenticated mode) */}
      {!isDemo && showDemoRecovery && recoveredDemoData && (
        <div className="w-full max-w-md mb-4 fade-in">
          <Card className="glassmorphic border-blue-200 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-800 dark:text-blue-200 text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Continue Your Demo Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 dark:text-blue-300">
              <p className="mb-4">
                Welcome back! Your demo conversation with{" "}
                {recoveredDemoData.settings?.interlocutor}
                in {recoveredDemoData.settings?.selectedLanguageLabel} is ready
                to continue.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleContinueDemo}
                  className="flex-1"
                  style={{ backgroundColor: interfaceColor }}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue Conversation
                </Button>
                <Button variant="outline" onClick={handleDismissDemo}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --------------------------- card --------------------------- */}
      <main className="relative w-full max-w-md fade-in delay-10">
        <div className="glassmorphic bg-white/80 backdrop-blur-xl ring-1 ring-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            {/* title */}
            <h1
              className="text-center text-4xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: interfaceColor }}
            >
              Malan
            </h1>

            {/* ------------------------ selects ------------------------ */}
            <section className="space-y-2 fade-in delay-2">
              <label className="block text-base sm:text-lg font-medium text-slate-600">
                I want to learn...
              </label>
              <div className="popover-menu">
                <CustomPopover<LanguageOption>
                  open={currentPopoverStates.languagePopoverOpen}
                  onOpenChange={(open) => {
                    if (isDemo) {
                      setDemoPopoverStates((prev) => ({
                        ...prev,
                        languagePopoverOpen: open,
                      }));
                    } else {
                      setLanguagePopoverOpen(open);
                    }
                  }}
                  value={currentState.selectedLanguage}
                  onValueChange={(language) => {
                    if (isDemo) {
                      setDemoFormState((prev) => ({
                        ...prev,
                        selectedLanguage: language,
                      }));
                    } else {
                      setSelectedLanguage(language);
                    }
                  }}
                  items={languageLearningData}
                  placeholder="Search language..."
                  buttonTextDefault="Select language..."
                />
              </div>
            </section>

            <section className="space-y-2 fade-in delay-2">
              <label className="block text-base sm:text-lg font-medium text-slate-600">
                My native language is...
              </label>
              <div className="popover-menu">
                <CustomPopover<PopoverItem>
                  open={currentPopoverStates.nativeLanguagePopoverOpen}
                  onOpenChange={(open) => {
                    if (isDemo) {
                      setDemoPopoverStates((prev) => ({
                        ...prev,
                        nativeLanguagePopoverOpen: open,
                      }));
                    } else {
                      setNativeLanguagePopoverOpen(open);
                    }
                  }}
                  value={currentState.nativeLanguage}
                  onValueChange={(language) => {
                    if (isDemo) {
                      setDemoFormState((prev) => ({
                        ...prev,
                        nativeLanguage: language,
                      }));
                    } else {
                      setNativeLanguage(language);
                    }
                  }}
                  items={nativeLanguageData}
                  placeholder="Search language..."
                  buttonTextDefault="Select language..."
                />
              </div>
            </section>

            <section className="space-y-2 fade-in delay-2">
              <label className="block text-base sm:text-lg font-medium text-slate-600">
                I am a...
              </label>
              <div className="popover-menu">
                <CustomPopover<PopoverItem>
                  open={currentPopoverStates.levelPopoverOpen}
                  onOpenChange={(open) => {
                    if (isDemo) {
                      setDemoPopoverStates((prev) => ({
                        ...prev,
                        levelPopoverOpen: open,
                      }));
                    } else {
                      setLevelPopoverOpen(open);
                    }
                  }}
                  value={currentState.selectedLevel}
                  onValueChange={(level) => {
                    if (isDemo) {
                      setDemoFormState((prev) => ({
                        ...prev,
                        selectedLevel: level,
                      }));
                    } else {
                      setSelectedLevel(level);
                    }
                  }}
                  items={levelsData}
                  placeholder="Search level..."
                  buttonTextDefault="Select level..."
                />
              </div>
            </section>

            {/* ---------------------- interlocutor --------------------- */}
            {currentState.selectedLanguage && (
              <section className="space-y-2 fade-in delay-2">
                <InterlocutorSelector
                  selectedLanguage={currentState.selectedLanguage}
                  interlocutor={currentState.interlocutor}
                  onInterlocutorSelect={(interlocutor) => {
                    if (isDemo) {
                      setDemoFormState((prev) => ({ ...prev, interlocutor }));
                    } else {
                      setInterlocutor(interlocutor);
                    }
                  }}
                />
              </section>
            )}

            {/* --------------------- start button ---------------------- */}
            <section className="space-y-2 fade-in delay-4">
              <button
                onClick={finalHandleStartLearning}
                disabled={!currentIsFormComplete || currentIsLoading}
                className={cn(
                  "glassmorphic w-full flex items-center justify-center gap-2 text-lg sm:text-xl font-semibold py-3 rounded-xl shadow-md transition-all duration-300 fade-in delay-4",
                  currentIsFormComplete && !currentIsLoading
                    ? "cursor-pointer hover:bg-[#120b4a] active:bg-slate-500 text-white"
                    : "cursor-not-allowed bg-slate-400 dark:bg-slate-600 text-slate-500 dark:text-slate-300 opacity-80"
                )}
                style={
                  currentIsFormComplete && !currentIsLoading
                    ? { backgroundColor: interfaceColor }
                    : {}
                }
              >
                {currentIsLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    {isDemo ? "Starting Demo…" : "Starting…"}
                  </>
                ) : isDemo ? (
                  "Try Malan"
                ) : (
                  "Start Learning"
                )}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
