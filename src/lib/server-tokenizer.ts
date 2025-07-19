// DEPRECATED: Use composable-tokenizer.ts instead for all entry points. This file is still used internally for Japanese tokenization.
// Do not import this file directly from UI or hooks.

// Define TokenizedWord type locally to avoid circular imports
export type TokenizedWord = {
  word: string;
  start?: number;
  end?: number;
  language?: string;
  isChinese?: boolean;
  isJapanese?: boolean;
  isThai?: boolean;
};

// Kuromoji token type (from kuromoji package)
interface KuromojiToken {
  word_id: number;
  word_type: "KNOWN" | "UNKNOWN";
  word_position: number;
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
  pos_detail_3: string;
  conjugated_type: string;
  conjugated_form: string;
  basic_form: string;
  reading: string;
  pronunciation: string;
}

// Helper function to segment text by script type
function segmentTextByScript(text: string): Array<{
  segment: string;
  start: number;
  end: number;
  type: "japanese" | "latin" | "other";
}> {
  const segments: Array<{
    segment: string;
    start: number;
    end: number;
    type: "japanese" | "latin" | "other";
  }> = [];
  let currentSegment = "";
  let currentType: "japanese" | "latin" | "other" | null = null;
  let segmentStart = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let charType: "japanese" | "latin" | "other";

    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(char)) {
      charType = "japanese";
    } else if (/[a-zA-Z]/.test(char)) {
      charType = "latin";
    } else {
      charType = "other";
    }

    if (currentType === null) {
      // Start new segment
      currentType = charType;
      currentSegment = char;
      segmentStart = i;
    } else if (
      currentType === charType ||
      (currentType === "other" &&
        charType !== "japanese" &&
        charType !== "latin")
    ) {
      // Continue current segment
      currentSegment += char;
    } else {
      // End current segment and start new one
      if (currentSegment.trim()) {
        segments.push({
          segment: currentSegment,
          start: segmentStart,
          end: segmentStart + currentSegment.length,
          type: currentType,
        });
      }
      currentType = charType;
      currentSegment = char;
      segmentStart = i;
    }
  }

  // Add final segment
  if (currentSegment.trim() && currentType) {
    segments.push({
      segment: currentSegment,
      start: segmentStart,
      end: segmentStart + currentSegment.length,
      type: currentType,
    });
  }

  return segments;
}

// Check if text contains kanji
function containsKanji(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

// Check if a token should be included (filter out punctuation and single characters)
function shouldIncludeToken(token: string): boolean {
  if (!token || token.length === 0) return false;

  // Filter out punctuation and symbols
  if (/^[^\p{L}\p{N}]+$/u.test(token)) return false;

  // Filter out single characters unless they're particles or important
  if (token.length === 1) {
    // Allow important single characters
    const importantSingles = [
      "は",
      "が",
      "を",
      "に",
      "へ",
      "で",
      "の",
      "と",
      "や",
      "か",
      "ね",
      "よ",
      "わ",
      "さ",
    ];
    return importantSingles.includes(token);
  }

  return true;
}

// Post-process kuromojin tokens to improve quality
function postProcessTokens(
  tokens: KuromojiToken[],
  offset: number = 0
): TokenizedWord[] {
  const result: TokenizedWord[] = [];

  for (const token of tokens) {
    const word = token.surface_form;

    // Skip tokens that shouldn't be included
    if (!shouldIncludeToken(word)) {
      continue;
    }

    result.push({
      word: word,
      language: "ja",
      reading: token.reading || undefined,
      isJapanese: true,
      start: token.word_position - 1 + offset,
      end: token.word_position - 1 + offset + word.length,
    });
  }

  return result;
}

// Intelligent chunking for long hiragana/katakana strings (improved)
function chunkKanaText(text: string, offset: number = 0): TokenizedWord[] {
  const tokens: TokenizedWord[] = [];

  // Common Japanese particles and endings that should be separated
  const particles = [
    "は",
    "が",
    "を",
    "に",
    "へ",
    "で",
    "から",
    "まで",
    "より",
    "の",
    "と",
    "や",
    "か",
    "ね",
    "よ",
    "わ",
    "さ",
    "です",
    "ます",
    "でした",
    "ました",
    "でしょう",
    "ましょう",
    "だ",
    "です",
    "である",
    "だろ",
    "だろう",
    "て",
    "で",
    "た",
    "だ",
    "ない",
    "ぬ",
    "ん",
    "れる",
    "られる",
    "せる",
    "させる",
    "しめる",
  ];

  // Common word endings
  const endings = [
    "する",
    "できる",
    "れる",
    "られる",
    "せる",
    "させる",
    "しめる",
    "たい",
    "らしい",
    "そう",
    "よう",
    "みたい",
  ];

  // Common Japanese words and phrases (to avoid breaking them up)
  const commonWords = [
    "はじめまして",
    "よろしく",
    "おはよう",
    "こんにちは",
    "こんばんは",
    "おやすみ",
    "ありがとう",
    "すみません",
    "おげんき",
    "げんき",
    "わたし",
    "あなた",
    "かれ",
    "かのじょ",
    "みんな",
    "だれ",
    "なに",
    "いつ",
    "どこ",
    "どうして",
    "なぜ",
    "どの",
    "どれ",
    "いくつ",
    "なん",
    "いくら",
    "どのくらい",
    "どれくらい",
  ];

  // Split by particles and endings first
  let remainingText = text;
  let textOffset = offset;

  while (remainingText.length > 0) {
    let found = false;

    // Try to find common words first
    for (const word of commonWords) {
      if (remainingText.startsWith(word)) {
        tokens.push({
          word: word,
          language: "ja",
          isJapanese: true,
          start: textOffset,
          end: textOffset + word.length,
        });
        remainingText = remainingText.slice(word.length);
        textOffset += word.length;
        found = true;
        break;
      }
    }

    if (found) continue;

    // Try to find particles at the beginning
    for (const particle of particles) {
      if (remainingText.startsWith(particle)) {
        tokens.push({
          word: particle,
          language: "ja",
          isJapanese: true,
          start: textOffset,
          end: textOffset + particle.length,
        });
        remainingText = remainingText.slice(particle.length);
        textOffset += particle.length;
        found = true;
        break;
      }
    }

    if (found) continue;

    // Try to find endings at the end
    for (const ending of endings) {
      if (
        remainingText.endsWith(ending) &&
        remainingText.length > ending.length
      ) {
        // Split before the ending
        const beforeEnding = remainingText.slice(0, -ending.length);
        if (beforeEnding.length > 0) {
          tokens.push({
            word: beforeEnding,
            language: "ja",
            isJapanese: true,
            start: textOffset,
            end: textOffset + beforeEnding.length,
          });
          textOffset += beforeEnding.length;
        }
        tokens.push({
          word: ending,
          language: "ja",
          isJapanese: true,
          start: textOffset,
          end: textOffset + ending.length,
        });
        textOffset += ending.length;
        remainingText = "";
        found = true;
        break;
      }
    }

    if (found) continue;

    // If no particles or endings found, chunk by reasonable lengths
    // Try to find natural break points (3-6 characters for hiragana, 2-4 for katakana)
    let chunkSize = 4; // Default chunk size

    // Adjust chunk size based on script type
    if (/^[\u3040-\u309f]+$/.test(remainingText)) {
      // Pure hiragana - use longer chunks
      chunkSize = Math.min(6, remainingText.length);
    } else if (/^[\u30a0-\u30ff]+$/.test(remainingText)) {
      // Pure katakana - use shorter chunks
      chunkSize = Math.min(4, remainingText.length);
    } else {
      // Mixed kana - use medium chunks
      chunkSize = Math.min(5, remainingText.length);
    }

    // Try to find a better break point within the chunk
    let actualChunkSize = chunkSize;
    for (let i = chunkSize - 1; i >= Math.max(2, chunkSize - 2); i--) {
      // Look for natural break points (avoid breaking in the middle of common patterns)
      const candidate = remainingText.slice(0, i);
      if (candidate.length >= 2) {
        actualChunkSize = i;
        break;
      }
    }

    const chunk = remainingText.slice(0, actualChunkSize);

    // Only include chunks that are meaningful
    if (shouldIncludeToken(chunk)) {
      tokens.push({
        word: chunk,
        language: "ja",
        isJapanese: true,
        start: textOffset,
        end: textOffset + chunk.length,
      });
    }

    remainingText = remainingText.slice(actualChunkSize);
    textOffset += chunk.length;
  }

  return tokens;
}

// Server-side tokenizer for Japanese only
export async function tokenizeJapaneseServer(
  text: string
): Promise<TokenizedWord[]> {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Segment text by script type first
  const segments = segmentTextByScript(text);
  console.log("[server-tokenizer] Segmented text:", segments);
  const allTokens: TokenizedWord[] = [];

  for (const segment of segments) {
    if (segment.type === "japanese") {
      // Always try kuromojin first for Japanese text
      let japaneseTokens: TokenizedWord[];

      try {
        japaneseTokens = await tokenizeJapaneseSegment(
          segment.segment,
          segment.start
        );

        // If kuromojin produced reasonable results, use them
        if (
          japaneseTokens.length > 0 &&
          japaneseTokens.length <= segment.segment.length * 0.6
        ) {
          console.log(
            "[server-tokenizer] Using kuromojin results:",
            japaneseTokens.length,
            "tokens"
          );
        } else {
          // Kuromojin produced too many small tokens, try to improve them
          console.log(
            "[server-tokenizer] Kuromojin produced too many tokens, trying to improve"
          );
          japaneseTokens = postProcessTokens(
            await tokenizeJapaneseSegmentRaw(segment.segment),
            segment.start
          );

          // If still too many tokens, use intelligent chunking
          if (japaneseTokens.length > segment.segment.length * 0.5) {
            console.log(
              "[server-tokenizer] Using intelligent chunking for long kana text:",
              segment.segment
            );
            japaneseTokens = chunkKanaText(segment.segment, segment.start);
          }
        }
      } catch (error) {
        console.log(
          "[server-tokenizer] Kuromojin failed, using chunking fallback"
        );
        japaneseTokens = chunkKanaText(segment.segment, segment.start);
      }

      allTokens.push(...japaneseTokens);
    } else if (segment.type === "latin") {
      // Split Latin text by word boundaries
      const words = segment.segment.split(/\s+/).filter((word) => word.trim());
      let wordStart = segment.start;
      for (const word of words) {
        const wordIndex = text.indexOf(word, wordStart);
        if (wordIndex >= 0) {
          allTokens.push({
            word: word,
            language: "unknown", // Mark as unknown since it's not Japanese
            isJapanese: false,
            start: wordIndex,
            end: wordIndex + word.length,
          });
          wordStart = wordIndex + word.length;
        }
      }
    } else {
      // Handle other characters (punctuation, spaces, etc.)
      const trimmedSegment = segment.segment.trim();
      if (trimmedSegment && shouldIncludeToken(trimmedSegment)) {
        allTokens.push({
          word: trimmedSegment,
          language: "unknown",
          isJapanese: false,
          start: segment.start,
          end: segment.end,
        });
      }
    }
  }

  return allTokens;
}

// Helper function to tokenize Japanese segments with kuromojin
async function tokenizeJapaneseSegment(
  text: string,
  offset: number = 0
): Promise<TokenizedWord[]> {
  try {
    console.log("[server-tokenizer] Tokenizing Japanese segment:", text);
    const tokens = await tokenizeJapaneseSegmentRaw(text);
    console.log("[server-tokenizer] Kuromojin tokens:", tokens);

    return postProcessTokens(tokens, offset);
  } catch (error) {
    console.error("[server-tokenizer] Error tokenizing Japanese:", error);
    // Fallback to intelligent chunking
    return chunkKanaText(text, offset);
  }
}

// Raw kuromojin tokenization
async function tokenizeJapaneseSegmentRaw(
  text: string
): Promise<KuromojiToken[]> {
  const { tokenize } = await import("kuromojin");
  return await tokenize(text);
}
