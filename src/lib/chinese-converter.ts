import type { Converter } from "opencc-js";

// Initialize converters
let simplifiedToTraditional: Converter | null = null;
let traditionalToSimplified: Converter | null = null;

async function initConverters() {
  if (!simplifiedToTraditional) {
    try {
      const OpenCC = await import("opencc-js");
      simplifiedToTraditional = OpenCC.Converter({ from: "cn", to: "tw" });
      console.log(
        "[CHINESE_CONVERTER] Simplified to Traditional converter initialized"
      );
    } catch (error) {
      console.error(
        "[CHINESE_CONVERTER] Failed to initialize Simplified to Traditional converter:",
        error
      );
    }
  }

  if (!traditionalToSimplified) {
    try {
      const OpenCC = await import("opencc-js");
      traditionalToSimplified = OpenCC.Converter({ from: "tw", to: "cn" });
      console.log(
        "[CHINESE_CONVERTER] Traditional to Simplified converter initialized"
      );
    } catch (error) {
      console.error(
        "[CHINESE_CONVERTER] Failed to initialize Traditional to Simplified converter:",
        error
      );
    }
  }
}

/**
 * Convert Simplified Chinese to Traditional Chinese
 */
export async function toTraditional(text: string): Promise<string> {
  if (!text) return text;

  try {
    await initConverters();
    if (!simplifiedToTraditional) {
      console.warn(
        "[CHINESE_CONVERTER] Converter not available, returning original text"
      );
      return text;
    }
    return simplifiedToTraditional(text);
  } catch (error) {
    console.error(
      "[CHINESE_CONVERTER] Error converting to Traditional:",
      error
    );
    return text;
  }
}

/**
 * Convert Traditional Chinese to Simplified Chinese
 */
export async function toSimplified(text: string): Promise<string> {
  if (!text) return text;

  try {
    await initConverters();
    if (!traditionalToSimplified) {
      console.warn(
        "[CHINESE_CONVERTER] Converter not available, returning original text"
      );
      return text;
    }
    return traditionalToSimplified(text);
  } catch (error) {
    console.error("[CHINESE_CONVERTER] Error converting to Simplified:", error);
    return text;
  }
}

/**
 * Convert Chinese text to the specified script
 */
export async function convertChineseText(
  text: string,
  targetScript: "traditional" | "simplified"
): Promise<string> {
  if (!text) return text;

  try {
    if (targetScript === "traditional") {
      return await toTraditional(text);
    } else {
      return await toSimplified(text);
    }
  } catch (error) {
    console.error("[CHINESE_CONVERTER] Error converting Chinese text:", error);
    return text;
  }
}

/**
 * Detect the script of Chinese text
 */
export async function detectChineseScript(
  text: string
): Promise<"traditional" | "simplified" | "unknown"> {
  if (!text) return "unknown";

  // Use OpenCC's built-in detection
  try {
    const OpenCC = await import("opencc-js");
    const converter = OpenCC.Converter({ from: "cn", to: "tw" });
    const converted = converter(text);

    // If the text changes when converting from simplified to traditional,
    // it means the original text was simplified
    if (converted !== text) {
      return "simplified";
    }

    // Try the reverse conversion
    const reverseConverter = OpenCC.Converter({ from: "tw", to: "cn" });
    const reverseConverted = reverseConverter(text);

    // If the text changes when converting from traditional to simplified,
    // it means the original text was traditional
    if (reverseConverted !== text) {
      return "traditional";
    }

    // If no changes in either direction, it might be mixed or non-Chinese
    return "unknown";
  } catch (error) {
    console.error("[CHINESE_CONVERTER] Error detecting script:", error);
    return "unknown";
  }
}

/**
 * Get user's Chinese script preference from localStorage
 */
export function getUserChineseScriptPreference(): "traditional" | "simplified" {
  if (typeof window === "undefined") return "simplified";

  try {
    const preference = localStorage.getItem("chineseScriptPreference");
    return preference === "traditional" ? "traditional" : "simplified";
  } catch (error) {
    console.error("[CHINESE_CONVERTER] Error getting user preference:", error);
    return "simplified";
  }
}

/**
 * Set user's Chinese script preference in localStorage
 */
export function setUserChineseScriptPreference(
  script: "traditional" | "simplified"
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("chineseScriptPreference", script);
  } catch (error) {
    console.error("[CHINESE_CONVERTER] Error setting user preference:", error);
  }
}

/**
 * Convert text to user's preferred script
 */
export async function convertToUserPreference(text: string): Promise<string> {
  const userPreference = getUserChineseScriptPreference();
  return await convertChineseText(text, userPreference);
}
