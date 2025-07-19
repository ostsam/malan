import * as kuromoji from "kuromojin";
import { db } from "../db/drizzle";
import { japaneseTokens } from "../db/schema";
import { eq, desc, like } from "drizzle-orm";

export interface Token {
  surface: string;
  reading: string | null;
  frequency: number | null;
  pos: string;
  source: "database" | "kuromoji" | "punctuation";
  kanji: string | null;
}

/**
 * Database-first Japanese tokenizer
 * Uses JMdict database for base words, kuromojin as fallback
 */
export async function databaseTokenize(text: string): Promise<Token[]> {
  const tokens: Token[] = [];
  let position = 0;

  while (position < text.length) {
    const currentChar = text[position];

    // Handle punctuation and symbols - show them but don't parse as words
    if (isPunctuation(currentChar)) {
      tokens.push({
        surface: currentChar,
        reading: currentChar,
        frequency: null,
        pos: "punctuation",
        source: "punctuation",
        kanji: null,
      });
      position += 1;
      continue;
    }

    // Try to find the longest match in our database
    const dbMatch = await findLongestDatabaseMatch(text.slice(position));

    if (dbMatch && isValidMatch(dbMatch, text.slice(position))) {
      tokens.push({
        surface: dbMatch.kanji || dbMatch.reading,
        reading: dbMatch.reading,
        frequency: dbMatch.frequency,
        pos: dbMatch.partOfSpeech,
        source: "database",
        kanji: dbMatch.kanji,
      });
      position += (dbMatch.kanji || dbMatch.reading).length;
    } else {
      // Fallback to kuromojin for unknown words
      const kuromojiResult = await kuromoji.tokenize(text.slice(position));
      if (kuromojiResult.length > 0) {
        const token = kuromojiResult[0];
        tokens.push({
          surface: token.surface_form,
          reading: token.reading,
          frequency: null,
          pos: token.pos,
          source: "kuromoji",
          kanji: null,
        });
        position += token.surface_form.length;
      } else {
        // If kuromojin fails, take one character and move on
        tokens.push({
          surface: text[position],
          reading: text[position],
          frequency: null,
          pos: "unknown",
          source: "kuromoji",
          kanji: null,
        });
        position += 1;
      }
    }
  }

  return tokens;
}

/**
 * Check if a character is punctuation or symbol
 */
function isPunctuation(char: string): boolean {
  return /[。、！？：；""''（）【】「」『』…—]/u.test(char);
}

/**
 * Validate if a database match is appropriate for the current position
 */
function isValidMatch(dbMatch: any, remainingText: string): boolean {
  const matchText = dbMatch.kanji || dbMatch.reading;

  // Don't match single characters that are likely part of larger words
  if (matchText.length === 1 && remainingText.length > 1) {
    // Check if this single character is likely part of a larger word
    const nextChar = remainingText[1];
    if (
      /[あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん]/u.test(
        nextChar
      )
    ) {
      return false;
    }
  }

  // Don't match very short words if there's a longer potential match
  if (matchText.length <= 2 && remainingText.length > 3) {
    return false;
  }

  return true;
}

/**
 * Find the longest matching word in our database
 */
async function findLongestDatabaseMatch(text: string): Promise<any> {
  // Try matches of decreasing length (longest first)
  for (let length = Math.min(10, text.length); length > 0; length--) {
    const candidate = text.slice(0, length);

    // Skip single characters that are likely particles or punctuation
    if (
      length === 1 &&
      /[はがをにでへとからまでよりのやかわ]/u.test(candidate)
    ) {
      continue;
    }

    // Try exact kanji match first
    let result = await db
      .select()
      .from(japaneseTokens)
      .where(eq(japaneseTokens.kanji, candidate))
      .orderBy(desc(japaneseTokens.frequency))
      .limit(1);

    if (result.length > 0) {
      return result[0];
    }

    // Try exact reading match for kana-only words
    result = await db
      .select()
      .from(japaneseTokens)
      .where(eq(japaneseTokens.reading, candidate))
      .orderBy(desc(japaneseTokens.frequency))
      .limit(1);

    if (result.length > 0) {
      return result[0];
    }
  }

  return null;
}

/**
 * Get token statistics for analysis
 */
export function getTokenStats(tokens: Token[]) {
  const dbTokens = tokens.filter((t) => t.source === "database");
  const kuromojiTokens = tokens.filter((t) => t.source === "kuromoji");

  return {
    total: tokens.length,
    database: dbTokens.length,
    kuromoji: kuromojiTokens.length,
    databasePercentage: Math.round((dbTokens.length / tokens.length) * 100),
    averageFrequency:
      dbTokens.length > 0
        ? Math.round(
            dbTokens.reduce((sum, t) => sum + (t.frequency || 0), 0) /
              dbTokens.length
          )
        : 0,
  };
}

/**
 * Filter tokens by frequency range
 */
export function filterByFrequency(
  tokens: Token[],
  minFreq: number,
  maxFreq?: number
): Token[] {
  return tokens.filter((token) => {
    if (token.frequency === null) return false;
    if (token.frequency < minFreq) return false;
    if (maxFreq && token.frequency > maxFreq) return false;
    return true;
  });
}

/**
 * Get unknown words (kuromojin tokens) for vocabulary building
 */
export function getUnknownWords(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.source === "kuromoji");
}

/**
 * Get known words (database tokens) for progress tracking
 */
export function getKnownWords(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.source === "database");
}
