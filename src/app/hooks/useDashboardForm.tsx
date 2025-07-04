import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createChat } from "@/app/actions/chat";
import { nativeLanguageData } from "@/app/dashboard/menu-data/nativeLanguageData";
import {
  languageLearningData,
  type LanguageOption,
} from "@/app/dashboard/menu-data/languageLearningData";
import { levelsData } from "@/app/dashboard/menu-data/levelsData";
import type { PopoverItem } from "@/app/dashboard/menu-components/CustomPopover";

interface DashboardFormState {
  nativeLanguage: PopoverItem | undefined;
  selectedLanguage: LanguageOption | undefined;
  selectedLevel: PopoverItem | undefined;
  interlocutor: string | undefined;
}

interface DashboardFormActions {
  setNativeLanguage: (language: PopoverItem | undefined) => void;
  setSelectedLanguage: (language: LanguageOption | undefined) => void;
  setSelectedLevel: (level: PopoverItem | undefined) => void;
  setInterlocutor: (interlocutor: string | undefined) => void;
  handleStartLearning: () => Promise<void>;
}

export function useDashboardForm(): {
  state: DashboardFormState;
  actions: DashboardFormActions;
  isFormComplete: boolean;
  isLoading: boolean;
  popoverStates: {
    nativeLanguagePopoverOpen: boolean;
    languagePopoverOpen: boolean;
    levelPopoverOpen: boolean;
  };
  setPopoverStates: {
    setNativeLanguagePopoverOpen: (open: boolean) => void;
    setLanguagePopoverOpen: (open: boolean) => void;
    setLevelPopoverOpen: (open: boolean) => void;
  };
} {
  const router = useRouter();

  // Form state
  const [nativeLanguage, setNativeLanguage] = useState<PopoverItem | undefined>(
    nativeLanguageData[0]
  );
  const [selectedLanguage, setSelectedLanguage] = useState<
    LanguageOption | undefined
  >(languageLearningData[0]);
  const [selectedLevel, setSelectedLevel] = useState<PopoverItem | undefined>(
    levelsData[0]
  );
  const [interlocutor, setInterlocutor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Popover states
  const [nativeLanguagePopoverOpen, setNativeLanguagePopoverOpen] =
    useState(false);
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);
  const [levelPopoverOpen, setLevelPopoverOpen] = useState(false);

  // Computed values
  const isFormComplete =
    !!nativeLanguage && !!selectedLanguage && !!selectedLevel && !!interlocutor;

  // Actions
  const handleStartLearning = useCallback(async () => {
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
  }, [
    isFormComplete,
    isLoading,
    nativeLanguage,
    selectedLanguage,
    selectedLevel,
    interlocutor,
    router,
  ]);

  return {
    state: {
      nativeLanguage,
      selectedLanguage,
      selectedLevel,
      interlocutor,
    },
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
  };
}
