import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Parse the request body to get the text and voice
    const { text, voice } = await req.json();

    // Validate that text is provided
    if (!text) {
      return new NextResponse("Text is required", { status: 400 });
    }

    // Generate the speech using the OpenAI API
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "coral", // Default to 'coral' voice if not provided
      input: text,
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Return the audio as a response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error in TTS route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Error generating speech", details: errorMessage }), { status: 500 });
  }
}
