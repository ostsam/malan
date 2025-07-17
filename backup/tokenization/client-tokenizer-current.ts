import { TokenizedWord } from "./tokenizer";

// Client-side tokenizer that handles non-Japanese languages locally
export async function tokenizeTextClient(
  text: string,
  lang: string
): Promise<TokenizedWord[]> {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Handle Japanese via API
  if (lang === "ja") {
    try {
      const response = await fetch("/api/tokenize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, lang }),
      });

      if (!response.ok) {
        throw new Error(`Tokenization failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error("[client-tokenizer] Error calling Japanese API:", error);
      return fallbackJapaneseTokenization(text);
    }
  }

  // Handle other languages locally using the original tokenizer
  return tokenizeTextLocal(text, lang);
}

// Local tokenization for non-Japanese languages
async function tokenizeTextLocal(
  text: string,
  lang: string
): Promise<TokenizedWord[]> {
  // For Chinese, use jieba-wasm for word segmentation
  if (lang === "zh") {
    console.log(
      "[client-tokenizer] Tokenizing Chinese text with jieba-wasm:",
      text
    );
    console.log("[client-tokenizer] Language code:", lang);
    console.log(
      "[client-tokenizer] Text contains Chinese:",
      /[\u4e00-\u9fff]/.test(text)
    );

    try {
      console.log("[client-tokenizer] Importing chinese-tokenizer...");
      const { tokenizeChineseText } = await import("./chinese-tokenizer");
      console.log(
        "[client-tokenizer] Successfully imported tokenizeChineseText"
      );

      console.log("[client-tokenizer] Calling tokenizeChineseText...");
      const tokens = await tokenizeChineseText(text);
      console.log("[client-tokenizer] jieba-wasm tokens:", tokens);

      const result = tokens.map((t) => ({
        ...t,
        language: "zh",
        isChinese: true,
      }));

      console.log("[client-tokenizer] Chinese tokenization result:", result);
      return result;
    } catch (error) {
      console.error(
        "[client-tokenizer] jieba-wasm failed, using fallback:",
        error
      );
      console.error("[client-tokenizer] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fallback to character-based segmentation
      return fallbackChineseTokenization(text);
    }
  }

  // For other languages, use simple word splitting with proper position tracking
  const wordMatches = text.split(/\s+/).filter(word => word.trim().length > 0);
  // Clean up punctuation from the beginning and end of words
  const cleanWords = wordMatches.map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(word => word.length > 0);
  const result: TokenizedWord[] = [];
  let currentPos = 0;
  
  console.log("[client-tokenizer] Processing words:", {
    text: text.substring(0, 100),
    wordCount: cleanWords.length,
    words: cleanWords.slice(0, 10), // Show first 10 words
  });
  
  cleanWords.forEach((word, index) => {
    // Find the next occurrence of this word after the current position
    let start = text.indexOf(word, currentPos);
    
    // If we can't find the word, try to find it from the beginning
    if (start === -1) {
      start = text.indexOf(word);
    }
    
    if (start >= 0) {
      const token = {
        word,
        language: lang,
        start: start,
        end: start + word.length,
      };
      result.push(token);
      currentPos = start + word.length;
      
      console.log(`[client-tokenizer] Token ${index}:`, {
        word: word,
        start: start,
        end: start + word.length,
        currentPos: currentPos,
      });
    } else {
      console.warn(`[client-tokenizer] Could not find word "${word}" after position ${currentPos}`);
    }
  });
  
  return result;
}

// Better Chinese fallback that splits by characters
function fallbackChineseTokenization(text: string): TokenizedWord[] {
  console.log("[fallbackChineseTokenization] Input text:", text);

  // Split text into Chinese characters and other content
  const tokens = text.match(/[\u4e00-\u9fff]+|[^\u4e00-\u9fff\s]+|\s+/g) || [];
  console.log("[fallbackChineseTokenization] Initial tokens:", tokens);

  const result: TokenizedWord[] = [];
  let currentPos = 0;

  tokens.forEach((token, index) => {
    console.log(
      `[fallbackChineseTokenization] Processing token ${index}:`,
      token
    );
    const start = text.indexOf(token, currentPos);
    if (start >= 0 && token.trim().length > 0) {
      // Check if this token contains Chinese characters
      const hasChinese = /[\u4e00-\u9fff]/.test(token);
      console.log(
        `[fallbackChineseTokenization] Token has Chinese:`,
        hasChinese
      );

      if (hasChinese) {
        // Split Chinese characters individually
        const chars = token.match(/[\u4e00-\u9fff]/g) || [];
        console.log(`[fallbackChineseTokenization] Chinese chars:`, chars);
        chars.forEach((char) => {
          const charStart = text.indexOf(char, start);
          if (charStart >= 0) {
            result.push({
              word: char,
              language: "zh",
              isChinese: true,
              start: charStart,
              end: charStart + char.length,
            });
          }
        });
      } else {
        // Non-Chinese content (punctuation, spaces, etc.)
        result.push({
          word: token,
          language: "zh",
          isChinese: false,
          start: start,
          end: start + token.length,
        });
      }
      currentPos = start + token.length;
    }
  });

  console.log("[fallbackChineseTokenization] Final result:", result);
  return result;
}

// Simple fallback for Japanese when API fails
function fallbackJapaneseTokenization(text: string): TokenizedWord[] {
  // Split by script type (hiragana, katakana, kanji, other)
  const tokens =
    text.match(
      /[\u3040-\u309f]+|[\u30a0-\u30ff]+|[\u4e00-\u9fff]+|[^\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\s]+/g
    ) || [];

  const result: TokenizedWord[] = [];
  let currentPos = 0;

  tokens.forEach((token) => {
    const start = text.indexOf(token, currentPos);
    if (start >= 0) {
      result.push({
        word: token.trim(),
        language: "ja",
        isJapanese: true,
        start: start,
        end: start + token.length,
      });
      currentPos = start + token.length;
    }
  });

  return result;
}
