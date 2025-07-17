import { NextRequest, NextResponse } from "next/server";
import { tokenizeJapaneseServer } from "@/lib/server-tokenizer";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text, lang } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid text parameter" },
        { status: 400 }
      );
    }

    if (!lang || typeof lang !== "string") {
      return NextResponse.json(
        { error: "Invalid language parameter" },
        { status: 400 }
      );
    }

    console.log("[API] Tokenizing text:", {
      text: text.substring(0, 100),
      lang,
    });

    // Only handle Japanese on server, other languages should be handled client-side
    if (lang === "ja") {
      const tokens = await tokenizeJapaneseServer(text);
      console.log(
        "[API] Japanese tokenization result:",
        tokens.length,
        "tokens"
      );

      const response = NextResponse.json({ tokens });
      response.headers.set(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=7200"
      );
      return response;
    } else {
      // For non-Japanese languages, return error - should be handled client-side
      return NextResponse.json(
        { error: "Only Japanese tokenization is supported on server" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] Tokenization error:", error);
    return NextResponse.json({ error: "Tokenization failed" }, { status: 500 });
  }
}
