// Composable, pluggable tokenizer system
// Define TokenizedWord type locally
export type TokenizedWord = {
  word: string;
  start?: number;
  end?: number;
  language?: string;
  isChinese?: boolean;
  isJapanese?: boolean;
  isThai?: boolean;
  isPunctuation?: boolean;
};

// Tokenizer interface
export interface Tokenizer {
  supports(lang: string): boolean;
  tokenize(text: string, lang: string): Promise<TokenizedWord[]>;
}

// --- Chinese Tokenizer ---
const chineseTokenizer: Tokenizer = {
  supports: (lang) => lang === "zh",
  async tokenize(text, lang) {
    try {
      // console.log("[composable-tokenizer] Chinese input:", text);
      const { tokenizeChineseText } = await import("./chinese-tokenizer");
      const rawTokens = await tokenizeChineseText(text);

      // Add position information to Chinese tokens
      let currentPos = 0;
      const tokens: TokenizedWord[] = [];

      for (const token of rawTokens) {
        const start = text.indexOf(token.word, currentPos);
        if (start >= 0) {
          tokens.push({
            ...token,
            start: start,
            end: start + token.word.length,
          });
          currentPos = start + token.word.length;
        }
      }

      // console.log("[composable-tokenizer] Chinese tokens:", tokens);
      return tokens;
    } catch (e) {
      console.warn("[composable-tokenizer] Chinese fallback triggered:", e);
      // Fallback: character-based split
      const tokens = Array.from(text).map((char, i) => {
        const isPunctuation =
          /^[。，！？：；""''（）【】「」『』…—、；：！？]+$/.test(char);
        return {
          word: char,
          start: i,
          end: i + 1,
          language: lang,
          isChinese: true,
          isPunctuation,
        };
      });
      // console.log("[composable-tokenizer] Chinese fallback tokens:", tokens);
      return tokens;
    }
  },
};

// --- Japanese Tokenizer ---
const japaneseTokenizer: Tokenizer = {
  supports: (lang) => lang === "ja",
  async tokenize(text, lang) {
    try {
      // console.log("[composable-tokenizer] Japanese input:", text);

      // Check if we're on the server side
      if (typeof window === "undefined") {
        // Server-side: use our database tokenizer
        const { databaseTokenize } = await import("./database-tokenizer");
        const dbTokens = await databaseTokenize(text);

        // Convert database tokens to TokenizedWord format, preserving text structure
        const tokens: TokenizedWord[] = [];
        let currentPos = 0;

        for (const token of dbTokens) {
          const start = text.indexOf(token.surface, currentPos);
          if (start >= 0) {
            // Add all tokens (including punctuation) to preserve text structure
            // The ChatMessage component will handle displaying them correctly
            tokens.push({
              word: token.surface,
              start: start,
              end: start + token.surface.length,
              language: lang,
              isJapanese: true,
            });
            currentPos = start + token.surface.length;
          }
        }

        // console.log("[composable-tokenizer] Japanese database tokens:", tokens);
        return tokens;
      } else {
        // Client-side: use API call to server
        const response = await fetch("/api/tokenize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, lang }),
        });

        if (!response.ok) {
          throw new Error(`Tokenization API failed: ${response.statusText}`);
        }

        const data = await response.json();
        // console.log("[composable-tokenizer] Japanese tokens (client):", data.tokens);
        return data.tokens || [];
      }
    } catch (e) {
      console.warn("[composable-tokenizer] Japanese fallback triggered:", e);
      // Fallback: script-based split (works on both client and server)
      const tokens =
        text.match(
          /([\u3040-\u309f]+|[\u30a0-\u30ff]+|[\u4e00-\u9fff]+|[^\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\s]+)/g
        ) || [];
      let pos = 0;
      const result = tokens.map((word) => {
        const start = text.indexOf(word, pos);
        const end = start + word.length;
        pos = end;
        return { word, start, end, language: lang, isJapanese: true };
      });
      // console.log("[composable-tokenizer] Japanese fallback tokens:", result);
      return result;
    }
  },
};

// --- Thai Tokenizer (placeholder) ---
const thaiTokenizer: Tokenizer = {
  supports: (lang) => lang === "th",
  async tokenize(text, lang) {
    // TODO: Replace with a real Thai segmenter
    // Fallback: character-based split
    return Array.from(text).map((char, i) => ({
      word: char,
      start: i,
      end: i + 1,
      language: lang,
      isThai: true,
    }));
  },
};

// --- Tokenizer Registry ---
const registeredTokenizers: Tokenizer[] = [
  chineseTokenizer,
  japaneseTokenizer,
  thaiTokenizer,
  // Add more tokenizers here
];

// --- Main Entry Point ---
/**
 * Tokenize text for a given language code using pluggable tokenizers.
 * Always returns an array of tokens. Falls back to a single token for unsupported languages.
 */
export async function tokenizeText(
  text: string,
  lang: string
): Promise<TokenizedWord[]> {
  for (const tokenizer of registeredTokenizers) {
    if (tokenizer.supports(lang)) {
      try {
        return await tokenizer.tokenize(text, lang);
      } catch (e) {
        // Log error and continue to fallback
        console.error(`[tokenizeText] Error in ${lang} tokenizer:`, e);
      }
    }
  }
  // Default: split on whitespace, remove leading/trailing punctuation
  const tokens: TokenizedWord[] = [];
  let currentPos = 0;
  const wordMatches = text
    .split(/\s+/)
    .filter((word) => word.trim().length > 0);
  const cleanWords = wordMatches
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((word) => word.length > 0);
  cleanWords.forEach((word, index) => {
    // Find the next occurrence of this word after the current position
    let start = text.indexOf(word, currentPos);
    // If we can't find the word, try to find it from the beginning
    if (start === -1) {
      start = text.indexOf(word);
    }
    if (start >= 0) {
      tokens.push({
        word,
        language: lang,
        start: start,
        end: start + word.length,
      });
      currentPos = start + word.length;
    }
  });
  return tokens;
}

// --- For future extensibility ---
// To add a new language, implement a Tokenizer and add it to registeredTokenizers.
