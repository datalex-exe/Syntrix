import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Map SERP rank position to estimated CTR search visibility percentage
function positionToVisibility(pos: number): number {
  if (pos <= 0 || pos > 100) return 0;
  if (pos === 1) return 100;
  if (pos <= 3) return 85;
  if (pos <= 5) return 60;
  if (pos <= 10) return 40;
  if (pos <= 20) return 20;
  if (pos <= 100) return 5;
  return 0;
}

// GET /api/rank-history - Retrieve chart-ready timeline data for keyword rank trends
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
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // Get all tracked keywords under the project
    const keywords = await prisma.keyword.findMany({
      where: { projectId },
      select: { id: true, phrase: true }
    });

    const keywordIds = keywords.map((kw: any) => kw.id);

    // Fetch full rank history records
    const history = await prisma.rankHistory.findMany({
      where: {
        keywordId: { in: keywordIds }
      },
      orderBy: { checkedAt: "asc" }
    });

    // Group history data by date (YYYY-MM-DD)
    const dailyStats: Record<
      string,
      {
        date: string;
        visibilitySum: number;
        rankSum: number;
        rankCount: number;
        keywordCount: number;
        keywordRanks: Record<string, number>;
      }
    > = {};

    history.forEach((record: any) => {
      // Format as YYYY-MM-DD
      const dateStr = record.checkedAt.toISOString().split("T")[0];
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = {
          date: dateStr,
          visibilitySum: 0,
          rankSum: 0,
          rankCount: 0,
          keywordCount: 0,
          keywordRanks: {}
        };
      }

      const stats = dailyStats[dateStr];
      const visVal = positionToVisibility(record.position);

      stats.visibilitySum += visVal;
      stats.keywordCount += 1;
      stats.keywordRanks[record.keywordId] = record.position;

      // Unranked keywords (position 101+) don't pull down the average rank directly
      if (record.position > 0 && record.position <= 100) {
        stats.rankSum += record.position;
        stats.rankCount += 1;
      }
    });

    // Transform to sorted Recharts structure
    const chartData = Object.values(dailyStats)
      .map((day) => {
        const avgVisibility = day.keywordCount > 0 
          ? Number((day.visibilitySum / day.keywordCount).toFixed(1)) 
          : 0;
        
        const avgRank = day.rankCount > 0 
          ? Number((day.rankSum / day.rankCount).toFixed(1)) 
          : 101;

        const payload: any = {
          date: day.date,
          visibility: avgVisibility,
          averageRank: avgRank === 101 ? null : avgRank
        };

        // Append each keyword's rank for individual lines
        keywords.forEach((kw: any) => {
          const pos = day.keywordRanks[kw.id];
          payload[`kw_${kw.id}`] = pos !== undefined && pos <= 100 ? pos : null;
        });

        return payload;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ chartData, keywords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
