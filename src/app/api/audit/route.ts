import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQueueService } from "@/lib/queue";

// GET /api/audit - Fetch audit issue logs and metrics
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

    const issues = await prisma.auditIssue.findMany({
      where: { projectId },
      orderBy: { detectedAt: "desc" }
    });

    // Calculate dynamic health score
    let healthScore = 100;
    
    // We separate the Lighthouse performance score from checklist issue deductions
    const deductionIssues = issues.filter((i: any) => i.issueType !== "pagespeed-score");
    const pageSpeedIssue = issues.find((i: any) => i.issueType === "pagespeed-score");

    let pageSpeedScore = null;
    if (pageSpeedIssue) {
      const match = pageSpeedIssue.details.match(/Lighthouse Performance Score is (\d+)\/100/);
      if (match) {
        pageSpeedScore = parseInt(match[1]);
      }
    }

    deductionIssues.forEach((issue: any) => {
      if (issue.severity === "critical") healthScore -= 10;
      else if (issue.severity === "warning") healthScore -= 4;
      else if (issue.severity === "info") healthScore -= 1;
    });

    healthScore = Math.max(0, healthScore);

    // Get unique crawled page count
    const uniquePages = new Set(issues.map((i: any) => i.url));

    return NextResponse.json({
      issues,
      healthScore,
      pageSpeedScore,
      pageCount: uniquePages.size || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/audit - Trigger new background website audit crawl
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // Queue audit task
    const queue = getQueueService();
    await queue.addSiteAuditJob(projectId);

    return NextResponse.json({ success: true, message: "Site audit task has been queued." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
