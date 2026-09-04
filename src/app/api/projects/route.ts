import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/projects - List all projects for authenticated user
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { keywords: true, competitors: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, domain } = await request.json();

    if (!name || !domain) {
      return NextResponse.json({ error: "Name and domain are required" }, { status: 400 });
    }

    // Clean domain: strip protocol and trailing slash
    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    // Enforce project limit (5 projects max for free accounts)
    const projectCount = await prisma.project.count({
      where: { userId: user.id }
    });

    if (projectCount >= 5) {
      return NextResponse.json({ error: "Project limit reached. Free accounts are capped at 5 projects." }, { status: 403 });
    }

    // Prevent duplicate project domains for same user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: user.id,
        domain: cleanDomain
      }
    });

    if (existingProject) {
      return NextResponse.json({ error: "You already have a project for this domain." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        domain: cleanDomain
      }
    });

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects - Delete a project
export async function DELETE(request: Request) {
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

    await prisma.project.delete({
      where: { id: projectId }
    });

    return NextResponse.json({ success: true, message: "Project deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/projects - Update project settings (webhookUrl, gscConnected, briefing)
export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, webhookUrl, gscConnected, briefing } = await request.json();

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

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        webhookUrl: webhookUrl !== undefined ? webhookUrl.trim() || null : undefined,
        gscConnected: gscConnected !== undefined ? gscConnected : undefined,
        briefing: briefing !== undefined ? briefing.trim() || null : undefined
      }
    });

    return NextResponse.json({ project: updatedProject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
