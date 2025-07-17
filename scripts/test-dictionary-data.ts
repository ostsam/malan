import { db } from "@/db";
import { words, definitions, translations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function testDictionaryData() {
  console.log("🔍 Testing Dictionary Database Data...\n");

  try {
    // 1. Check if there are any words in the database
    const wordCount = await db.select().from(words).limit(5);
    console.log("📊 Words in database:", wordCount.length);
    if (wordCount.length > 0) {
      console.log("Sample words:", wordCount.map(w => ({ word: w.word, lang: w.lang })));
    }

    // 2. Check if there are any definitions
    const defCount = await db.select().from(definitions).limit(5);
    console.log("📚 Definitions in database:", defCount.length);
    if (defCount.length > 0) {
      console.log("Sample definitions:", defCount.map(d => ({ 
        id: d.id, 
        wordId: d.wordId, 
        pos: d.pos, 
        sense: d.sense.substring(0, 50) + "...",
        examples: d.examples
      })));
    }

    // 3. Check if there are any translations
    const transCount = await db.select().from(translations).limit(5);
    console.log("🌐 Translations in database:", transCount.length);
    if (transCount.length > 0) {
      console.log("Sample translations:", transCount.map(t => ({ 
        definitionId: t.definitionId, 
        targetLang: t.targetLang, 
        translatedSense: t.translatedSense.substring(0, 50) + "..."
      })));
    }

    // 4. Test a specific query like the API does
    console.log("\n🔍 Testing specific query for 'hello' in English...");
    const testQuery = await db
      .select({
        defId: definitions.id,
        pos: definitions.pos,
        sense: definitions.sense,
        examples: definitions.examples,
      })
      .from(words)
      .innerJoin(definitions, eq(definitions.wordId, words.id))
      .where(and(eq(words.word, "hello"), eq(words.lang, "en")))
      .limit(3);

    console.log("Query result for 'hello':", testQuery.length, "definitions");
    if (testQuery.length > 0) {
      console.log("Sample result:", testQuery[0]);
    }

    // 5. Check if there are any words with definitions
    const wordsWithDefs = await db
      .select({
        word: words.word,
        lang: words.lang,
      })
      .from(words)
      .limit(10);

    console.log("\n📝 Words in database:", wordsWithDefs.length);
    if (wordsWithDefs.length > 0) {
      console.log("Sample words:", wordsWithDefs.slice(0, 3));
    }

  } catch (error) {
    console.error("❌ Error testing dictionary data:", error);
  }

  process.exit(0);
}

testDictionaryData(); 