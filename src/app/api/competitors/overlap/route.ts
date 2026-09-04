import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSerpProvider } from "@/lib/seo/serp";

// GET /api/competitors/overlap - Retrieve side-by-side keyword overlap ranking comparison
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: {
        keywords: {
          include: {
            rankHistory: {
              orderBy: { checkedAt: "desc" },
              take: 1
            }
          }
        },
        competitors: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const serpProvider = getSerpProvider();

    // Map out rankings comparisons
    const overlapData = await Promise.all(
      project.keywords.map(async (kw: any) => {
        const userPos = kw.rankHistory?.[0]?.position ?? 101;

        // Fetch competitor positions
        const competitorRanks: Record<string, number> = {};
        await Promise.all(
          project.competitors.map(async (comp: any) => {
            try {
              const pos = await serpProvider.checkPosition(kw.phrase, comp.domain, kw.targetCountry);
              competitorRanks[comp.id] = pos;
            } catch (e) {
              competitorRanks[comp.id] = 101;
            }
          })
        );

        return {
          keywordId: kw.id,
          phrase: kw.phrase,
          country: kw.targetCountry,
          userRank: userPos,
          competitorRanks
        };
      })
    );

    return NextResponse.json({
      competitors: project.competitors,
      overlapData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
