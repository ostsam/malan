import { TokenizedWord } from "./tokenizer";

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
function segmentTextByScript(text: string): Array<{segment: string, start: number, end: number, type: 'japanese' | 'latin' | 'other'}> {
  const segments: Array<{segment: string, start: number, end: number, type: 'japanese' | 'latin' | 'other'}> = [];
  let currentSegment = '';
  let currentType: 'japanese' | 'latin' | 'other' | null = null;
  let segmentStart = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let charType: 'japanese' | 'latin' | 'other';
    
    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(char)) {
      charType = 'japanese';
    } else if (/[a-zA-Z]/.test(char)) {
      charType = 'latin';
    } else {
      charType = 'other';
    }

    if (currentType === null) {
      // Start new segment
      currentType = charType;
      currentSegment = char;
      segmentStart = i;
    } else if (currentType === charType || (currentType === 'other' && charType !== 'japanese' && charType !== 'latin')) {
      // Continue current segment
      currentSegment += char;
    } else {
      // End current segment and start new one
      if (currentSegment.trim()) {
        segments.push({
          segment: currentSegment,
          start: segmentStart,
          end: segmentStart + currentSegment.length,
          type: currentType
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
      type: currentType
    });
  }

  return segments;
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
  const allTokens: TokenizedWord[] = [];

  for (const segment of segments) {
    if (segment.type === 'japanese') {
      // Use kuromojin for Japanese text
      const japaneseTokens = await tokenizeJapaneseSegment(segment.segment, segment.start);
      allTokens.push(...japaneseTokens);
    } else if (segment.type === 'latin') {
      // Split Latin text by word boundaries
      const words = segment.segment.split(/\s+/).filter(word => word.trim());
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
      if (trimmedSegment) {
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

// Helper function to tokenize Japanese segments
async function tokenizeJapaneseSegment(text: string, offset: number = 0): Promise<TokenizedWord[]> {
  try {
    // Dynamic import kuromojin for server-side use
    const kuromojin = await import("kuromojin");
    const tokens = await kuromojin.tokenize(text, {
      dicPath:
        "./node_modules/.pnpm/kuromojin@3.0.1/node_modules/kuromoji/dict",
    });

    return tokens.map((token: KuromojiToken) => ({
      word: token.surface_form,
      language: "ja",
      reading: token.reading || undefined,
      isJapanese: true,
      start: (token.word_position - 1) + offset,
      end: (token.word_position - 1) + offset + token.surface_form.length,
    }));
  } catch (error) {
    console.error("[server-tokenizer] Error tokenizing Japanese:", error);

    // Fallback to simple script-based tokenization
    const fallbackTokens =
      text.match(
        /[\u3040-\u309f]+|[\u30a0-\u30ff]+|[\u4e00-\u9fff]+|[^\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\s]+/g
      ) || [];

    const result: TokenizedWord[] = [];
    let lastEnd = 0;

    fallbackTokens.forEach((token) => {
      const start = text.indexOf(token, lastEnd);
      if (start >= 0) {
        result.push({
          word: token.trim(),
          language: "ja",
          isJapanese: true,
          start: start + offset,
          end: start + offset + token.length,
        });
        lastEnd = start + token.length;
      }
    });

    return result;
  }
}
