import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQueueService } from "@/lib/queue";

// POST /api/keywords/check - Trigger manual ranking update
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { keywordId, projectId } = await request.json();
    const queue = getQueueService();

    // Option A: Check single keyword
    if (keywordId) {
      const keyword = await prisma.keyword.findUnique({
        where: { id: keywordId },
        include: { project: true }
      });

      if (!keyword || keyword.project.userId !== user.id) {
        return NextResponse.json({ error: "Keyword not found or access denied" }, { status: 404 });
      }

      await queue.addRankCheckJob(keyword.id);
      return NextResponse.json({ success: true, message: "Keyword rank check queued." });
    }

    // Option B: Refresh all keywords in a project
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id }
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
      }

      const keywords = await prisma.keyword.findMany({
        where: { projectId }
      });

      // Queue rank checks sequentially
      for (const kw of keywords) {
        await queue.addRankCheckJob(kw.id);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Rank checks queued for all ${keywords.length} keywords in this project.` 
      });
    }

    return NextResponse.json({ error: "keywordId or projectId is required" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
