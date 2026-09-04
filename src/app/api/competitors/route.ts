import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/competitors - Retrieve tracked competitors for a project
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

    const competitors = await prisma.competitor.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ competitors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/competitors - Add a competitor to track
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, domain } = await request.json();

    if (!projectId || !domain) {
      return NextResponse.json({ error: "projectId and domain are required" }, { status: 400 });
    }

    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // Enforce cap: Max 3 competitors per project
    const count = await prisma.competitor.count({
      where: { projectId }
    });

    if (count >= 3) {
      return NextResponse.json({ error: "Competitor limit reached. Maximum 3 competitors allowed per project." }, { status: 403 });
    }

    // Check duplicate
    let competitor = await prisma.competitor.findFirst({
      where: {
        projectId,
        domain: cleanDomain
      }
    });

    if (competitor) {
      return NextResponse.json({ error: "This competitor domain is already being tracked." }, { status: 400 });
    }

    competitor = await prisma.competitor.create({
      data: {
        projectId,
        domain: cleanDomain
      }
    });

    return NextResponse.json({ competitor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/competitors - Remove a competitor
export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { competitorId } = await request.json();

    if (!competitorId) {
      return NextResponse.json({ error: "competitorId is required" }, { status: 400 });
    }

    // Verify competitor ownership
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { project: true }
    });

    if (!competitor || competitor.project.userId !== user.id) {
      return NextResponse.json({ error: "Competitor not found or access denied" }, { status: 404 });
    }

    await prisma.competitor.delete({
      where: { id: competitorId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
