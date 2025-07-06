// Simple test for the new Chinese tokenizer
// Run with: node test-tokenizer.js

// Mock the browser environment
global.window = {};
global.document = {};

// Test the tokenizer
async function testTokenizer() {
  try {
    console.log("Testing Chinese tokenizer...");

    // Import the tokenizer
    const { tokenizeChineseText, isChineseText } = await import(
      "./src/lib/chinese-tokenizer.ts"
    );

    // Test Chinese text detection
    console.log("Testing Chinese text detection:");
    console.log("isChineseText('你好'):", isChineseText("你好"));
    console.log("isChineseText('Hello'):", isChineseText("Hello"));

    // Test tokenization
    console.log("\nTesting tokenization:");
    const testText = "我现在是两万五块钱";
    console.log("Input:", testText);

    const tokens = await tokenizeChineseText(testText);
    console.log("Tokens:", tokens);

    console.log("\n✅ Tokenizer test completed!");
  } catch (error) {
    console.error("❌ Tokenizer test failed:", error);
  }
}

testTokenizer();
