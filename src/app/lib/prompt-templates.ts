import { type ChatSettings } from "@/app/tools/chat-store";

;

export function formatSystemPrompt(settings: ChatSettings): string {
    const basePromptTemplate = process.env.BASE_PROMPT_TEMPLATE;

  if (!basePromptTemplate) {
    throw new Error("BASE_PROMPT_TEMPLATE is not set in the environment variables.");
  }

  let systemPrompt = basePromptTemplate;
  const placeholders = {
    interlocutor: settings.interlocutor || "a helpful tutor",
    selectedLanguage: settings.selectedLanguage || "the target language",
    userName: settings.name || "the student",
    nativeLanguage: settings.nativeLanguage || "their native language",
    selectedLevel: settings.selectedLevel || "their current level",
  };

  for (const [key, value] of Object.entries(placeholders)) {
    systemPrompt = systemPrompt.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return systemPrompt;
}
