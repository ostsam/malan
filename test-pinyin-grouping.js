// Test for pinyin grouping without spaces
// Run with: node test-pinyin-grouping.js

// Mock the browser environment
global.window = {};
global.document = {};

// Test the pinyin grouping functionality
async function testPinyinGrouping() {
  try {
    console.log("Testing pinyin grouping...");

    // Import pinyin-pro
    const { pinyin } = await import("pinyin-pro");

    // Test basic pinyin conversion with space removal
    console.log("Testing pinyin grouping:");
    console.log("Original: pinyin('汉语拼音')");
    console.log("Result:", pinyin("汉语拼音"));
    console.log("Grouped:", pinyin("汉语拼音").replace(/\s+/g, ""));

    console.log("\nOriginal: pinyin('你好世界')");
    console.log("Result:", pinyin("你好世界"));
    console.log("Grouped:", pinyin("你好世界").replace(/\s+/g, ""));

    console.log("\nOriginal: pinyin('学习中文')");
    console.log("Result:", pinyin("学习中文"));
    console.log("Grouped:", pinyin("学习中文").replace(/\s+/g, ""));

    // Test with different tone types
    console.log("\nTesting with different tone types:");
    console.log("With tones:", pinyin("汉语拼音").replace(/\s+/g, ""));
    console.log(
      "Without tones:",
      pinyin("汉语拼音", { toneType: "none" }).replace(/\s+/g, "")
    );

    console.log("\n✅ Pinyin grouping test completed successfully!");
  } catch (error) {
    console.error("❌ Pinyin grouping test failed:", error);
  }
}

testPinyinGrouping();
