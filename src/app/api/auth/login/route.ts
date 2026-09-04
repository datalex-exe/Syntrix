import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Try finding the user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Auto-create default admin account on first login attempt to make it plug-and-play
    if (!user && email.toLowerCase() === "admin@syntrix.com" && password === "password123") {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: "password123",
        },
      });
    }

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set("syntrix_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
