import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQueueService } from "@/lib/queue";

// GET /api/keywords - List all keywords tracked in a project
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

    const keywords = await prisma.keyword.findMany({
      where: { projectId },
      include: {
        rankHistory: {
          orderBy: { checkedAt: "desc" },
          take: 30 // Get last 30 data points for local charts/trends
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ keywords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/keywords - Add a keyword to track for a project
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, phrase, targetCountry = "US" } = await request.json();

    if (!projectId || !phrase) {
      return NextResponse.json({ error: "projectId and phrase are required" }, { status: 400 });
    }

    const cleanPhrase = phrase.trim().toLowerCase();

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // Enforce keyword limit: Max 20 keywords per project
    const keywordCount = await prisma.keyword.count({
      where: { projectId }
    });

    if (keywordCount >= 20) {
      return NextResponse.json({ error: "Keyword tracking limit reached. Free accounts are capped at 20 keywords per project." }, { status: 403 });
    }

    // Check duplicate
    let keyword = await prisma.keyword.findFirst({
      where: {
        projectId,
        phrase: cleanPhrase,
        targetCountry: targetCountry.toUpperCase()
      }
    });

    if (keyword) {
      return NextResponse.json({ error: "This keyword is already being tracked for this project." }, { status: 400 });
    }

    keyword = await prisma.keyword.create({
      data: {
        projectId,
        phrase: cleanPhrase,
        targetCountry: targetCountry.toUpperCase()
      }
    });

    // Queue rank check immediately
    const queue = getQueueService();
    await queue.addRankCheckJob(keyword.id);

    return NextResponse.json({ keyword });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/keywords - Remove a keyword from tracking
export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { keywordId } = await request.json();

    if (!keywordId) {
      return NextResponse.json({ error: "keywordId is required" }, { status: 400 });
    }

    // Verify keyword ownership via project
    const keyword = await prisma.keyword.findUnique({
      where: { id: keywordId },
      include: { project: true }
    });

    if (!keyword || keyword.project.userId !== user.id) {
      return NextResponse.json({ error: "Keyword not found or access denied" }, { status: 404 });
    }

    await prisma.keyword.delete({
      where: { id: keywordId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

