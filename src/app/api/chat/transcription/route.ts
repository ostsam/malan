import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function base64ToBlob(base64: string, type = "audio/webm"): Blob {
  const buffer = Buffer.from(base64, "base64");
  return new Blob([buffer], { type });
}

export async function POST(req: Request) {
  try {
    const requestBody = await req.json();
    const audioBase64 = requestBody.audio;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "Audio data (base64 string) is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const audioBlob = await base64ToBlob(audioBase64);

    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBlob], "audio.webm", { type: audioBlob.type }),
      model: "whisper-1",
    });

    return new Response(transcription.text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    let errorMessage = "An unknown error occurred during transcription.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({
        error: "Failed to transcribe audio",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
