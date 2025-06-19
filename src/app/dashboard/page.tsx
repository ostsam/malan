"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomPopover } from "./menu-components/CustomPopover";
import type { PopoverItem } from "./menu-components/CustomPopover";
import { nativeLanguageData } from "./menu-data/nativeLanguageData";
import { languageLearningData } from "./menu-data/languageLearningData";
import type { LanguageOption } from "./menu-data/languageLearningData";
import { levelsData } from "./menu-data/levelsData";
import Logout from "@/components/logout";

export default function Menu() {
  const [nativeLanguage, setNativeLanguage] = useState<PopoverItem | undefined>(
    nativeLanguageData[13]
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
  const [interlocutor, setInterlocutor] = useState<string>("");
  const router = useRouter();

  const handleStartLearning = () => {
    const params = new URLSearchParams();
    if (nativeLanguage?.label) params.append("nativeLanguage", nativeLanguage.label);
    if (nativeLanguage?.value) params.append("nativeLanguageValue", nativeLanguage.value);
    if (selectedLanguage?.label) params.append("selectedLanguage", selectedLanguage.label);
    if (selectedLanguage?.value) params.append("selectedLanguageValue",selectedLanguage.value)
    if (selectedLevel?.value) params.append("selectedLevel", selectedLevel.value);
    if (interlocutor) params.append("interlocutor", interlocutor);
    ///add name/username!

    router.push(`/api/chat?${params.toString()}`);
  };

  const isFormComplete =
    !!nativeLanguage && !!selectedLanguage && !!selectedLevel && !!interlocutor;

  return (
    <div className=" flex flex-col items-center justify-center h-dvh">
      <div className="bg-slate-500 sm:p-6 font-sans rounded-3xl min-w-120 shadow-xl">
      <div className="bg-white p-6 sm:p-8 rounded-xl w-full max-w-lg text-slate-700 space-y-6 min-w-120">
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
                            "!bg-white !text-sky-600 border border-sky-200",
                            interlocutor === name && "!bg-sky-500 !text-white"
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
          disabled={!isFormComplete}
          className={cn(
            "w-full text-white p-3 sm:p-4 rounded-lg text-base sm:text-lg font-semibold transition-colors duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75",
            isFormComplete
              ? "bg-sky-500 hover:animate-pulse"
              : "bg-slate-400 cursor-not-allowed"
          )}
        >
          Start Learning
        </button>
      </div>
    </div>
    <Logout />
    </div>
    
  );
}
