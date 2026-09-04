import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Clerk's route matching configuration
const isPublicRoute = createRouteMatcher(["/login(.*)", "/register(.*)", "/api/auth(.*)"]);

export default function proxy(request: NextRequest, event: any) {
  if (isClerkEnabled) {
    return clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })(request, event);
  }

  // Otherwise, handle local mock session cookies
  const path = request.nextUrl.pathname;
  const isPublicPath = path === "/login" || path === "/register" || path.startsWith("/_next") || path.startsWith("/api/auth");
  
  const token = request.cookies.get("syntrix_session")?.value;

  if (!token && !isPublicPath && path !== "/" && !path.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
