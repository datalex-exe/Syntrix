import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getKeywordProvider } from "@/lib/seo/keywords";

// GET /api/explore - Search and analyze seed keywords
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed");

  if (!seed || !seed.trim()) {
    return NextResponse.json({ error: "Seed keyword parameter is required" }, { status: 400 });
  }

  try {
    const provider = getKeywordProvider();

    // Query provider for keyword details and questions
    const [suggestions, questions] = await Promise.all([
      provider.getSuggestions(seed.trim()),
      provider.getQuestions(seed.trim())
    ]);

    return NextResponse.json({ suggestions, questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
