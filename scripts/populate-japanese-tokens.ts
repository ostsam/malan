import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { japaneseTokens } from "../src/db/schema";
import * as fs from "fs/promises";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env" });

interface JMdictEntry {
  kanji: string | null;
  reading: string | null;
  frequency: number;
  entryId: number;
  partOfSpeech: string;
  priority: boolean;
  wordType: string;
}

interface AggregatedEntry {
  kanji: string | null;
  reading: string | null;
  totalFrequency: number;
  entryIds: number[];
  partOfSpeech: string;
  priority: boolean;
  wordType: string;
  fileCount: number;
}

// Parse a single JMdict entry (reused from parse-jmdict-full.ts)
function parseJMdictEntry(
  entry: any[],
  debug: boolean = false
): JMdictEntry | null {
  try {
    if (!Array.isArray(entry) || entry.length < 7) return null;

    // Format: [kanji, reading, info1, info2, frequency, content, entryId]
    const [kanji, reading, info1, info2, frequency, content, entryId] = entry;

    // Include entries even if they don't have readings (some are kanji-only)
    // Just ensure we have either kanji or reading
    if (!kanji && (!reading || typeof reading !== "string")) return null;

    // Skip redirect entries (they usually contain "→" or similar markers)
    if (
      typeof info1 === "string" &&
      (info1.includes("→") || info1.includes("see"))
    )
      return null;
    if (
      typeof info2 === "string" &&
      (info2.includes("→") || info2.includes("see"))
    )
      return null;

    // Skip entries with empty kanji and reading (likely invalid)
    if (!kanji && (!reading || reading.trim() === "")) return null;

    // Skip single character entries that are just punctuation or symbols
    if (kanji && kanji.length === 1 && /[〃〇〻〼]/.test(kanji)) return null;

    // Skip entries that are just single katakana characters (likely not useful for tokenization)
    if (reading && reading.length === 1 && /^[ァ-ヶ]$/.test(reading))
      return null;

    // Skip entries with very short readings that are likely not words
    if (reading && reading.length <= 1 && !kanji) return null;

    // Skip entries without real frequency data (only exclude very low negative values)
    if (frequency < -100) return null;

    // Extract part of speech from content
    const partOfSpeech = extractPartOfSpeech(content);

    // Debug: Log entries with unknown POS
    if (debug && partOfSpeech === "unknown") {
      console.log(
        `Unknown POS for entry ${entryId}:`,
        JSON.stringify(content, null, 2)
      );
    }

    // Check if it's a priority word
    const priority = info1.includes("★") || info2.includes("★");

    // Categorize word type
    const wordType = categorizeWordType(partOfSpeech);

    // If kanji and reading are identical, set reading to null
    // For kanji-only entries, keep reading as null
    const finalReading = kanji && reading && kanji === reading ? null : reading;

    return {
      kanji,
      reading: finalReading,
      frequency,
      entryId,
      partOfSpeech,
      priority,
      wordType,
    };
  } catch (error) {
    console.error("Error parsing entry:", error);
    return null;
  }
}

// Extract part of speech from structured content
function extractPartOfSpeech(content: any[]): string {
  if (!Array.isArray(content)) return "unknown";

  for (const item of content) {
    if (item.type === "structured-content" && item.content) {
      // Try multiple possible structures
      const pos = findPOSInContent(item.content);
      if (pos !== "unknown") return pos;
    }
  }
  return "unknown";
}

// Recursively search for POS tags in content
function findPOSInContent(content: any): string {
  if (Array.isArray(content)) {
    for (const item of content) {
      const pos = findPOSInContent(item);
      if (pos !== "unknown") return pos;
    }
  } else if (typeof content === "object" && content !== null) {
    // Check if this object has a title attribute with POS info
    if (content.title && typeof content.title === "string") {
      const title = content.title.toLowerCase();
      if (title.includes("noun") || title.includes("名詞")) return "noun";
      if (title.includes("verb") || title.includes("動詞")) return "verb";
      if (title.includes("adjective") || title.includes("形容詞"))
        return "adjective";
      if (title.includes("adverb") || title.includes("副詞")) return "adverb";
      if (title.includes("particle") || title.includes("助詞"))
        return "particle";
      if (title.includes("conjunction") || title.includes("接続詞"))
        return "conjunction";
      if (title.includes("interjection") || title.includes("感動詞"))
        return "interjection";
      if (title.includes("expression") || title.includes("表現"))
        return "expression";
      if (title.includes("prefix") || title.includes("接頭辞")) return "prefix";
      if (title.includes("suffix") || title.includes("接尾辞")) return "suffix";
      if (title.includes("pronoun") || title.includes("代名詞"))
        return "pronoun";
      if (title.includes("numeral") || title.includes("数詞")) return "numeral";
      if (title.includes("auxiliary") || title.includes("助動詞"))
        return "auxiliary";
    }

    // Also check for 'tag' property which might contain POS info
    if (content.tag && typeof content.tag === "string") {
      const tag = content.tag.toLowerCase();
      if (tag.includes("noun") || tag.includes("名詞")) return "noun";
      if (tag.includes("verb") || tag.includes("動詞")) return "verb";
      if (tag.includes("adjective") || tag.includes("形容詞"))
        return "adjective";
      if (tag.includes("adverb") || tag.includes("副詞")) return "adverb";
      if (tag.includes("particle") || tag.includes("助詞")) return "particle";
      if (tag.includes("conjunction") || tag.includes("接続詞"))
        return "conjunction";
      if (tag.includes("interjection") || tag.includes("感動詞"))
        return "interjection";
      if (tag.includes("expression") || tag.includes("表現"))
        return "expression";
      if (tag.includes("prefix") || tag.includes("接頭辞")) return "prefix";
      if (tag.includes("suffix") || tag.includes("接尾辞")) return "suffix";
      if (tag.includes("pronoun") || tag.includes("代名詞")) return "pronoun";
      if (tag.includes("numeral") || tag.includes("数詞")) return "numeral";
      if (tag.includes("auxiliary") || tag.includes("助動詞"))
        return "auxiliary";
    }

    // Check if this object has content that might contain POS info
    if (content.content) {
      const pos = findPOSInContent(content.content);
      if (pos !== "unknown") return pos;
    }

    // Recursively search all properties
    for (const key in content) {
      if (key !== "title" && key !== "content" && key !== "tag") {
        const pos = findPOSInContent(content[key]);
        if (pos !== "unknown") return pos;
      }
    }
  }

  return "unknown";
}

// Categorize word type based on part of speech
function categorizeWordType(pos: string): string {
  const posLower = pos.toLowerCase();

  if (posLower.includes("noun")) return "noun";
  if (posLower.includes("verb")) return "verb";
  if (posLower.includes("adjective")) return "adjective";
  if (posLower.includes("adverb")) return "adverb";
  if (posLower.includes("particle")) return "particle";
  if (posLower.includes("conjunction")) return "conjunction";
  if (posLower.includes("interjection")) return "interjection";

  return "other";
}

// Create a unique key for a word (kanji-based deduplication)
function createWordKey(entry: JMdictEntry): string {
  const kanji = entry.kanji || "";
  const reading = entry.reading || "";
  // Use just kanji as the key, ignore different readings
  if (kanji) {
    return kanji;
  }
  // For reading-only entries, use reading
  return reading;
}

// Process a single JSON file
async function processFile(
  filePath: string,
  debug: boolean = false
): Promise<JMdictEntry[]> {
  try {
    console.log(`Processing: ${path.basename(filePath)}`);
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      console.error(`Invalid JMdict file: ${filePath}`);
      return [];
    }

    const entries: JMdictEntry[] = [];
    let skipped = 0;
    for (const entry of data) {
      const parsed = parseJMdictEntry(entry, debug);
      if (parsed) {
        entries.push(parsed);
      } else {
        skipped++;
      }
    }

    // Debug: Show first few entries if none were parsed
    if (entries.length === 0 && data.length > 0) {
      console.log(
        `  Debug: First entry structure:`,
        JSON.stringify(data[0], null, 2)
      );
    }

    console.log(`  Parsed ${entries.length} valid entries, skipped ${skipped}`);
    return entries;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return [];
  }
}

// Aggregate entries across all files
function aggregateEntries(
  allEntries: JMdictEntry[]
): Map<string, AggregatedEntry> {
  const aggregated = new Map<string, AggregatedEntry>();

  for (const entry of allEntries) {
    const key = createWordKey(entry);

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      // Use the most frequent reading (higher positive or less negative = more frequent)
      if (entry.frequency > existing.totalFrequency) {
        existing.totalFrequency = entry.frequency;
        existing.reading = entry.reading; // Keep the most frequent reading
      }
      existing.entryIds.push(entry.entryId);
      existing.fileCount++;
      // Keep the first part of speech and word type encountered
    } else {
      aggregated.set(key, {
        kanji: entry.kanji,
        reading: entry.reading,
        totalFrequency: entry.frequency,
        entryIds: [entry.entryId],
        partOfSpeech: entry.partOfSpeech,
        priority: entry.priority,
        wordType: entry.wordType,
        fileCount: 1,
      });
    }
  }

  return aggregated;
}

// Main function to populate the database
async function populateJapaneseTokens() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: tsx scripts/populate-japanese-tokens.ts <path-to-jmdict-folder> [max-entries] [debug]"
    );
    process.exit(1);
  }

  const folderPath = args[0];
  const maxEntries = args[1]
    ? args[1] === "all"
      ? null
      : parseInt(args[1])
    : 100000;
  const debug = args[2] === "debug";

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log(`Reading JMdict files from: ${folderPath}`);
    console.log(`Target entries: ${maxEntries === null ? "ALL" : maxEntries}`);

    // Get all term_bank JSON files in the folder (actual word entries)
    const files = await fs.readdir(folderPath);
    const jsonFiles = files
      .filter((file) => file.endsWith(".json") && file.includes("term_bank"))
      .map((file) => path.join(folderPath, file));

    console.log(`Found ${jsonFiles.length} JSON files`);

    if (jsonFiles.length === 0) {
      console.error("No JSON files found in the specified folder");
      process.exit(1);
    }

    // Process all files
    const allEntries: JMdictEntry[] = [];

    for (const filePath of jsonFiles) {
      const entries = await processFile(filePath, debug);
      allEntries.push(...entries);
    }

    console.log(`\nTotal entries across all files: ${allEntries.length}`);

    // Aggregate entries
    console.log("Aggregating entries...");
    const aggregated = aggregateEntries(allEntries);
    console.log(`Unique words found: ${aggregated.size}`);

    // Convert to array and sort by frequency
    console.log("Sorting entries by frequency...");
    const entriesArray = Array.from(aggregated.values());

    // Optimized sorting for large datasets
    entriesArray.sort((a, b) => {
      const freqA = a.totalFrequency;
      const freqB = b.totalFrequency;

      // Sort by frequency: higher positive numbers first, then less negative numbers
      if (freqA >= 0 && freqB >= 0) {
        return freqB - freqA; // Higher positive = more frequent
      }
      if (freqA < 0 && freqB < 0) {
        return freqB - freqA; // Less negative = more frequent (-50 > -100)
      }
      // Positive numbers come before negative
      return freqA >= 0 ? -1 : 1;
    });

    const sortedEntries =
      maxEntries === null ? entriesArray : entriesArray.slice(0, maxEntries);

    console.log(`\nInserting ${sortedEntries.length} tokens into database...`);

    // Show some sample entries for debugging
    console.log("\nSample entries:");
    for (let i = 0; i < Math.min(10, sortedEntries.length); i++) {
      const entry = sortedEntries[i];
      console.log(
        `  ${i + 1}. ${entry.kanji || "N/A"} (${entry.reading || "N/A"}) - ${entry.partOfSpeech} - freq: ${entry.totalFrequency}`
      );
    }

    // Clear existing data
    await sql`DELETE FROM japanese_tokens`;

    // Insert in batches
    const batchSize = 1000;
    for (let i = 0; i < sortedEntries.length; i += batchSize) {
      const batch = sortedEntries.slice(i, i + batchSize);

      const values = batch.map((entry) => ({
        kanji: entry.kanji,
        reading: entry.reading,
        frequency: entry.totalFrequency,
        partOfSpeech: entry.partOfSpeech,
        isPriority: entry.priority,
        entryId: entry.entryIds[0], // Use first entry ID
        fileCount: entry.fileCount,
      }));

      // Insert batch using raw SQL
      for (const entry of values) {
        await sql`
          INSERT INTO japanese_tokens (kanji, reading, frequency, part_of_speech, is_priority, entry_id, file_count)
          VALUES (${entry.kanji}, ${entry.reading}, ${entry.frequency}, ${entry.partOfSpeech}, ${entry.isPriority}, ${entry.entryId}, ${entry.fileCount})
        `;
      }

      console.log(
        `  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sortedEntries.length / batchSize)}`
      );
    }

    console.log(
      `\n✅ Successfully populated japanese_tokens table with ${sortedEntries.length} tokens!`
    );

    // Show some statistics
    const stats = await sql`
      SELECT 
        part_of_speech,
        COUNT(*) as count,
        AVG(frequency) as avg_frequency
      FROM japanese_tokens 
      GROUP BY part_of_speech 
      ORDER BY count DESC
    `;

    console.log("\nPOS distribution in database:");
    for (const row of stats) {
      console.log(
        `  ${row.part_of_speech}: ${row.count} (avg freq: ${Math.round(row.avg_frequency)})`
      );
    }
  } catch (error) {
    console.error("Error populating database:", error);
  } finally {
    await sql.end();
  }
}

// Run the script
if (require.main === module) {
  populateJapaneseTokens();
}
