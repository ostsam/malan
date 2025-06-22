"use client";

import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomPopover } from "./menu-components/CustomPopover";
import type { PopoverItem } from "./menu-components/CustomPopover";
import { nativeLanguageData } from "./menu-data/nativeLanguageData";
import {
  languageLearningData,
  type LanguageOption,
} from "./menu-data/languageLearningData";
import { levelsData } from "./menu-data/levelsData";
export default function Menu() {
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
  const [interlocutor, setInterlocutor] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStartLearning = () => {
    if (!isFormComplete || isLoading) return;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (nativeLanguage?.label)
      params.append("nativeLanguage", nativeLanguage.label);
    if (nativeLanguage?.value)
      params.append("nativeLanguageValue", nativeLanguage.value);
    if (selectedLanguage?.value)
      params.append("selectedLanguage", selectedLanguage.value);
    if (selectedLanguage?.label)
      params.append("selectedLanguageLabel", selectedLanguage.label);
    if (selectedLevel?.value)
      params.append("selectedLevel", selectedLevel.value);
    if (interlocutor) params.append("interlocutor", interlocutor);
    ///add name/username!

    router.push(`/api/chat?${params.toString()}`);
  };

  const isFormComplete =
    !!nativeLanguage && !!selectedLanguage && !!selectedLevel && !!interlocutor;

  return (
    <>
      <div className="flex flex-col align-center justify-center">
        <div className="flex-grow flex flex-col items-center justify-center">
          <a href="/">
            <img
              src="/logo.svg"
              alt="Malan Logo"
              className="h-16 w-auto mb-1"
            />
          </a>
          <div className="bg-slate-500 sm:p-6 font-sans rounded-3xl w-full max-w-lg shadow-xl">
            <div className="bg-white p-6 sm:p-8 rounded-xl w-full text-slate-700 space-y-6">
              <h1 className="text-4xl sm:text-5xl font-bold text-center text-sky-600 tracking-tight">
                Malan
              </h1>
              <div>
                <label className="block text-sm sm:text-base font-medium mb-2 text-slate-600">
                  I want to learn...
                </label>
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
              <div>
                <label className="block text-sm sm:text-base font-medium mb-2 text-slate-600">
                  My native language is...
                </label>
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

              <div>
                <label className="block text-sm sm:text-base font-medium mb-2 text-slate-600">
                  I am a...
                </label>
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

              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <h2 className="text-base sm:text-lg font-medium mb-3 text-center text-sky-700">
                  Your Interlocutor:
                </h2>
                {selectedLanguage && (
                  <div className="flex justify-around text-center">
                    {selectedLanguage &&
                      selectedLanguage.interlocutors &&
                      Object.entries(selectedLanguage.interlocutors).map(
                        ([gender, name]) => (
                          <div key={gender}>
                            <p className="text-xs sm:text-sm text-slate-500 capitalize">
                              {gender}:
                            </p>
                            <p className="text-lg sm:text-xl font-semibold text-sky-600">
                              <Button
                                onClick={() => setInterlocutor(name)}
                                className={cn(
                                  "cursor-pointer !bg-white !text-sky-600 border border-sky-200",
                                  interlocutor === name &&
                                    "!bg-sky-500 !text-white"
                                )}
                              >
                                {name}
                              </Button>
                            </p>
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>
              <button
                onClick={handleStartLearning}
                disabled={!isFormComplete || isLoading}
                className={cn(
                  "w-full flex items-center justify-center text-white p-3 sm:p-4 rounded-lg text-base sm:text-lg font-semibold transition-colors duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75",
                  isFormComplete && !isLoading
                    ? "bg-sky-500 hover:animate-pulse cursor-pointer"
                    : "bg-slate-400 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Learning"
                )}
              </button>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await authClient.signOut();
                window.location.href = '/';
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
            className="mt-4 w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
