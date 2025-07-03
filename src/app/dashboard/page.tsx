"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomPopover } from "./menu-components/CustomPopover";
import type { PopoverItem } from "./menu-components/CustomPopover";
import { nativeLanguageData } from "./menu-data/nativeLanguageData";
import {
  languageLearningData,
  type LanguageOption,
} from "./menu-data/languageLearningData";
import { levelsData } from "./menu-data/levelsData";
import { Loader2 } from "lucide-react";
import { createChat } from "@/app/actions/chat";

export default function Menu() {
  /* ----------------------- state + handlers (unchanged) -------------------- */
  const [nativeLanguage, setNativeLanguage] = useState<PopoverItem | undefined>(
    nativeLanguageData[0]
  );
  const [selectedLanguage, setSelectedLanguage] = useState<
    LanguageOption | undefined
  >(languageLearningData[0]);
  const [selectedLevel, setSelectedLevel] = useState<PopoverItem | undefined>(
    levelsData[0]
  );
  const [nativeLanguagePopoverOpen, setNativeLanguagePopoverOpen] =
    useState(false);
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);
  const [levelPopoverOpen, setLevelPopoverOpen] = useState(false);
  const [interlocutor, setInterlocutor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isFormComplete =
    !!nativeLanguage && !!selectedLanguage && !!selectedLevel && !!interlocutor;

  const handleStartLearning = async () => {
    if (!isFormComplete || isLoading) return;
    setIsLoading(true);
    try {
      const chatId = await createChat({
        nativeLanguage: nativeLanguage?.value ?? null,
        nativeLanguageLabel: nativeLanguage?.label ?? null,
        selectedLanguage: selectedLanguage?.value ?? null,
        selectedLanguageLabel: selectedLanguage?.label ?? null,
        selectedLevel: selectedLevel?.value ?? null,
        interlocutor: interlocutor ?? null,
      });
      router.push(`/chat/${chatId}`);
    } catch (err) {
      console.error("Failed to create chat:", err);
      setIsLoading(false);
    }
  };

  /* ------------------------------ markup ---------------------------------- */
  return (
    <div
      className="text-slate-800 min-h-screen flex flex-col items-center justify-center p-4"

    >
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
        <a href="/" className="hover:opacity-70">
          <img src="/logo.svg" alt="Malan Logo" className="h-16 w-auto" />
        </a>
      </header>

      {/* --------------------------- card --------------------------- */}
      <main className="relative w-full max-w-md fade-in delay-10">
        <div className="bg-white/80 backdrop-blur-xl ring-1 ring-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            {/* title */}
            <h1
              className="text-center text-4xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#0d8bff" }}
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
                  open={languagePopoverOpen}
                  onOpenChange={setLanguagePopoverOpen}
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
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
                  open={nativeLanguagePopoverOpen}
                  onOpenChange={setNativeLanguagePopoverOpen}
                  value={nativeLanguage}
                  onValueChange={setNativeLanguage}
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
                  open={levelPopoverOpen}
                  onOpenChange={setLevelPopoverOpen}
                  value={selectedLevel}
                  onValueChange={setSelectedLevel}
                  items={levelsData}
                  placeholder="Search level..."
                  buttonTextDefault="Select level..."
                />
              </div>
            </section>

            {/* ---------------------- interlocutor --------------------- */}
            <section className="p-3 rounded-xl bg-white border border-slate-200 space-y-4 fade-in delay-3">
              <h2
                className="text-center text-base sm:text-lg font-medium"
                style={{ color: "#0d8bff" }}
              >
                Your Interlocutor
              </h2>
              {selectedLanguage && (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {Object.entries(selectedLanguage.interlocutors ?? {}).map(
                    ([gender, name]) => (
                      <button
                        key={gender}
                        aria-pressed={interlocutor === name}
                        onClick={() => setInterlocutor(name)}
                        className={cn(
                          "group relative focus:outline-none focus-visible:ring-2 rounded-lg border transition-all cursor-pointer",
                          interlocutor === name
                            ? "border-[#0d8bff] bg-[rgba(13,139,255,0.08)] shadow-sm"
                            : "border-slate-200 bg-white"
                        )}
                        style={{ minWidth: 90 }}
                      >
                        <span className="relative flex flex-col items-center px-4 py-2 rounded-lg">
                          <span className="text-xs sm:text-sm text-slate-500 capitalize">
                            {gender}
                          </span>
                          <span
                            className="text-lg sm:text-xl font-semibold"
                            style={{ color: "#0d8bff" }}
                          >
                            {name}
                          </span>
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </section>

            <hr className="border-t border-slate-200 fade-in delay-3" />

            {/* --------------------- start button ---------------------- */}
            <button
              onClick={handleStartLearning}
              disabled={!isFormComplete || isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 text-lg sm:text-xl font-semibold text-white py-3 rounded-xl shadow-md transition-colors fade-in delay-4 cursor-pointer active:bg-slate-500 active:text-white",
                isFormComplete && !isLoading
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-60"
              )}
              style={{ background: "#0d8bff" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#0972d4")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#0d8bff")}
              onMouseDown={(e) =>
                (e.currentTarget.style.background = "#64748b")
              }
              onMouseUp={(e) => (e.currentTarget.style.background = "#0972d4")}
            >
              {isLoading ? (
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
                  Starting…
                </>
              ) : (
                "Start Learning"
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
