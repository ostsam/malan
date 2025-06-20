import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audioFile");

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: "Audio file is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nativeLanguage = formData.get("nativeLanguage");
    const selectedLanguage = formData.get("selectedLanguageLabel");

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      temperature: 0,
      prompt: `Transcribe what the user says word for word in the original language. Expect the user to speak in ${selectedLanguage} and ${nativeLanguage}. Maintain a neutral intonation throughout your speech.`,
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
