import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang");
  const word = searchParams.get("word");
  const nativeLang = searchParams.get("nativeLang") || "en";

  // For demo, return empty results since users can't save words without authentication
  if (word && lang) {
    return NextResponse.json({ saved: false });
  }

  if (lang) {
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json({ summary: [] });
}

export async function POST(req: NextRequest) {
  // For demo, return error since users can't save words without authentication
  return NextResponse.json(
    { error: "Demo mode - sign up to save words" },
    { status: 401 }
  );
}
