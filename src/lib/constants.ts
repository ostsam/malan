// Shared styling constants for interactive elements

export const INTERACTIVE_STYLES = {
  // Underlining animation styles for clickable words
  UNDERLINE_CLASSES: {
    base: "cursor-pointer",
    animated: "relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-current after:origin-left after:scale-x-0 hover:after:scale-x-100 active:after:scale-x-100 after:transition-all after:duration-300 after:ease-out"
  }
} as const;

// Text cleaning for TTS - focused on common punctuation that affects speech
export const TTS_TEXT_CLEANING = {
  // Common HTML entities that should be decoded
  HTML_ENTITIES: {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&hellip;": "...",
    "&mdash;": "—",
    "&ndash;": "–"
  },
  
  // Common punctuation marks that should be normalized for better TTS
  PUNCTUATION_NORMALIZATION: {
    // Spanish punctuation
    "¿": "?",
    "¡": "!",
    "«": '"',
    "»": '"',
    
    // Chinese/Japanese punctuation
    "。": ".",
    "！": "!",
    "？": "?",
    "：": ":",
    "；": ";",
    "，": ",",
    "（": "(",
    "）": ")",
    "【": "[",
    "】": "]",
    "「": '"',
    "」": '"',
    "『": '"',
    "』": '"',
    
    // Arabic punctuation
    "؟": "?",
    "،": ",",
    "؛": ";",
    "۔": ".",
    
    // General typography
    "…": "...",
    "—": "-",
    "–": "-"
  }
} as const; 