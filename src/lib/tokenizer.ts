import type { ChatSettings } from "@/app/tools/chat-store";

export interface TokenizedWord {
  word: string;
  start?: number;
  end?: number;
}

/**
 * Simple tokenization function that splits text into words
 * Uses chat settings to determine language-specific rules
 */
export async function tokenizeText(text: string, settings: ChatSettings): Promise<TokenizedWord[]> {
  if (!text || typeof text !== "string") {
    return [];
  }

  const selectedLanguage = settings.selectedLanguage || "en";
  
  // For now, use simple word splitting
  // This can be enhanced with language-specific tokenizers later
  const words = text.split(/\s+/);
  const tokens: TokenizedWord[] = [];
  let currentIndex = 0;

  for (const word of words) {
    if (word.trim()) {
      const start = text.indexOf(word, currentIndex);
      const end = start + word.length;
      
      tokens.push({
        word: word.trim(),
        start,
        end
      });
      
      currentIndex = end;
    }
  }

  return tokens;
}

/**
 * Simple synchronous tokenization for immediate use
 */
export function tokenizeTextSync(text: string, settings: ChatSettings): TokenizedWord[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const selectedLanguage = settings.selectedLanguage || "en";
  
  const words = text.split(/\s+/);
  const tokens: TokenizedWord[] = [];
  let currentIndex = 0;

  for (const word of words) {
    if (word.trim()) {
      const start = text.indexOf(word, currentIndex);
      const end = start + word.length;
      
      tokens.push({
        word: word.trim(),
        start,
        end
      });
      
      currentIndex = end;
    }
  }

  return tokens;
}
