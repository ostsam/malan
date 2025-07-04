import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

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

// A simple text chunker that splits text by sentences.
const chunkText = (text: string): string[] => {
  // This regex splits text by sentences, respecting CJK and English punctuation.
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？\n]*/g) || [];
  if (sentences.length === 0 && text.length > 0) {
    return [text];
  }
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return new NextResponse("Text is required", { status: 400 });
    }

    const textChunks = chunkText(text);
    const audioBuffers: Buffer[] = [];

    for (const chunk of textChunks) {
      if (chunk.trim().length === 0) continue;
      const audioResponse = await getOpenAI().audio.speech.create({
        model: "tts-1",
        voice: voice || "nova",
        input: chunk,
        response_format: "opus",
      });
      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      audioBuffers.push(buffer);
    }

    if (audioBuffers.length === 0) {
      // This can happen if the input text is only whitespace
      return new NextResponse("No valid text to generate speech from", {
        status: 400,
      });
    }

    const combinedBuffer = Buffer.concat(audioBuffers);

    return new NextResponse(combinedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
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
