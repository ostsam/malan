import { useMemo } from "react";
import { languageLearningData } from "@/app/dashboard/menu-data/languageLearningData";

interface UseRTLProps {
  selectedLanguage?: string | null;
  nativeLanguage?: string | null;
}

interface RTLStyles {
  direction: "rtl" | "ltr";
  textAlign: "right" | "left" | "center";
}

// Consolidated RTL language codes - moved from duplicated components
const rtlLanguageCodes = [
  "ar", // Arabic
  "he", // Hebrew
  "iw", // Hebrew (old code)
  "fa", // Persian/Farsi
  "ur", // Urdu
  "ps", // Pashto
  "syr", // Syriac
  "dv", // Divehi/Maldivian
];

/**
 * Check if a language code represents an RTL language
 * @param code - Language code to check
 * @returns boolean indicating if the language is RTL
 */
export function isRTLLanguage(code?: string | null): boolean {
  if (!code) return false;
  return rtlLanguageCodes.some((rtl) => code.startsWith(rtl));
}

export function useRTL({ selectedLanguage, nativeLanguage }: UseRTLProps) {
  const isRTL = useMemo(() => {
    const foundLanguage = languageLearningData.find(
      (lang) => lang.value === selectedLanguage || lang.value === nativeLanguage
    );
    // Fallback: explicitly check for Hebrew and Arabic language codes
    const explicitRTL =
      selectedLanguage === "he" ||
      selectedLanguage === "ar" ||
      selectedLanguage === "fa" ||
      selectedLanguage === "ur";
    return foundLanguage?.rtl || explicitRTL;
  }, [selectedLanguage, nativeLanguage]);

  const languageCode = useMemo(() => {
    return selectedLanguage || nativeLanguage || undefined;
  }, [selectedLanguage, nativeLanguage]);

  const rtlStyles: RTLStyles = useMemo(
    () => ({
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
    }),
    [isRTL]
  );

  const centerRTLStyles: RTLStyles = useMemo(
    () => ({
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "center",
    }),
    [isRTL]
  );

  return {
    isRTL,
    languageCode,
    rtlStyles,
    centerRTLStyles,
    // Export the utility function for components that need it
    isRTLLanguage,
  };
}
