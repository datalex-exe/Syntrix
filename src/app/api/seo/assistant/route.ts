import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, messages } = await request.json();

    if (!projectId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "projectId and messages array are required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // Fetch existing crawled audit issues to give context to the AI
    const auditIssues = await prisma.auditIssue.findMany({
      where: { projectId },
      orderBy: { detectedAt: "desc" }
    });

    // Detect if the domain is a subdomain or a temporary site platform
    const domain = project.domain.toLowerCase();
    const isSubdomain = 
      domain.includes("onrender.com") || 
      domain.includes("vercel.app") || 
      domain.includes("github.io") || 
      domain.includes("netlify.app") || 
      domain.includes("herokuapp.com") ||
      domain.includes("pages.dev") ||
      (domain.split(".").length > 2 && !domain.startsWith("www."));

    let domainPlatform = "standard domain";
    if (domain.includes("onrender.com")) domainPlatform = "Render Subdomain (onrender.com)";
    else if (domain.includes("vercel.app")) domainPlatform = "Vercel Subdomain (vercel.app)";
    else if (domain.includes("github.io")) domainPlatform = "GitHub Pages (github.io)";
    else if (domain.includes("netlify.app")) domainPlatform = "Netlify Subdomain (netlify.app)";
    else if (isSubdomain) domainPlatform = "Generic Subdomain";

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API configuration is missing. Please set OPENROUTER_API_KEY in your .env file." },
        { status: 500 }
      );
    }

    // Group audit issues for a concise prompt representation
    const issueSummary = auditIssues.map((issue) => ({
      url: issue.url.replace(project.domain, ""),
      type: issue.issueType,
      severity: issue.severity,
      details: issue.details
    }));

    // Construct the system prompt
    const systemPrompt = `You are the Syntrix AI Assistant, an elite SEO copywriter and technical SEO strategist.
You are helping the user optimize their website project:
- Name: "${project.name}"
- Domain: "${project.domain}" (Type: ${domainPlatform})
- Full Site Briefing: ${project.briefing ? `"${project.briefing}"` : "Not provided by user yet."}

${
  isSubdomain
    ? `IMPORTANT CONTEXT ON SUBDOMAINS & TEMPORARY SITES:
Since the user's website is a subdomain or hosted on a temporary platform (${domainPlatform}), ranking in Google has specific quirks:
1. Shared Authority: Search engines index them, but they inherit root domain limitations. If other subdomains on the same root are spammy, it can trigger filter flags.
2. Crawling and Sandboxing: Googlebot crawls free subdomains less frequently. Indexing is slower.
3. Ranking Strategies:
   - Target very long-tail, low-search-volume keywords (difficulty < 20) first.
   - Use the Google Search Console (GSC) URL Inspection API to manually submit pages for indexing, or configure IndexNow if supported.
   - Embed strong internal link networks.
   - Build high-quality external backlinks from high-authority sources (Web 2.0 profiles, medium, dev.to, social profiles, GitHub repositories) to prove legitimacy.
   - Leverage social signals (sharing on Reddit, X, LinkedIn) to drive referral traffic, which forces Google to crawl.
4. Temporary Pages: If this is a temporary launch page or preview site, focus on on-page SEO essentials (proper title, meta description, fast load speed, one H1 tag) and clear Call-to-Actions (CTA) to convert organic traffic quickly.`
    : ""
}

Current Site Audit Checklist Issues Found on Site (via Playwright Crawl):
${
  issueSummary.length > 0
    ? JSON.stringify(issueSummary.slice(0, 15))
    : "No critical technical audit issues detected yet. Suggest running a Site Audit crawl."
}

YOUR GUIDELINES:
1. If the user hasn't provided a site briefing yet, politely remind them that providing a full briefing (niche, target audience, business goals) in the "Site Briefing" section above will help you give highly personalized keyword and SEO suggestions.
2. Explain technical issues (like missing title tag, slow pages, missing alt tags) in simple terms and provide copy-pasteable solutions or code blocks.
3. Suggest keyword research strategies based on their briefing. Recommend tools, structures, and search-intent alignment.
4. Keep your responses structured, encouraging, and formatted in clean markdown. Do not hallucinate data; speak to the actual domain type and audit results.`;

    const endpoint = "https://openrouter.ai/api/v1/chat/completions";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Syntrix-Assistant"
      },
      body: JSON.stringify({
        model: "x-ai/grok-2",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7
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
    const reply = completions.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        { error: "OpenRouter AI returned an empty response." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[AI Assistant API] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
