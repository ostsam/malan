import "dotenv/config";
import { translateDefinitions } from "@/server/dictionary/helpers";
import type { Definition } from "@/server/dictionary/types";

// Test words for each language
const TEST_WORDS = {
  ru: [
    { word: "или", sense: "Указывает на выбор между двумя или более вариантами." },
    { word: "дом", sense: "Здание, где люди живут." },
    { word: "быстрый", sense: "Совершающийся за короткое время." },
    { word: "работать", sense: "Выполнять какую-либо работу." },
    { word: "хороший", sense: "Обладающий положительными качествами." },
  ],
  zh: [
    { word: "和", sense: "表示连接或并列关系。" },
    { word: "家", sense: "人们居住的地方。" },
    { word: "快", sense: "速度高，时间短。" },
    { word: "工作", sense: "从事劳动或职业活动。" },
    { word: "好", sense: "具有正面品质的。" },
  ],
  es: [
    { word: "y", sense: "Conjunción que une elementos de la misma clase." },
    { word: "casa", sense: "Edificio destinado para habitar." },
    { word: "rápido", sense: "Que se mueve o actúa con velocidad." },
    { word: "trabajar", sense: "Realizar una actividad laboral." },
    { word: "bueno", sense: "Que tiene cualidades positivas." },
  ],
  fr: [
    { word: "et", sense: "Conjonction de coordination qui unit des éléments." },
    { word: "maison", sense: "Bâtiment destiné à l'habitation." },
    { word: "rapide", sense: "Qui se meut ou agit avec vitesse." },
    { word: "travailler", sense: "Exercer une activité professionnelle." },
    { word: "bon", sense: "Qui a des qualités positives." },
  ],
  de: [
    { word: "und", sense: "Konjunktion, die Elemente verbindet." },
    { word: "Haus", sense: "Gebäude zum Wohnen." },
    { word: "schnell", sense: "Sich mit hoher Geschwindigkeit bewegen." },
    { word: "arbeiten", sense: "Eine berufliche Tätigkeit ausüben." },
    { word: "gut", sense: "Positive Eigenschaften besitzen." },
  ],
  it: [
    { word: "e", sense: "Congiunzione che unisce elementi." },
    { word: "casa", sense: "Edificio destinato all'abitazione." },
    { word: "veloce", sense: "Che si muove o agisce con rapidità." },
    { word: "lavorare", sense: "Svolgere un'attività professionale." },
    { word: "buono", sense: "Che ha qualità positive." },
  ],
  ja: [
    { word: "と", sense: "要素を結びつける接続詞。" },
    { word: "家", sense: "人が住む建物。" },
    { word: "速い", sense: "速度が高く、時間が短い。" },
    { word: "働く", sense: "労働や職業活動を行う。" },
    { word: "良い", sense: "肯定的な性質を持つ。" },
  ],
  ko: [
    { word: "와/과", sense: "요소를 연결하는 접속사." },
    { word: "집", sense: "사람들이 사는 건물." },
    { word: "빠른", sense: "속도가 높고 시간이 짧은." },
    { word: "일하다", sense: "노동이나 직업 활동을 수행하다." },
    { word: "좋은", sense: "긍정적인 성질을 가진." },
  ],
  pt: [
    { word: "e", sense: "Conjunção que une elementos." },
    { word: "casa", sense: "Edifício destinado à habitação." },
    { word: "rápido", sense: "Que se move ou age com velocidade." },
    { word: "trabalhar", sense: "Realizar uma atividade profissional." },
    { word: "bom", sense: "Que tem qualidades positivas." },
  ]
};

async function testTranslations() {
  console.log("🧪 Testing Translation Prompt\n");
  
  for (const [sourceLang, words] of Object.entries(TEST_WORDS)) {
    console.log(`\n📝 Testing ${sourceLang.toUpperCase()} → English translations:`);
    console.log("=" .repeat(60));
    
    for (const { word, sense } of words) {
      try {
        // Create a definition object
        const definition: Definition = {
          pos: "unknown",
          sense: sense,
          examples: []
        };
        
        // Test translation
        const result = await translateDefinitions([definition], "en", sourceLang);
        
        if (result && result[0] && result[0].translatedSense) {
          console.log(`✅ ${word}:`);
          console.log(`   Original: ${sense}`);
          console.log(`   Translation: ${result[0].translatedSense}`);
        } else {
          console.log(`❌ ${word}: Translation failed`);
          console.log(`   Original: ${sense}`);
        }
        
        console.log(); // Empty line for readability
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ ${word}: Error - ${error}`);
        console.log();
      }
    }
  }
  
  console.log("\n🎉 Translation testing complete!");
}

// Run the test
testTranslations().catch(console.error); 