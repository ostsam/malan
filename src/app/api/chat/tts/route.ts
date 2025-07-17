import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { TTS_TEXT_CLEANING } from "@/lib/constants";

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// Clean text for TTS - focused on common issues that affect speech
function cleanTextForTTS(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // Decode HTML entities
  Object.entries(TTS_TEXT_CLEANING.HTML_ENTITIES).forEach(([entity, replacement]) => {
    cleaned = cleaned.replace(new RegExp(entity, 'g'), replacement);
  });
  
  // Arabic-specific cleaning for TTS
  if (/[\u0600-\u06FF]/.test(cleaned)) {
    // Remove Arabic diacritics (tashkeel) which can confuse TTS
    cleaned = cleaned.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
    
    // Remove bidirectional text markers
    cleaned = cleaned.replace(/[\u200E\u200F\u202A-\u202E]/g, '');
    
    // Normalize Arabic-Indic digits to Western digits for TTS
    cleaned = cleaned.replace(/[٠-٩]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - '٠'.charCodeAt(0) + '0'.charCodeAt(0));
    });
  }
  
  // TEMPORARILY DISABLED: Normalize punctuation marks - might be causing Spanish TTS issues
  // Object.entries(TTS_TEXT_CLEANING.PUNCTUATION_NORMALIZATION).forEach(([mark, replacement]) => {
  //   cleaned = cleaned.replace(new RegExp(mark, 'g'), replacement);
  // });
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

// Improved text chunker that handles edge cases better
const chunkText = (text: string): string[] => {
  if (!text || text.trim().length === 0) return [];
  
  // For Arabic, never chunk - always return as single chunk for better pronunciation
  const isArabic = /[\u0600-\u06FF]/.test(text);
  if (isArabic) {
    return [text.trim()];
  }
  
  // For very short text, return as single chunk
  if (text.trim().length < 50) {
    return [text.trim()];
  }
  
  // Split by sentence boundaries, handling multiple languages
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？\n]*/g) || [];
  
  if (sentences.length === 0) {
    // If no sentence boundaries found, split by length to avoid overly long chunks
    const maxChunkLength = 500;
    const chunks = [];
    let currentChunk = "";
    
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 > maxChunkLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return new NextResponse("Text is required", { status: 400 });
    }

    // Clean the text before processing
    const cleanedText = cleanTextForTTS(text);
    
    
    if (!cleanedText.trim()) {
      return new NextResponse("No valid text to generate speech from", { status: 400 });
    }

    const selectedVoice = voice || "alloy";

    // Use consistent processing for all text lengths to avoid timing gaps

    // Chunking approach for longer text
    const textChunks = chunkText(cleanedText);
    
    
    if (textChunks.length === 0) {
      return new NextResponse("No valid text to generate speech from", { status: 400 });
    }
    
    const audioChunks: string[] = [];

    for (const chunk of textChunks) {
      if (chunk.trim().length === 0) continue;
      
      try {
        const audioResponse = await getOpenAI().audio.speech.create({
          model: "tts-1",
          voice: selectedVoice,
          input: chunk,
          response_format: "mp3",
        });
        
        const buffer = Buffer.from(await audioResponse.arrayBuffer());
        
        
        if (buffer.length === 0) {
          console.warn("[TTS] Empty buffer received for chunk:", chunk);
          continue;
        }
        
        const base64Audio = buffer.toString('base64');
        audioChunks.push(base64Audio);
      } catch (chunkError) {
        console.error("[TTS] Error processing chunk:", chunk, chunkError);
        // Continue with other chunks instead of failing completely
      }
    }

    if (audioChunks.length === 0) {
      return new NextResponse("Failed to generate audio for any text chunks", {
        status: 500,
      });
    }

    return new NextResponse(JSON.stringify({
      chunks: audioChunks,
      format: "opus"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in TTS route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(
      JSON.stringify({
        error: "Error generating speech",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}
