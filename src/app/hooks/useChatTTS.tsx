import { languageLearningData } from "@/app/dashboard/menu-data/languageLearningData";

export function useChatTTS(settings: any) {
  const selectedLanguageData = languageLearningData.find(
    (lang) => lang.value === settings.selectedLanguage
  );

  let ttsVoice: "nova" | "ash" = "nova";
  if (selectedLanguageData && settings.interlocutor) {
    if (settings.interlocutor === selectedLanguageData.interlocutors.male) {
      ttsVoice = "ash";
    } else if (
      settings.interlocutor === selectedLanguageData.interlocutors.female
    ) {
      ttsVoice = "nova";
    }
  }

  return { ttsVoice };
}
