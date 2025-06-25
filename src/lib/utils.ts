import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  languageLearningData,
  LanguageOption,
} from "@/app/dashboard/menu-data/languageLearningData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLanguageInfo(
  langCode: string | null | undefined
): LanguageOption | undefined {
  if (!langCode) return undefined;
  return languageLearningData.find((lang) => lang.value === langCode);
}

import { nativeLanguageData } from "@/app/dashboard/menu-data/nativeLanguageData";

export function getNativeLanguageLabel(
  langCode: string | null | undefined
): string | undefined {
  if (!langCode) return undefined;
  return nativeLanguageData.find((lang) => lang.value === langCode)?.label;
}
