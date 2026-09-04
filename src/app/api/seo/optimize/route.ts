import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { phrase, url } = await request.json();

    if (!phrase || !url) {
      return NextResponse.json({ error: "phrase and url are required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API configuration is missing. Please set OPENROUTER_API_KEY in your .env file." },
        { status: 500 }
      );
    }

    const promptSystem = `You are an expert SEO copywriter. Optimize the webpage metadata targeting the keyword "${phrase}". The page URL is "${url}".
Provide your suggestions strictly as a JSON object matching this schema:
{
  "suggestedTitles": ["3 highly optimized title tag ideas, each 30-60 characters"],
  "suggestedMetaDescriptions": ["3 optimized meta description ideas, each 120-160 characters"],
  "suggestedHeaders": ["3 sub-header or title section improvements containing the target phrase"]
}
Do not wrap your output in markdown code blocks. Respond only with raw, valid JSON.`;

    try {
      const endpoint = "https://openrouter.ai/api/v1/chat/completions";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Syntrix"
        },
        body: JSON.stringify({
          model: "x-ai/grok-2",
          messages: [
            { role: "system", content: promptSystem },
            { role: "user", content: `Please optimize my site metadata for the keyword: "${phrase}"` }
          ]
        })
      });

      if (!res.ok) {
        const errDetails = await res.text();
        return NextResponse.json(
          { error: `OpenRouter API returned error code ${res.status}: ${errDetails}` },
          { status: 500 }
        );
      }

      const completions = await res.json();
      const responseText = completions.choices?.[0]?.message?.content;
      
      if (!responseText) {
        return NextResponse.json(
          { error: "OpenRouter API returned an empty completion response." },
          { status: 500 }
        );
      }

      // Parse JSON from completions. Grok on OpenRouter might sometimes wrap it in ```json blocks
      let cleanText = responseText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      }

      const parsedJson = JSON.parse(cleanText);
      return NextResponse.json(parsedJson);
    } catch (err: any) {
      console.error("[OpenRouter Grok AI Copywriter] API fetch exception:", err);
      return NextResponse.json(
        { error: `Failed to connect with OpenRouter Grok AI service: ${err.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
