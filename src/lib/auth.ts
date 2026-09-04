import { cookies } from "next/headers";
import { prisma } from "./db";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (isClerkEnabled) {
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const session = await auth();
      if (!session || !session.userId) return null;
      
      const clerkUser = await currentUser();
      if (!clerkUser) return null;
      
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) return null;

      // Upsert user in PostgreSQL to synchronize
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: session.userId,
            email,
          },
        });
      }
      
      return {
        id: user.id,
        email: user.email,
      };
    } catch (e) {
      console.error("Error fetching Clerk user session:", e);
      return null;
    }
  }

  // Fallback: Local Mock session cookie check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("syntrix_session")?.value;
  if (!sessionToken) return null;

  // The session token is the user's UUID in database
  const user = await prisma.user.findUnique({
    where: { id: sessionToken },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
  };
}
